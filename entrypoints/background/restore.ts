import { countTabs, withoutBlankPages } from '@/lib/tabs';
import type { RestoreRequest, RestoreResult, TabEntry, TabRecord, WindowPlan } from '@/lib/types';
import { missingTabs } from './open-tabs';
import { getSettings } from './settings';

const COMMIT_TIMEOUT_MS = 15_000;

interface Destination {
  windowId: number;
  placeholderTabId?: number;
}

export async function restoreTabs({ windows, target, skipAlreadyOpen }: RestoreRequest): Promise<RestoreResult> {
  const wanted = withoutBlankPages(windows);
  const plans = skipAlreadyOpen ? await missingTabs(wanted) : wanted;
  const { lazyRestoreThreshold } = await getSettings();
  const lazy = countTabs(plans) > lazyRestoreThreshold;
  const result: RestoreResult = { opened: 0, skipped: countTabs(wanted) - countTabs(plans), failed: [] };

  for (const plan of plans) {
    const { opened, failed } = await restoreWindow(plan, target, lazy);
    result.opened += opened;
    result.failed.push(...failed);
  }
  return result;
}

export async function searchForTab({ url, incognito }: TabEntry) {
  const destination = await findWindow(incognito);
  const tabId = destination.placeholderTabId ?? (await browser.tabs.create({ windowId: destination.windowId })).id;
  await browser.search.query({ text: url, tabId });
  await browser.windows.update(destination.windowId, { focused: true });
}

async function restoreWindow({ incognito, tabs }: WindowPlan, target: RestoreRequest['target'], lazy: boolean) {
  const destination = target === 'new-window' ? await createWindow(incognito) : await findWindow(incognito);
  const failed: TabEntry[] = [];
  let opened = 0;

  for (const tab of tabs) {
    if (await openTab(destination.windowId, tab, { active: opened === 0, lazy })) opened++;
    else failed.push({ ...tab, incognito });
  }

  if (destination.placeholderTabId !== undefined) {
    if (opened > 0) await browser.tabs.remove(destination.placeholderTabId);
    else await browser.windows.remove(destination.windowId);
  }
  if (opened > 0) await browser.windows.update(destination.windowId, { focused: true });
  return { opened, failed };
}

async function openTab(windowId: number, tab: TabRecord, { active, lazy }: { active: boolean; lazy: boolean }) {
  const properties = { windowId, url: tab.url, pinned: tab.pinned, active };
  const unloaded = lazy && !active;

  try {
    if (unloaded && import.meta.env.BROWSER === 'firefox') {
      const discarded = { ...properties, discarded: true, title: tab.title };
      await browser.tabs.create(discarded).catch(() => browser.tabs.create(properties));
    } else {
      const created = await browser.tabs.create(properties);
      if (unloaded && created.id !== undefined) void discardOnceCommitted(created.id);
    }
    return true;
  } catch {
    return false;
  }
}

// Chrome can't create a tab discarded, and discarding one before its URL commits leaves a blank tab.
async function discardOnceCommitted(tabId: number) {
  if (await waitForCommit(tabId)) await browser.tabs.discard(tabId).catch(() => undefined);
}

function waitForCommit(tabId: number) {
  return new Promise<boolean>((resolve) => {
    const finish = (committed: boolean) => {
      clearTimeout(timer);
      browser.tabs.onUpdated.removeListener(onUpdated);
      resolve(committed);
    };
    const onUpdated = (id: number, _change: unknown, tab: Browser.tabs.Tab) => {
      if (id === tabId && tab.url && tab.url !== 'about:blank' && !tab.pendingUrl) finish(true);
    };
    const timer = setTimeout(() => finish(false), COMMIT_TIMEOUT_MS);
    browser.tabs.onUpdated.addListener(onUpdated);
  });
}

async function createWindow(incognito: boolean): Promise<Destination> {
  const win = await browser.windows.create({ incognito, focused: true });
  if (win?.id === undefined) throw new Error('Could not open a new window');
  return { windowId: win.id, placeholderTabId: win.tabs?.[0]?.id };
}

async function findWindow(incognito: boolean): Promise<Destination> {
  const [lastFocused, windows] = await Promise.all([
    browser.windows.getLastFocused({ windowTypes: ['normal'] }).catch(() => undefined),
    browser.windows.getAll({ windowTypes: ['normal'] }),
  ]);
  const match = [lastFocused, ...windows].find((win) => win?.incognito === incognito);
  return match?.id === undefined ? createWindow(incognito) : { windowId: match.id };
}

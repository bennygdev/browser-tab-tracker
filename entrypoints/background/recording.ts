import { RECORDING_PAUSED_KEY } from '@/lib/recording';
import { isBlankPage, tabKey } from '@/lib/tabs';
import { db } from './db';
import { toTabRecord } from './records';

const HIDDEN_KEY = 'hiddenTabs';
const HIDDEN_CARRY_KEY = 'hiddenTabsOpen';

type HiddenTabs = Record<number, string>;

let pendingChange: Promise<unknown> = Promise.resolve();

export async function isPaused() {
  const { [RECORDING_PAUSED_KEY]: paused } = await browser.storage.local.get(RECORDING_PAUSED_KEY);
  return paused === true;
}

export function savePaused(paused: boolean) {
  return browser.storage.local.set({ [RECORDING_PAUSED_KEY]: paused });
}

export async function hideUnrecordedTabs() {
  const unrecorded = await findUnrecordedTabs();
  await changeHidden(() => unrecorded);
}

export async function hiddenTabIds(openTabIds: number[]) {
  const open = new Set(openTabIds);
  await changeHidden((hidden) => {
    const kept = Object.fromEntries(Object.entries(hidden).filter(([id]) => open.has(Number(id))));
    return Object.keys(kept).length < Object.keys(hidden).length ? kept : undefined;
  });
  return new Set(Object.keys(await loadHidden()).map(Number));
}

export async function isHidden(tabId: number) {
  return tabId in (await loadHidden());
}

export function inheritHidden(tab: Browser.tabs.Tab) {
  const { url } = toTabRecord(tab);
  return changeHidden((hidden) => {
    const host = tab.openerTabId === undefined ? undefined : hidden[tab.openerTabId];
    if (tab.id === undefined || tab.id in hidden || host === undefined || leftSite(url, host)) return undefined;
    return { ...hidden, [tab.id]: host };
  });
}

export function revealIfLeftSite(tab: Browser.tabs.Tab) {
  const { url } = toTabRecord(tab);
  return changeHidden((hidden) => {
    const host = tab.id === undefined ? undefined : hidden[tab.id];
    if (tab.id === undefined || host === undefined || !leftSite(url, host)) return undefined;
    return without(hidden, tab.id);
  });
}

export function forgetHiddenTab(tabId: number) {
  return changeHidden((hidden) => (tabId in hidden ? without(hidden, tabId) : undefined));
}

function changeHidden(change: (hidden: HiddenTabs) => HiddenTabs | undefined) {
  const next = pendingChange.then(async () => {
    const updated = change(await loadHidden());
    if (updated) await saveHidden(updated);
  });
  pendingChange = next.catch(() => undefined);
  return next;
}

async function loadHidden(): Promise<HiddenTabs> {
  const { [HIDDEN_KEY]: hidden } = await browser.storage.session.get(HIDDEN_KEY);
  if (hidden) return hidden as HiddenTabs;

  const { [HIDDEN_CARRY_KEY]: carried } = await browser.storage.local.get(HIDDEN_CARRY_KEY);
  const restored = carried ? await findUnrecordedTabs() : {};
  await saveHidden(restored);
  return restored;
}

async function findUnrecordedTabs() {
  const [windows, latest] = await Promise.all([
    browser.windows.getAll({ populate: true, windowTypes: ['normal'] }),
    db.snapshots.orderBy('[createdAt+id]').last(),
  ]);
  const recorded = new Set(latest?.windows.flatMap((win) => win.tabs.map((tab) => tabKey(tab.url, win.incognito))));
  const unrecorded: HiddenTabs = {};
  for (const tab of windows.flatMap((win) => win.tabs ?? [])) {
    const { url } = toTabRecord(tab);
    if (tab.id !== undefined && !recorded.has(tabKey(url, tab.incognito))) unrecorded[tab.id] = hostOf(url);
  }
  return unrecorded;
}

async function saveHidden(hidden: HiddenTabs) {
  await browser.storage.session.set({ [HIDDEN_KEY]: hidden });
  await browser.storage.local.set({ [HIDDEN_CARRY_KEY]: Object.keys(hidden).length > 0 });
}

function without(hidden: HiddenTabs, tabId: number) {
  const { [tabId]: _, ...rest } = hidden;
  return rest;
}

function leftSite(url: string, host: string) {
  return !isBlankPage(url) && hostOf(url) !== host;
}

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

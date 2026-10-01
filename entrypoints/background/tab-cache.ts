import type { TabEntry } from '@/lib/types';
import { toTabRecord } from './records';

const KEY_PREFIX = 'tab:';

export async function rememberTab(tab: Browser.tabs.Tab) {
  if (tab.id === undefined) return;
  await browser.storage.session.set({ [cacheKey(tab.id)]: toTabEntry(tab) });
}

export async function forgetTab(tabId: number): Promise<TabEntry | undefined> {
  const key = cacheKey(tabId);
  const { [key]: tab } = await browser.storage.session.get(key);
  await browser.storage.session.remove(key);
  return tab as TabEntry | undefined;
}

export async function resetTabCache(tabs: Browser.tabs.Tab[]) {
  const live = Object.fromEntries(
    tabs.flatMap((tab) => (tab.id === undefined ? [] : [[cacheKey(tab.id), toTabEntry(tab)]])),
  );
  const stored = await browser.storage.session.get(null);
  const stale = Object.keys(stored).filter((key) => key.startsWith(KEY_PREFIX) && !(key in live));

  await browser.storage.session.remove(stale);
  await browser.storage.session.set(live);
}

function cacheKey(tabId: number) {
  return `${KEY_PREFIX}${tabId}`;
}

function toTabEntry(tab: Browser.tabs.Tab): TabEntry {
  return { ...toTabRecord(tab), incognito: tab.incognito };
}

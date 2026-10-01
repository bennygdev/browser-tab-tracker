import type { TabRecord } from '@/lib/types';
import { toTabRecord } from './records';

export interface CachedTab extends TabRecord {
  incognito: boolean;
}

const KEY_PREFIX = 'tab:';

export async function rememberTab(tab: Browser.tabs.Tab) {
  if (tab.id === undefined) return;
  await browser.storage.session.set({ [cacheKey(tab.id)]: toCachedTab(tab) });
}

export async function forgetTab(tabId: number): Promise<CachedTab | undefined> {
  const key = cacheKey(tabId);
  const { [key]: tab } = await browser.storage.session.get(key);
  await browser.storage.session.remove(key);
  return tab as CachedTab | undefined;
}

export async function resetTabCache(tabs: Browser.tabs.Tab[]) {
  const live = Object.fromEntries(
    tabs.flatMap((tab) => (tab.id === undefined ? [] : [[cacheKey(tab.id), toCachedTab(tab)]])),
  );
  const stored = await browser.storage.session.get(null);
  const stale = Object.keys(stored).filter((key) => key.startsWith(KEY_PREFIX) && !(key in live));

  await browser.storage.session.remove(stale);
  await browser.storage.session.set(live);
}

function cacheKey(tabId: number) {
  return `${KEY_PREFIX}${tabId}`;
}

function toCachedTab(tab: Browser.tabs.Tab): CachedTab {
  return { ...toTabRecord(tab), incognito: tab.incognito };
}

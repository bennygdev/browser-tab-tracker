import { tabKey } from '@/lib/tabs';
import type { WindowPlan } from '@/lib/types';
import { toTabRecord } from './records';

export async function openTabKeys() {
  const windows = await browser.windows.getAll({ populate: true, windowTypes: ['normal'] });
  return new Set(
    windows.flatMap((win) => (win.tabs ?? []).map((tab) => tabKey(toTabRecord(tab).url, win.incognito))),
  );
}

export async function missingTabs(windows: WindowPlan[]): Promise<WindowPlan[]> {
  const open = await openTabKeys();
  return windows
    .map(({ incognito, tabs }) => ({ incognito, tabs: tabs.filter((tab) => !open.has(tabKey(tab.url, incognito))) }))
    .filter((win) => win.tabs.length > 0);
}

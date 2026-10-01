import type { TabRecord, WindowRecord } from '@/lib/types';

export function toTabRecord(tab: Browser.tabs.Tab): TabRecord {
  return {
    url: tab.url || tab.pendingUrl || '',
    title: tab.title ?? '',
    pinned: tab.pinned,
  };
}

export function toWindowRecord(win: Browser.windows.Window): WindowRecord {
  const tabs = (win.tabs ?? []).toSorted((a, b) => a.index - b.index);
  return {
    id: win.id ?? browser.windows.WINDOW_ID_NONE,
    incognito: win.incognito,
    tabs: tabs.map(toTabRecord),
  };
}

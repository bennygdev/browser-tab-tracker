import { vi } from 'vitest';

type FakeTabInit = string | (Partial<Browser.tabs.Tab> & { url: string });

interface FakeWindow {
  id: number;
  incognito?: boolean;
  tabs: FakeTabInit[];
}

export function fakeTab(id: number, url: string, overrides: Partial<Browser.tabs.Tab> = {}) {
  return {
    id,
    url,
    title: `Title of ${url}`,
    pinned: false,
    incognito: false,
    index: 0,
    ...overrides,
  } as Browser.tabs.Tab;
}

export function setOpenWindows(windows: FakeWindow[]) {
  vi.spyOn(browser.windows, 'getAll').mockImplementation(async () =>
    windows.map(({ id, incognito = false, tabs }) => ({
      id,
      incognito,
      tabs: tabs.map((init, index) => {
        const tab = typeof init === 'string' ? { url: init } : init;
        return fakeTab(id * 100 + index, tab.url, { index, incognito, ...tab });
      }),
    })) as Browser.windows.Window[],
  );
}

export function restartBrowser() {
  return browser.storage.session.clear();
}

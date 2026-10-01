import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { restoreTabs } from '@/entrypoints/background/restore';
import type { TabRecord, WindowPlan } from '@/lib/types';
import { fakeTab, setOpenWindows } from './helpers';

const NEW_WINDOW_ID = 50;
const PLACEHOLDER_TAB_ID = 99;
const BLOCKED_URL = 'about:config';

function tabsOf(...urls: string[]): TabRecord[] {
  return urls.map((url) => ({ url, title: `Title of ${url}`, pinned: false }));
}

function planOf(urls: string[], incognito = false): WindowPlan {
  return { incognito, tabs: tabsOf(...urls) };
}

let createdTabs: Browser.tabs.CreateProperties[];

beforeEach(() => {
  createdTabs = [];
  let nextTabId = 200;
  setOpenWindows([{ id: 1, tabs: ['https://open.example'] }]);
  vi.spyOn(browser.windows, 'create').mockImplementation(
    async (properties) =>
      ({ id: NEW_WINDOW_ID, incognito: properties?.incognito ?? false, tabs: [{ id: PLACEHOLDER_TAB_ID }] }) as Browser.windows.Window,
  );
  vi.spyOn(browser.tabs, 'create').mockImplementation(async (properties) => {
    if (properties.url === BLOCKED_URL) throw new Error('Illegal URL');
    createdTabs.push(properties);
    return fakeTab(nextTabId++, properties.url ?? '');
  });
  vi.spyOn(browser.tabs, 'remove').mockResolvedValue();
  vi.spyOn(browser.tabs, 'discard').mockResolvedValue(undefined);
  vi.spyOn(browser.windows, 'remove').mockResolvedValue();
  vi.spyOn(browser.windows, 'update').mockImplementation(async () => ({}) as Browser.windows.Window);
});

describe('restoreTabs', () => {
  it('recreates a window in its original mode with tabs in order and the first one active', async () => {
    const result = await restoreTabs({
      windows: [planOf(['https://a.example', 'https://b.example'], true)],
      target: 'new-window',
      skipAlreadyOpen: false,
    });

    expect(browser.windows.create).toHaveBeenCalledWith({ incognito: true, focused: true });
    expect(createdTabs).toMatchObject([
      { windowId: NEW_WINDOW_ID, url: 'https://a.example', active: true },
      { windowId: NEW_WINDOW_ID, url: 'https://b.example', active: false },
    ]);
    expect(browser.tabs.remove).toHaveBeenCalledWith(PLACEHOLDER_TAB_ID);
    expect(result).toEqual({ opened: 2, skipped: 0, failed: [] });
  });

  it('skips tabs already open in the same mode', async () => {
    const result = await restoreTabs({
      windows: [planOf(['https://open.example', 'https://b.example']), planOf(['https://open.example'], true)],
      target: 'new-window',
      skipAlreadyOpen: true,
    });

    expect(createdTabs.map((tab) => tab.url)).toEqual(['https://b.example', 'https://open.example']);
    expect(result.skipped).toBe(1);
  });

  it('leaves out blank pages', async () => {
    await restoreTabs({
      windows: [planOf(['chrome://newtab/', 'https://a.example'])],
      target: 'new-window',
      skipAlreadyOpen: false,
    });

    expect(createdTabs.map((tab) => tab.url)).toEqual(['https://a.example']);
  });

  it('reports pages that cannot be opened and closes a new window that stayed empty', async () => {
    const result = await restoreTabs({
      windows: [planOf([BLOCKED_URL], true)],
      target: 'new-window',
      skipAlreadyOpen: false,
    });

    expect(result.failed).toEqual([{ ...tabsOf(BLOCKED_URL)[0], incognito: true }]);
    expect(browser.windows.remove).toHaveBeenCalledWith(NEW_WINDOW_ID);
  });

  it('adds tabs to an existing window of the same mode', async () => {
    await restoreTabs({
      windows: [planOf(['https://a.example'])],
      target: 'existing-window',
      skipAlreadyOpen: false,
    });

    expect(browser.windows.create).not.toHaveBeenCalled();
    expect(createdTabs).toMatchObject([{ windowId: 1, url: 'https://a.example' }]);
  });

  it('unloads background tabs once they start loading when restoring more than 10', async () => {
    const urls = Array.from({ length: 12 }, (_, i) => `https://site${i}.example`);
    await restoreTabs({ windows: [planOf(urls)], target: 'new-window', skipAlreadyOpen: false });

    for (let id = 200; id < 212; id++) {
      await fakeBrowser.tabs.onUpdated.trigger(id, { status: 'loading' }, fakeTab(id, `https://site${id - 200}.example`));
    }

    await vi.waitFor(() => expect(browser.tabs.discard).toHaveBeenCalledTimes(11));
    expect(browser.tabs.discard).not.toHaveBeenCalledWith(200);
  });

  it('creates background tabs unloaded on Firefox when restoring more than 10', async () => {
    vi.stubEnv('BROWSER', 'firefox');
    const urls = Array.from({ length: 12 }, (_, i) => `https://site${i}.example`);

    await restoreTabs({ windows: [planOf(urls)], target: 'new-window', skipAlreadyOpen: false });

    expect(createdTabs[0]).not.toHaveProperty('discarded');
    expect(createdTabs[1]).toMatchObject({ discarded: true, title: 'Title of https://site1.example' });
    expect(browser.tabs.discard).not.toHaveBeenCalled();
  });

  it('keeps every tab loaded for small restores', async () => {
    await restoreTabs({
      windows: [planOf(['https://a.example', 'https://b.example'])],
      target: 'new-window',
      skipAlreadyOpen: false,
    });
    await fakeBrowser.tabs.onUpdated.trigger(201, { status: 'loading' }, fakeTab(201, 'https://b.example'));

    expect(browser.tabs.discard).not.toHaveBeenCalled();
  });
});

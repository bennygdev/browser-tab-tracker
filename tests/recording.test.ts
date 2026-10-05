import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { db } from '@/entrypoints/background/db';
import { setRecordingPaused } from '@/entrypoints/background/pause';
import { takeSnapshot } from '@/entrypoints/background/snapshots';
import { startTracking } from '@/entrypoints/background/tracker';
import { fakeTab, restartBrowser, setOpenWindows } from './helpers';

vi.mock('@/entrypoints/background/indicator', () => ({ showRecordingState: vi.fn(async () => {}) }));

const PRIVATE_TAB_ID = 101;

async function latestUrls() {
  const latest = await db.snapshots.orderBy('[createdAt+id]').last();
  return latest?.windows.flatMap((win) => win.tabs.map((tab) => tab.url)) ?? [];
}

async function browsePrivatelyThenResume() {
  setOpenWindows([{ id: 1, tabs: ['https://a.example'] }]);
  await setRecordingPaused(true);
  setOpenWindows([{ id: 1, tabs: ['https://a.example', 'https://private.example/page'] }]);
  await setRecordingPaused(false);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  for (const event of ['onMoved', 'onAttached', 'onDetached', 'onReplaced'] as const) {
    vi.spyOn(fakeBrowser.tabs[event], 'addListener').mockImplementation(() => {});
  }
  startTracking();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('pausing', () => {
  it('saves the open tabs, then nothing until resumed, even after a restart', async () => {
    setOpenWindows([{ id: 1, tabs: ['https://a.example'] }]);
    await setRecordingPaused(true);
    setOpenWindows([{ id: 1, tabs: ['https://a.example', 'https://private.example'] }]);

    await takeSnapshot();
    await restartBrowser();
    await takeSnapshot();

    expect(await db.snapshots.count()).toBe(1);
  });

  it('logs no closed tabs while paused', async () => {
    setOpenWindows([{ id: 1, tabs: [{ id: 7, url: 'https://a.example' }] }]);
    await setRecordingPaused(true);

    await fakeBrowser.tabs.onRemoved.trigger(7, { windowId: 1, isWindowClosing: false });

    expect(await db.closedTabs.count()).toBe(0);
  });
});

describe('resuming', () => {
  it('leaves out tabs opened while paused', async () => {
    await browsePrivatelyThenResume();

    expect(await latestUrls()).toEqual(['https://a.example']);
  });

  it('keeps a hidden tab out while it stays on the same site', async () => {
    await browsePrivatelyThenResume();
    const next = 'https://private.example/other';
    await fakeBrowser.tabs.onUpdated.trigger(PRIVATE_TAB_ID, { url: next }, fakeTab(PRIVATE_TAB_ID, next));
    setOpenWindows([{ id: 1, tabs: ['https://a.example', next] }]);

    await takeSnapshot();

    expect(await latestUrls()).toEqual(['https://a.example']);
  });

  it('records a hidden tab once it goes to another site', async () => {
    await browsePrivatelyThenResume();
    const next = 'https://public.example';
    await fakeBrowser.tabs.onUpdated.trigger(PRIVATE_TAB_ID, { url: next }, fakeTab(PRIVATE_TAB_ID, next));
    setOpenWindows([{ id: 1, tabs: ['https://a.example', next] }]);

    await takeSnapshot();

    expect(await latestUrls()).toEqual(['https://a.example', next]);
  });

  it('keeps links opened from a hidden tab on the same site out', async () => {
    await browsePrivatelyThenResume();
    const link = 'https://private.example/linked';
    await fakeBrowser.tabs.onCreated.trigger(fakeTab(102, link, { openerTabId: PRIVATE_TAB_ID }));
    setOpenWindows([{ id: 1, tabs: ['https://a.example', 'https://private.example/page', link] }]);

    await takeSnapshot();

    expect(await latestUrls()).toEqual(['https://a.example']);
  });

  it('keeps a tab out when its opener is only known once it navigates', async () => {
    await browsePrivatelyThenResume();
    const link = 'https://private.example/linked';
    await fakeBrowser.tabs.onCreated.trigger(fakeTab(102, ''));
    await fakeBrowser.tabs.onUpdated.trigger(102, { url: link }, fakeTab(102, link, { openerTabId: PRIVATE_TAB_ID }));
    setOpenWindows([{ id: 1, tabs: ['https://a.example', 'https://private.example/page', link] }]);

    await takeSnapshot();

    expect(await latestUrls()).toEqual(['https://a.example']);
  });

  it('does not log a hidden tab when it is closed', async () => {
    await browsePrivatelyThenResume();
    const tab = fakeTab(PRIVATE_TAB_ID, 'https://private.example/page', { title: 'Private page' });

    await fakeBrowser.tabs.onUpdated.trigger(PRIVATE_TAB_ID, { title: 'Private page' }, tab);
    await fakeBrowser.tabs.onRemoved.trigger(PRIVATE_TAB_ID, { windowId: 1, isWindowClosing: false });

    expect(await db.closedTabs.count()).toBe(0);
  });

  it('keeps hidden tabs out after the browser restarts', async () => {
    await browsePrivatelyThenResume();

    await restartBrowser();
    setOpenWindows([{ id: 2, tabs: ['https://a.example', 'https://private.example/page'] }]);
    await takeSnapshot();

    expect(await latestUrls()).toEqual(['https://a.example']);
  });

  it('does not report a window as closed when all its tabs are hidden', async () => {
    setOpenWindows([
      { id: 1, tabs: ['https://a.example'] },
      { id: 2, tabs: ['https://b.example'] },
    ]);
    await setRecordingPaused(true);
    setOpenWindows([
      { id: 1, tabs: ['https://a.example'] },
      { id: 2, tabs: ['https://private.example'] },
    ]);

    await setRecordingPaused(false);

    expect(await db.closedWindows.count()).toBe(0);
    expect(await latestUrls()).toEqual(['https://a.example']);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { db } from '@/entrypoints/background/db';
import { startTracking } from '@/entrypoints/background/tracker';
import { fakeTab } from './helpers';

describe('tracker', () => {
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

  it('logs a tab that was closed on its own', async () => {
    await fakeBrowser.tabs.onCreated.trigger(fakeTab(7, 'https://a.example'));
    await fakeBrowser.tabs.onRemoved.trigger(7, { windowId: 1, isWindowClosing: false });

    expect(await db.closedTabs.toArray()).toMatchObject([{ url: 'https://a.example' }]);
  });

  it('logs the latest URL of a tab that navigated before closing', async () => {
    await fakeBrowser.tabs.onCreated.trigger(fakeTab(7, 'https://a.example'));
    await fakeBrowser.tabs.onUpdated.trigger(
      7,
      { url: 'https://b.example' },
      fakeTab(7, 'https://b.example'),
    );
    await fakeBrowser.tabs.onRemoved.trigger(7, { windowId: 1, isWindowClosing: false });

    expect(await db.closedTabs.toArray()).toMatchObject([{ url: 'https://b.example' }]);
  });

  it('leaves tabs closed together with their window to the snapshots', async () => {
    await fakeBrowser.tabs.onCreated.trigger(fakeTab(7, 'https://a.example'));
    await fakeBrowser.tabs.onRemoved.trigger(7, { windowId: 1, isWindowClosing: true });

    expect(await db.closedTabs.count()).toBe(0);
  });
});

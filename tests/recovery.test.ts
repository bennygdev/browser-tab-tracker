import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dismissLostSession, findLostSession, notifyLostSession } from '@/entrypoints/background/recovery';
import { saveSettings } from '@/entrypoints/background/settings';
import { takeSnapshot } from '@/entrypoints/background/snapshots';
import { restartBrowser, setOpenWindows } from './helpers';

async function crashWith(windows: Parameters<typeof setOpenWindows>[0]) {
  setOpenWindows(windows);
  await takeSnapshot();
  await restartBrowser();
}

describe('findLostSession', () => {
  it('returns the tabs from the last session that are not open now', async () => {
    await crashWith([
      { id: 1, tabs: ['https://a.example', 'https://b.example', 'chrome://newtab/'] },
      { id: 2, incognito: true, tabs: ['https://private.example'] },
    ]);
    setOpenWindows([{ id: 7, tabs: ['https://a.example'] }]);

    const lost = await findLostSession();

    expect(lost?.windows).toEqual([
      { incognito: false, tabs: [{ url: 'https://b.example', title: 'Title of https://b.example', pinned: false }] },
      {
        incognito: true,
        tabs: [{ url: 'https://private.example', title: 'Title of https://private.example', pinned: false }],
      },
    ]);
  });

  it('returns nothing once every tab is open again', async () => {
    await crashWith([{ id: 1, tabs: ['https://a.example'] }]);
    setOpenWindows([{ id: 7, tabs: ['https://a.example'] }]);

    expect(await findLostSession()).toBeNull();
  });

  it('returns nothing after the user dismisses it', async () => {
    await crashWith([{ id: 2, incognito: true, tabs: ['https://private.example'] }]);
    setOpenWindows([{ id: 7, tabs: ['https://a.example'] }]);

    const lost = await findLostSession();
    await dismissLostSession(lost?.snapshotId ?? -1);

    expect(await findLostSession()).toBeNull();
  });

  it('returns nothing on a first run', async () => {
    setOpenWindows([{ id: 1, tabs: ['https://a.example'] }]);

    expect(await findLostSession()).toBeNull();
  });
});

describe('notifyLostSession', () => {
  beforeEach(() => {
    vi.spyOn(browser.notifications, 'create').mockImplementation(async () => '');
  });

  const lostNormalTabs = () => crashWith([{ id: 1, tabs: ['https://a.example'] }]);
  const lostPrivateTabs = () => crashWith([{ id: 2, incognito: true, tabs: ['https://private.example'] }]);

  it('offers to restore by default', async () => {
    await lostNormalTabs();
    setOpenWindows([{ id: 7, tabs: [] }]);

    await notifyLostSession();

    expect(browser.notifications.create).toHaveBeenCalledOnce();
  });

  it('stays quiet when turned off', async () => {
    await saveSettings({ restoreNotification: 'off' });
    await lostPrivateTabs();
    setOpenWindows([{ id: 7, tabs: [] }]);

    await notifyLostSession();

    expect(browser.notifications.create).not.toHaveBeenCalled();
  });

  it('only asks about private tabs when set to private', async () => {
    await saveSettings({ restoreNotification: 'private' });
    await lostNormalTabs();
    setOpenWindows([{ id: 7, tabs: [] }]);

    await notifyLostSession();
    expect(browser.notifications.create).not.toHaveBeenCalled();

    await lostPrivateTabs();
    setOpenWindows([{ id: 7, tabs: [] }]);

    await notifyLostSession();
    expect(browser.notifications.create).toHaveBeenCalledOnce();
  });
});

import { describe, expect, it } from 'vitest';
import { dismissLostSession, findLostSession } from '@/entrypoints/background/recovery';
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

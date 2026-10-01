import { describe, expect, it } from 'vitest';
import { db } from '@/entrypoints/background/db';
import { takeSnapshot } from '@/entrypoints/background/snapshots';
import { restartBrowser, setOpenWindows } from './helpers';

describe('takeSnapshot', () => {
  it('stores normal and private windows with their tabs in order', async () => {
    setOpenWindows([
      { id: 2, incognito: true, tabs: ['https://private.example'] },
      { id: 1, tabs: ['https://a.example', 'https://b.example'] },
    ]);

    await takeSnapshot();

    const snapshots = await db.snapshots.toArray();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.windows).toEqual([
      {
        id: 1,
        incognito: false,
        tabs: [
          { url: 'https://a.example', title: 'Title of https://a.example', pinned: false },
          { url: 'https://b.example', title: 'Title of https://b.example', pinned: false },
        ],
      },
      {
        id: 2,
        incognito: true,
        tabs: [{ url: 'https://private.example', title: 'Title of https://private.example', pinned: false }],
      },
    ]);
  });

  it('does not save when nothing changed', async () => {
    setOpenWindows([{ id: 1, tabs: ['https://a.example'] }]);

    await takeSnapshot();
    await takeSnapshot();

    expect(await db.snapshots.count()).toBe(1);
  });

  it('refreshes titles in place instead of saving a new snapshot', async () => {
    setOpenWindows([{ id: 1, tabs: [{ url: 'https://mail.example', title: 'Inbox' }] }]);
    await takeSnapshot();

    setOpenWindows([{ id: 1, tabs: [{ url: 'https://mail.example', title: '(3) Inbox' }] }]);
    await takeSnapshot();

    const snapshots = await db.snapshots.toArray();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.windows[0]?.tabs[0]?.title).toBe('(3) Inbox');
  });

  it('never saves an empty state', async () => {
    setOpenWindows([]);

    await takeSnapshot();

    expect(await db.snapshots.count()).toBe(0);
  });

  it('marks the snapshot before a window closed as a recovery point', async () => {
    setOpenWindows([
      { id: 1, tabs: ['https://a.example'] },
      { id: 2, incognito: true, tabs: ['https://private.example'] },
    ]);
    await takeSnapshot();

    setOpenWindows([{ id: 1, tabs: ['https://a.example'] }]);
    await takeSnapshot();

    const [before, after] = await db.snapshots.toArray();
    expect(before?.recovery).toBe('window-closed');
    expect(after?.recovery).toBeUndefined();
  });

  it('records closed windows with their tabs', async () => {
    setOpenWindows([
      { id: 1, tabs: ['https://a.example'] },
      { id: 2, incognito: true, tabs: ['https://private.example'] },
    ]);
    await takeSnapshot();

    setOpenWindows([{ id: 1, tabs: ['https://a.example'] }]);
    await takeSnapshot();

    const [before] = await db.snapshots.toArray();
    expect(await db.closedWindows.toArray()).toMatchObject([
      { snapshotId: before?.id, incognito: true, tabs: [{ url: 'https://private.example' }] },
    ]);
  });

  it('does not treat a window whose tabs were moved elsewhere as closed', async () => {
    setOpenWindows([
      { id: 1, tabs: ['https://a.example'] },
      { id: 2, tabs: ['https://b.example'] },
    ]);
    await takeSnapshot();

    setOpenWindows([{ id: 1, tabs: ['https://a.example', 'https://b.example'] }]);
    await takeSnapshot();

    const [before] = await db.snapshots.toArray();
    expect(await db.closedWindows.count()).toBe(0);
    expect(before?.recovery).toBeUndefined();
  });

  it('marks the snapshot before 5 or more tabs closed at once as a recovery point', async () => {
    const urls = Array.from({ length: 6 }, (_, i) => `https://site${i}.example`);
    setOpenWindows([{ id: 1, tabs: urls }]);
    await takeSnapshot();

    setOpenWindows([{ id: 1, tabs: urls.slice(0, 1) }]);
    await takeSnapshot();

    const [before] = await db.snapshots.toArray();
    expect(before?.recovery).toBe('tab-drop');
  });

  it('does not mark small changes as recovery points', async () => {
    setOpenWindows([{ id: 1, tabs: ['https://a.example', 'https://b.example'] }]);
    await takeSnapshot();

    setOpenWindows([{ id: 1, tabs: ['https://a.example'] }]);
    await takeSnapshot();

    const snapshots = await db.snapshots.toArray();
    expect(snapshots).toHaveLength(2);
    expect(snapshots.every((snapshot) => snapshot.recovery === undefined)).toBe(true);
  });

  it('keeps private tabs lost in a crash in the previous session', async () => {
    setOpenWindows([
      { id: 1, tabs: ['https://a.example'] },
      { id: 2, incognito: true, tabs: ['https://private.example'] },
    ]);
    await takeSnapshot();

    await restartBrowser();
    setOpenWindows([{ id: 5, tabs: ['https://a.example'] }]);
    await takeSnapshot();

    const [beforeCrash, afterRestart] = await db.snapshots.toArray();
    expect(beforeCrash?.recovery).toBe('session-end');
    expect(beforeCrash?.windows.some((win) => win.incognito)).toBe(true);
    expect(afterRestart?.sessionId).not.toBe(beforeCrash?.sessionId);
    expect(await db.sessions.count()).toBe(2);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/entrypoints/background/db';
import { currentSessionId } from '@/entrypoints/background/session';
import { takeSnapshot } from '@/entrypoints/background/snapshots';
import { restartBrowser, setOpenWindows } from './helpers';

const NORMAL = { id: 1, tabs: ['https://a.example'] };
const PRIVATE = { id: 2, incognito: true, tabs: ['https://private.example'] };

async function startNextSession() {
  await restartBrowser();
  await currentSessionId();
}

describe('currentSessionId', () => {
  it('reuses the session until the browser restarts', async () => {
    const first = await currentSessionId();
    expect(await currentSessionId()).toBe(first);

    await restartBrowser();

    expect(await currentSessionId()).not.toBe(first);
  });

  it('creates a single session when called concurrently', async () => {
    const ids = await Promise.all([currentSessionId(), currentSessionId(), currentSessionId()]);

    expect(new Set(ids).size).toBe(1);
    expect(await db.sessions.count()).toBe(1);
  });
});

describe('session end', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks the last snapshot of the previous session as its end', async () => {
    setOpenWindows([NORMAL]);
    await takeSnapshot();

    await startNextSession();

    const [session] = await db.sessions.toArray();
    const [snapshot] = await db.snapshots.toArray();
    expect(snapshot?.recovery).toBe('session-end');
    expect(session?.endSnapshotId).toBe(snapshot?.id);
  });

  it('uses the full state from before a shutdown that closed windows one by one', async () => {
    setOpenWindows([NORMAL, PRIVATE]);
    await takeSnapshot();
    setOpenWindows([NORMAL]);
    await takeSnapshot();

    await startNextSession();

    const [full, partial] = await db.snapshots.toArray();
    const [session] = await db.sessions.toArray();
    expect(full?.recovery).toBe('session-end');
    expect(partial?.recovery).toBeUndefined();
    expect(session?.endSnapshotId).toBe(full?.id);
  });

  it('follows a chain of window closes back to the state before the first one', async () => {
    setOpenWindows([NORMAL, PRIVATE, { id: 3, tabs: ['https://c.example'] }]);
    await takeSnapshot();
    setOpenWindows([NORMAL, { id: 3, tabs: ['https://c.example'] }]);
    await takeSnapshot();
    setOpenWindows([NORMAL]);
    await takeSnapshot();

    await startNextSession();

    const [full] = await db.snapshots.toArray();
    expect(full?.recovery).toBe('session-end');
  });

  it('keeps a window opened in the same moment another one closed', async () => {
    setOpenWindows([NORMAL, PRIVATE]);
    await takeSnapshot();
    setOpenWindows([NORMAL, { id: 4, incognito: true, tabs: ['https://new-private.example'] }]);
    await takeSnapshot();

    await startNextSession();

    const snapshots = await db.snapshots.toArray();
    expect(snapshots.at(-1)?.recovery).toBe('session-end');
    expect(snapshots[0]?.recovery).toBe('window-closed');
  });

  it('ignores a window closed before later activity', async () => {
    setOpenWindows([NORMAL, PRIVATE]);
    await takeSnapshot();
    setOpenWindows([NORMAL]);
    await takeSnapshot();
    setOpenWindows([{ id: 1, tabs: ['https://a.example', 'https://b.example'] }]);
    await takeSnapshot();

    await startNextSession();

    const snapshots = await db.snapshots.toArray();
    expect(snapshots[0]?.recovery).toBe('window-closed');
    expect(snapshots.at(-1)?.recovery).toBe('session-end');
  });

  it('only follows window closes from the final moments of the session', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    setOpenWindows([NORMAL, PRIVATE, { id: 3, tabs: ['https://c.example'] }]);
    await takeSnapshot();
    setOpenWindows([NORMAL, { id: 3, tabs: ['https://c.example'] }]);
    await takeSnapshot();

    vi.setSystemTime(Date.now() + 60_000);
    setOpenWindows([NORMAL]);
    await takeSnapshot();

    await startNextSession();

    const [, middle] = await db.snapshots.toArray();
    expect(middle?.recovery).toBe('session-end');
  });
});

import { countTabs, tabKey } from '@/lib/tabs';
import type { RecoveryReason, Snapshot, WindowRecord } from '@/lib/types';
import { db } from './db';
import { toWindowRecord } from './records';
import { currentSessionId } from './session';
import { resetTabCache } from './tab-cache';

const TAB_DROP_THRESHOLD = 5;

export async function takeSnapshot() {
  const live = await browser.windows.getAll({ populate: true, windowTypes: ['normal'] });
  await resetTabCache(live.flatMap((win) => win.tabs ?? []));

  const windows = live
    .map(toWindowRecord)
    .filter((win) => win.tabs.length > 0)
    .sort((a, b) => a.id - b.id);
  if (windows.length === 0) return;

  const sessionId = await currentSessionId();
  await db.transaction('rw', db.snapshots, db.closedWindows, async () => {
    const previous = await db.snapshots.where('sessionId').equals(sessionId).last();

    if (previous && layoutOf(previous.windows) === layoutOf(windows)) {
      await refreshTitles(previous, windows);
      return;
    }

    const createdAt = Date.now();
    if (previous) await recordClosures(previous, windows, createdAt);
    await db.snapshots.add({ sessionId, createdAt, windows });
  });
}

async function refreshTitles(snapshot: Snapshot, windows: WindowRecord[]) {
  if (JSON.stringify(snapshot.windows) === JSON.stringify(windows)) return;
  await db.snapshots.update(snapshot.id, { windows });
}

async function recordClosures(previous: Snapshot, windows: WindowRecord[], closedAt: number) {
  const closed = findClosedWindows(previous.windows, windows);
  await db.closedWindows.bulkAdd(
    closed.map(({ incognito, tabs }) => ({
      sessionId: previous.sessionId,
      snapshotId: previous.id,
      closedAt,
      incognito,
      tabs,
    })),
  );

  const reason = recoveryReason(previous.windows, windows, closed.length);
  if (reason && !previous.recovery) await db.snapshots.update(previous.id, { recovery: reason });
}

function findClosedWindows(before: WindowRecord[], after: WindowRecord[]) {
  const remaining = new Set(after.map((win) => win.id));
  const stillOpen = new Set(after.flatMap((win) => win.tabs.map((tab) => tabKey(tab.url, win.incognito))));
  return before.filter(
    (win) => !remaining.has(win.id) && win.tabs.some((tab) => !stillOpen.has(tabKey(tab.url, win.incognito))),
  );
}

function recoveryReason(
  before: WindowRecord[],
  after: WindowRecord[],
  closedWindowCount: number,
): RecoveryReason | undefined {
  if (closedWindowCount > 0) return 'window-closed';
  if (countTabs(before) - countTabs(after) >= TAB_DROP_THRESHOLD) return 'tab-drop';
  return undefined;
}

function layoutOf(windows: WindowRecord[]) {
  return JSON.stringify(
    windows.map(({ id, incognito, tabs }) => [id, incognito, tabs.map(({ url, pinned }) => [url, pinned])]),
  );
}

import type { RecoveryReason, Snapshot, WindowRecord } from '@/lib/types';
import { countTabs } from '@/lib/windows';
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
  await db.transaction('rw', db.snapshots, async () => {
    const previous = await db.snapshots.where('sessionId').equals(sessionId).last();

    if (previous && layoutOf(previous.windows) === layoutOf(windows)) {
      await refreshTitles(previous, windows);
      return;
    }
    if (previous) await flagRecoveryPoint(previous, windows);
    await db.snapshots.add({ sessionId, createdAt: Date.now(), windows });
  });
}

async function refreshTitles(snapshot: Snapshot, windows: WindowRecord[]) {
  if (JSON.stringify(snapshot.windows) === JSON.stringify(windows)) return;
  await db.snapshots.update(snapshot.id, { windows });
}

async function flagRecoveryPoint(snapshot: Snapshot, windows: WindowRecord[]) {
  const reason = recoveryReason(snapshot.windows, windows);
  if (!reason || snapshot.recovery) return;
  await db.snapshots.update(snapshot.id, { recovery: reason });
}

function layoutOf(windows: WindowRecord[]) {
  return JSON.stringify(
    windows.map(({ id, incognito, tabs }) => [id, incognito, tabs.map(({ url, pinned }) => [url, pinned])]),
  );
}

function recoveryReason(before: WindowRecord[], after: WindowRecord[]): RecoveryReason | undefined {
  const remaining = new Set(after.map((win) => win.id));
  if (before.some((win) => !remaining.has(win.id))) return 'window-closed';
  if (countTabs(before) - countTabs(after) >= TAB_DROP_THRESHOLD) return 'tab-drop';
  return undefined;
}

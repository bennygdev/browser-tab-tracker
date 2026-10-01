import { describe, expect, it } from 'vitest';
import { db } from '@/entrypoints/background/db';
import { pruneHistory } from '@/entrypoints/background/retention';
import type { RecoveryReason } from '@/lib/types';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const NOW = new Date(2026, 9, 1, 12, 0).getTime();

function addSnapshot(createdAt: number, recovery?: RecoveryReason, sessionId = 1) {
  return db.snapshots.add({ sessionId, createdAt, windows: [], recovery });
}

async function remaining() {
  return (await db.snapshots.orderBy('createdAt').toArray()).map((snapshot) => snapshot.createdAt);
}

describe('pruneHistory', () => {
  it('keeps everything from the last 7 days', async () => {
    await addSnapshot(NOW - 6 * DAY);
    await addSnapshot(NOW - 6 * DAY + MINUTE);
    await addSnapshot(NOW - HOUR);

    await pruneHistory(NOW);

    expect(await db.snapshots.count()).toBe(3);
  });

  it('keeps the last snapshot of each hour between 7 and 30 days old', async () => {
    const hour = new Date(NOW - 10 * DAY).setMinutes(0, 0, 0);
    await addSnapshot(hour + 5 * MINUTE);
    await addSnapshot(hour + 50 * MINUTE);
    await addSnapshot(hour + HOUR + MINUTE);

    await pruneHistory(NOW);

    expect(await remaining()).toEqual([hour + 50 * MINUTE, hour + HOUR + MINUTE]);
  });

  it('keeps the last snapshot of each day after 30 days', async () => {
    const day = new Date(NOW - 40 * DAY).setHours(0, 0, 0, 0);
    await addSnapshot(day + 9 * HOUR);
    await addSnapshot(day + 21 * HOUR);
    await addSnapshot(day + DAY + 9 * HOUR);

    await pruneHistory(NOW);

    expect(await remaining()).toEqual([day + 21 * HOUR, day + DAY + 9 * HOUR]);
  });

  it('keeps one snapshot per hour for each browser session', async () => {
    const hour = new Date(NOW - 10 * DAY).setMinutes(0, 0, 0);
    await addSnapshot(hour + 10 * MINUTE, undefined, 1);
    await addSnapshot(hour + 20 * MINUTE, undefined, 2);

    await pruneHistory(NOW);

    expect(await db.snapshots.count()).toBe(2);
  });

  it('never removes recovery points', async () => {
    const day = new Date(NOW - 400 * DAY).setHours(0, 0, 0, 0);
    await addSnapshot(day + 9 * HOUR, 'session-end');
    await addSnapshot(day + 10 * HOUR, 'window-closed');
    await addSnapshot(day + 11 * HOUR);

    await pruneHistory(NOW);

    expect(await db.snapshots.count()).toBe(3);
  });

  it('removes closed tabs and windows older than 90 days', async () => {
    const tab = { sessionId: 1, url: 'https://a.example', title: 'A', pinned: false, incognito: false };
    await db.closedTabs.bulkAdd([
      { ...tab, closedAt: NOW - 100 * DAY },
      { ...tab, closedAt: NOW - 10 * DAY },
    ]);
    await db.closedWindows.bulkAdd([
      { sessionId: 1, snapshotId: 1, closedAt: NOW - 100 * DAY, incognito: true, tabs: [] },
      { sessionId: 1, snapshotId: 1, closedAt: NOW - 10 * DAY, incognito: true, tabs: [] },
    ]);

    await pruneHistory(NOW);

    expect(await db.closedTabs.count()).toBe(1);
    expect(await db.closedWindows.count()).toBe(1);
  });
});

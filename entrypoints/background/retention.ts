import { DAY_MS } from '@/lib/time';
import { db } from './db';

const KEEP_EVERYTHING_DAYS = 7;
const KEEP_HOURLY_DAYS = 30;
const KEEP_CLOSED_DAYS = 90;

export function pruneHistory(now = Date.now()) {
  const keepEverythingSince = now - KEEP_EVERYTHING_DAYS * DAY_MS;
  const keepHourlySince = now - KEEP_HOURLY_DAYS * DAY_MS;
  const closedCutoff = now - KEEP_CLOSED_DAYS * DAY_MS;

  return db.transaction('rw', db.snapshots, db.closedTabs, db.closedWindows, async () => {
    const keptBuckets = new Set<string>();
    const doomed: number[] = [];

    await db.snapshots
      .where('createdAt')
      .below(keepEverythingSince)
      .reverse()
      .each((snapshot) => {
        if (snapshot.recovery) return;
        const bucket = `${snapshot.sessionId}:${bucketStart(snapshot.createdAt, snapshot.createdAt >= keepHourlySince)}`;
        if (keptBuckets.has(bucket)) doomed.push(snapshot.id);
        else keptBuckets.add(bucket);
      });

    await db.snapshots.bulkDelete(doomed);
    await db.closedTabs.where('closedAt').below(closedCutoff).delete();
    await db.closedWindows.where('closedAt').below(closedCutoff).delete();
  });
}

function bucketStart(time: number, hourly: boolean) {
  const date = new Date(time);
  if (hourly) date.setMinutes(0, 0, 0);
  else date.setHours(0, 0, 0, 0);
  return date.getTime();
}

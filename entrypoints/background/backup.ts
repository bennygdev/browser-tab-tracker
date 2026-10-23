import type { Backup, ClosedTab, ClosedWindow, ImportResult, Session, Snapshot } from '@/lib/types';
import { BACKUP_FORMAT, BACKUP_VERSION, parseBackup } from './backup-format';
import { db } from './db';
import { saveJsonFile } from './downloads';

const BACKUP_FOLDER = 'TabTracker';

type SnapshotIdLookup = (backupId: number) => Promise<number | undefined>;

export function buildBackup(): Promise<Backup> {
  return db.transaction('r', db.sessions, db.snapshots, db.closedTabs, db.closedWindows, async () => ({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    sessions: await db.sessions.toArray(),
    snapshots: await db.snapshots.toArray(),
    closedTabs: await db.closedTabs.toArray(),
    closedWindows: await db.closedWindows.toArray(),
  }));
}

export function writeDailyBackup() {
  const weekday = new Date().toLocaleDateString('en-GB', { weekday: 'long' }).toLowerCase();
  return saveBackup(`${BACKUP_FOLDER}/${import.meta.env.BROWSER}/backup-${weekday}.json`, true);
}

export function exportBackup() {
  const date = new Date().toLocaleDateString('en-GB').replaceAll('/', '-');
  return saveBackup(`tab-tracker-export-${date}.json`, false);
}

export async function importBackup(text: string): Promise<ImportResult> {
  const backup = parseBackup(text);
  return db.transaction('rw', db.sessions, db.snapshots, db.closedTabs, db.closedWindows, async () => {
    const sessionIds = await mergeSessions(backup.sessions);
    const snapshotIdOf = snapshotResolver(backup.snapshots);
    const snapshots = await mergeSnapshots(backup.snapshots, sessionIds);
    await linkSessionEnds(backup.sessions, sessionIds, snapshotIdOf);
    return {
      snapshots,
      closedTabs: await mergeClosedTabs(backup.closedTabs, sessionIds),
      closedWindows: await mergeClosedWindows(backup.closedWindows, sessionIds, snapshotIdOf),
    };
  });
}

async function saveBackup(filename: string, silent: boolean) {
  return saveJsonFile(filename, JSON.stringify(await buildBackup()), { silent });
}

async function mergeSessions(sessions: Session[]) {
  const existing = new Map((await db.sessions.toArray()).map((session) => [session.startedAt, session.id]));
  const ids = new Map<number, number>();
  for (const { id, startedAt } of sessions) {
    ids.set(id, existing.get(startedAt) ?? (await db.sessions.add({ startedAt })));
  }
  return ids;
}

async function mergeSnapshots(snapshots: Snapshot[], sessionIds: Map<number, number>) {
  const known = new Set(await db.snapshots.orderBy('createdAt').keys());
  const fresh = snapshots.flatMap(({ id: _, ...snapshot }) => {
    const sessionId = sessionIds.get(snapshot.sessionId);
    return sessionId === undefined || known.has(snapshot.createdAt) ? [] : [{ ...snapshot, sessionId }];
  });
  await db.snapshots.bulkAdd(fresh);
  return fresh.length;
}

function snapshotResolver(snapshots: Snapshot[]): SnapshotIdLookup {
  const createdAt = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot.createdAt]));
  return async (backupId) => {
    const time = createdAt.get(backupId);
    if (time === undefined) return undefined;
    const [id] = await db.snapshots.where('createdAt').equals(time).primaryKeys();
    return id;
  };
}

async function linkSessionEnds(sessions: Session[], sessionIds: Map<number, number>, snapshotIdOf: SnapshotIdLookup) {
  for (const { id, endSnapshotId } of sessions) {
    const sessionId = sessionIds.get(id);
    const snapshotId = endSnapshotId === undefined ? undefined : await snapshotIdOf(endSnapshotId);
    if (sessionId !== undefined && snapshotId !== undefined) {
      await db.sessions.update(sessionId, { endSnapshotId: snapshotId });
    }
  }
}

async function mergeClosedTabs(tabs: ClosedTab[], sessionIds: Map<number, number>) {
  const keyOf = (tab: Pick<ClosedTab, 'closedAt' | 'url'>) => `${tab.closedAt}:${tab.url}`;
  const known = new Set((await db.closedTabs.toArray()).map(keyOf));
  const fresh = tabs.flatMap(({ id: _, ...tab }) => {
    const sessionId = sessionIds.get(tab.sessionId);
    return sessionId === undefined || known.has(keyOf(tab)) ? [] : [{ ...tab, sessionId }];
  });
  await db.closedTabs.bulkAdd(fresh);
  return fresh.length;
}

async function mergeClosedWindows(
  windows: ClosedWindow[],
  sessionIds: Map<number, number>,
  snapshotIdOf: SnapshotIdLookup,
) {
  const keyOf = (win: Pick<ClosedWindow, 'closedAt' | 'incognito' | 'tabs'>) =>
    `${win.closedAt}:${win.incognito}:${win.tabs.length}`;
  const known = new Set((await db.closedWindows.toArray()).map(keyOf));
  let added = 0;

  for (const { id: _, ...win } of windows) {
    const sessionId = sessionIds.get(win.sessionId);
    const snapshotId = await snapshotIdOf(win.snapshotId);
    if (sessionId === undefined || snapshotId === undefined || known.has(keyOf(win))) continue;
    await db.closedWindows.add({ ...win, sessionId, snapshotId });
    added++;
  }
  return added;
}

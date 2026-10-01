import type { Session, Snapshot } from '@/lib/types';
import { db } from './db';

const SESSION_KEY = 'sessionId';
const SHUTDOWN_WINDOW_MS = 30_000;
const MAX_SHUTDOWN_STEPS = 20;

let pending: Promise<number> | undefined;

export function currentSessionId(): Promise<number> {
  pending ??= resolveSessionId().finally(() => {
    pending = undefined;
  });
  return pending;
}

async function resolveSessionId(): Promise<number> {
  const { [SESSION_KEY]: stored } = await browser.storage.session.get(SESSION_KEY);
  if (typeof stored === 'number') return stored;

  const id = await startSession();
  await browser.storage.session.set({ [SESSION_KEY]: id });
  return id;
}

function startSession(): Promise<number> {
  return db.transaction('rw', db.sessions, db.snapshots, db.closedWindows, async () => {
    const previous = await db.sessions.toCollection().last();
    if (previous) await markSessionEnd(previous);
    return db.sessions.add({ startedAt: Date.now() });
  });
}

async function markSessionEnd(session: Session) {
  const endSnapshotId = await findEndSnapshotId(session.id);
  if (endSnapshotId === undefined) return;
  await db.snapshots.update(endSnapshotId, { recovery: 'session-end' });
  await db.sessions.update(session.id, { endSnapshotId });
}

async function findEndSnapshotId(sessionId: number) {
  const recent = await db.snapshots
    .where('sessionId')
    .equals(sessionId)
    .reverse()
    .limit(MAX_SHUTDOWN_STEPS)
    .toArray();
  const [last] = recent;
  if (!last) return undefined;

  const cutoff = last.createdAt - SHUTDOWN_WINDOW_MS;
  const finalClosures = await db.closedWindows
    .where('sessionId')
    .equals(sessionId)
    .filter((win) => win.closedAt >= cutoff)
    .toArray();
  const windowClosedAfter = new Set(finalClosures.map((win) => win.snapshotId));

  let end = last;
  for (const previous of recent.slice(1)) {
    if (!windowClosedAfter.has(previous.id) || !onlyLostWindows(previous, end)) break;
    end = previous;
  }
  return end.id;
}

function onlyLostWindows(before: Snapshot, after: Snapshot) {
  const earlier = new Set(before.windows.map((win) => win.id));
  return after.windows.every((win) => earlier.has(win.id));
}

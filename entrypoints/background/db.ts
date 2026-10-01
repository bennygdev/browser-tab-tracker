import Dexie, { type EntityTable } from 'dexie';
import type { ClosedTab, ClosedWindow, Session, Snapshot } from '@/lib/types';

export const db = new Dexie('tab-tracker') as Dexie & {
  sessions: EntityTable<Session, 'id'>;
  snapshots: EntityTable<Snapshot, 'id'>;
  closedTabs: EntityTable<ClosedTab, 'id'>;
  closedWindows: EntityTable<ClosedWindow, 'id'>;
};

db.version(3).stores({
  sessions: '++id, [startedAt+id]',
  snapshots: '++id, createdAt, [createdAt+id], [sessionId+createdAt]',
  closedTabs: '++id, closedAt, [closedAt+id]',
  closedWindows: '++id, sessionId, closedAt',
});

export function snapshotsOf(sessionId: number) {
  return db.snapshots.where('[sessionId+createdAt]').between([sessionId, Dexie.minKey], [sessionId, Dexie.maxKey]);
}

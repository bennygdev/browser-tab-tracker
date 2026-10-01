import Dexie, { type EntityTable } from 'dexie';
import type { ClosedTab, Session, Snapshot } from '@/lib/types';

export const db = new Dexie('tab-tracker') as Dexie & {
  sessions: EntityTable<Session, 'id'>;
  snapshots: EntityTable<Snapshot, 'id'>;
  closedTabs: EntityTable<ClosedTab, 'id'>;
};

db.version(1).stores({
  sessions: '++id',
  snapshots: '++id, sessionId, createdAt',
  closedTabs: '++id, sessionId, closedAt',
});

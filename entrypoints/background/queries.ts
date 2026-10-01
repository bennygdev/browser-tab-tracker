import { SEARCH_LIMIT, tabMatcher } from '@/lib/search';
import type {
  ClosedTab,
  ClosedTabsRequest,
  PageRequest,
  SearchResult,
  Snapshot,
  SnapshotSummary,
} from '@/lib/types';
import { countTabs } from '@/lib/windows';
import { db } from './db';

export async function getSnapshotSummaries({ before, limit }: PageRequest): Promise<SnapshotSummary[]> {
  const page = before === undefined ? db.snapshots.toCollection() : db.snapshots.where('id').below(before);
  const snapshots = await page.reverse().limit(limit).toArray();

  const sessions = await db.sessions.bulkGet([...new Set(snapshots.map((snapshot) => snapshot.sessionId))]);
  const startedAt = new Map(sessions.flatMap((session) => (session ? [[session.id, session.startedAt]] : [])));

  return snapshots.map(({ windows, ...snapshot }) => ({
    ...snapshot,
    sessionStartedAt: startedAt.get(snapshot.sessionId) ?? snapshot.createdAt,
    tabCount: countTabs(windows),
    privateTabCount: countTabs(windows.filter((win) => win.incognito)),
  }));
}

export async function getSnapshot(id: number): Promise<Snapshot | null> {
  return (await db.snapshots.get(id)) ?? null;
}

export async function getClosedTabs({ before, limit, query }: ClosedTabsRequest): Promise<ClosedTab[]> {
  const page = before === undefined ? db.closedTabs.toCollection() : db.closedTabs.where('id').below(before);
  return page.reverse().filter(tabMatcher(query)).limit(limit).toArray();
}

export async function searchSnapshots(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const matches = tabMatcher(query);
  const results = new Map<string, SearchResult>();
  const isFull = () => results.size >= SEARCH_LIMIT;

  await db.snapshots
    .reverse()
    .until(isFull)
    .each((snapshot) => {
      for (const { incognito, tabs } of snapshot.windows) {
        for (const { url, title, pinned } of tabs) {
          const key = `${incognito}:${url}`;
          if (isFull() || results.has(key) || !matches({ url, title })) continue;
          results.set(key, { url, title, pinned, incognito, seenAt: snapshot.createdAt, snapshotId: snapshot.id });
        }
      }
    });

  return [...results.values()];
}

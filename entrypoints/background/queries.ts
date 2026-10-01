import { SEARCH_LIMIT, tabMatcher } from '@/lib/search';
import { countTabs, isBlankPage, tabKey } from '@/lib/tabs';
import type {
  ClosedTab,
  ClosedTabsRequest,
  ClosedWindow,
  SearchResult,
  Snapshot,
  SnapshotSummary,
  SnapshotsRequest,
} from '@/lib/types';
import { db } from './db';
import { openTabKeys } from './open-tabs';

const CLOSED_WINDOW_SCAN = 50;

export async function getSnapshotSummaries({
  before,
  limit,
  recoveryOnly,
}: SnapshotsRequest): Promise<SnapshotSummary[]> {
  const page = before === undefined ? db.snapshots.toCollection() : db.snapshots.where('id').below(before);
  const snapshots = await page
    .reverse()
    .filter((snapshot) => !recoveryOnly || snapshot.recovery !== undefined)
    .limit(limit)
    .toArray();

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

export async function getClosedWindows(limit: number): Promise<ClosedWindow[]> {
  const [recent, open] = await Promise.all([
    db.closedWindows.reverse().limit(CLOSED_WINDOW_SCAN).toArray(),
    openTabKeys(),
  ]);
  return recent
    .filter((win) => win.tabs.some((tab) => !isBlankPage(tab.url) && !open.has(tabKey(tab.url, win.incognito))))
    .slice(0, limit);
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
          const key = tabKey(url, incognito);
          if (isFull() || results.has(key) || !matches({ url, title })) continue;
          results.set(key, { url, title, pinned, incognito, seenAt: snapshot.createdAt, snapshotId: snapshot.id });
        }
      }
    });

  return [...results.values()];
}

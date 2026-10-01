import { describe, expect, it } from 'vitest';
import { db } from '@/entrypoints/background/db';
import {
  getClosedTabs,
  getClosedWindows,
  getSnapshot,
  getSnapshotSummaries,
  searchSnapshots,
} from '@/entrypoints/background/queries';
import type { RecoveryReason, WindowRecord } from '@/lib/types';
import { setOpenWindows } from './helpers';

function windowOf(id: number, urls: string[], incognito = false): WindowRecord {
  return { id, incognito, tabs: urls.map((url) => ({ url, title: `Title of ${url}`, pinned: false })) };
}

async function addSnapshot(createdAt: number, windows: WindowRecord[], recovery?: RecoveryReason) {
  return db.snapshots.add({ sessionId: 1, createdAt, windows, recovery });
}

function closedWindowOf(closedAt: number, url: string, incognito = false) {
  return { sessionId: 1, snapshotId: 1, closedAt, incognito, tabs: windowOf(1, [url]).tabs };
}

async function addClosedTab(closedAt: number, url: string) {
  return db.closedTabs.add({ sessionId: 1, closedAt, url, title: `Title of ${url}`, pinned: false, incognito: false });
}

describe('getSnapshotSummaries', () => {
  it('returns the newest snapshots first with tab counts and session start', async () => {
    await db.sessions.add({ startedAt: 50 });
    await addSnapshot(100, [windowOf(1, ['https://a.example'])]);
    await addSnapshot(200, [
      windowOf(1, ['https://a.example', 'https://b.example']),
      windowOf(2, ['https://private.example'], true),
    ]);

    const summaries = await getSnapshotSummaries({ limit: 10, recoveryOnly: false });

    expect(summaries).toMatchObject([
      { createdAt: 200, sessionStartedAt: 50, tabCount: 3, privateTabCount: 1 },
      { createdAt: 100, sessionStartedAt: 50, tabCount: 1, privateTabCount: 0 },
    ]);
    expect(summaries[0]).not.toHaveProperty('windows');
  });

  it('pages through older snapshots', async () => {
    for (let i = 1; i <= 5; i++) await addSnapshot(i * 100, [windowOf(1, ['https://a.example'])]);

    const first = await getSnapshotSummaries({ limit: 2, recoveryOnly: false });
    const last = first.at(-1);
    const second = await getSnapshotSummaries({
      before: last && [last.createdAt, last.id],
      limit: 2,
      recoveryOnly: false,
    });

    expect(first.map((s) => s.createdAt)).toEqual([500, 400]);
    expect(second.map((s) => s.createdAt)).toEqual([300, 200]);
  });

  it('orders by time even when ids are not in time order', async () => {
    await addSnapshot(300, [windowOf(1, ['https://a.example'])]);
    await addSnapshot(100, [windowOf(1, ['https://b.example'])]);
    await addSnapshot(200, [windowOf(1, ['https://c.example'])]);

    const summaries = await getSnapshotSummaries({ limit: 10, recoveryOnly: false });

    expect(summaries.map((s) => s.createdAt)).toEqual([300, 200, 100]);
  });

  it('can return recovery points only', async () => {
    await addSnapshot(100, [windowOf(1, ['https://a.example'])], 'window-closed');
    await addSnapshot(200, [windowOf(1, ['https://b.example'])]);
    await addSnapshot(300, [windowOf(1, ['https://c.example'])], 'session-end');

    const summaries = await getSnapshotSummaries({ limit: 10, recoveryOnly: true });

    expect(summaries.map((s) => s.recovery)).toEqual(['session-end', 'window-closed']);
  });
});

describe('getClosedWindows', () => {
  it('returns the newest closed windows that still have tabs to bring back', async () => {
    setOpenWindows([{ id: 9, tabs: ['https://open.example'] }]);
    await db.closedWindows.bulkAdd([
      closedWindowOf(100, 'https://private.example', true),
      closedWindowOf(200, 'https://open.example'),
      closedWindowOf(300, 'https://gone.example'),
    ]);

    const windows = await getClosedWindows(5);

    expect(windows.map((win) => win.closedAt)).toEqual([300, 100]);
  });
});

describe('getSnapshot', () => {
  it('returns null for a snapshot that does not exist', async () => {
    expect(await getSnapshot(42)).toBeNull();
  });
});

describe('getClosedTabs', () => {
  it('returns the newest closed tabs first and pages through older ones', async () => {
    for (let i = 1; i <= 3; i++) await addClosedTab(i * 100, `https://site${i}.example`);

    const first = await getClosedTabs({ limit: 2, query: '' });
    const last = first.at(-1);
    const second = await getClosedTabs({ before: last && [last.closedAt, last.id], limit: 2, query: '' });

    expect(first.map((tab) => tab.closedAt)).toEqual([300, 200]);
    expect(second.map((tab) => tab.closedAt)).toEqual([100]);
  });

  it('does not skip tabs closed in the same millisecond across pages', async () => {
    for (let i = 1; i <= 3; i++) await addClosedTab(100, `https://site${i}.example`);

    const first = await getClosedTabs({ limit: 2, query: '' });
    const last = first.at(-1);
    const second = await getClosedTabs({ before: last && [last.closedAt, last.id], limit: 2, query: '' });

    expect([...first, ...second].map((tab) => tab.url).sort()).toEqual([
      'https://site1.example',
      'https://site2.example',
      'https://site3.example',
    ]);
  });

  it('filters by title or URL before applying the page size', async () => {
    await addClosedTab(100, 'https://news.example');
    await addClosedTab(200, 'https://mail.example');
    await addClosedTab(300, 'https://video.example');

    const results = await getClosedTabs({ limit: 1, query: 'NEWS' });

    expect(results.map((tab) => tab.url)).toEqual(['https://news.example']);
  });
});

describe('searchSnapshots', () => {
  it('finds tabs by title or URL, case-insensitively', async () => {
    await addSnapshot(100, [windowOf(1, ['https://docs.example', 'https://mail.example'])]);

    const byUrl = await searchSnapshots('DOCS');
    const byTitle = await searchSnapshots('title of https://mail');

    expect(byUrl.map((result) => result.url)).toEqual(['https://docs.example']);
    expect(byTitle.map((result) => result.url)).toEqual(['https://mail.example']);
  });

  it('returns one result per URL, pointing at the newest snapshot', async () => {
    await addSnapshot(100, [windowOf(1, ['https://docs.example'])]);
    const newest = await addSnapshot(200, [windowOf(1, ['https://docs.example'])]);

    expect(await searchSnapshots('docs')).toMatchObject([{ seenAt: 200, snapshotId: newest }]);
  });

  it('keeps normal and private copies of the same URL apart', async () => {
    await addSnapshot(100, [
      windowOf(1, ['https://docs.example']),
      windowOf(2, ['https://docs.example'], true),
    ]);

    const results = await searchSnapshots('docs');

    expect(results.map((result) => result.incognito).sort()).toEqual([false, true]);
  });

  it('returns nothing for a blank query', async () => {
    await addSnapshot(100, [windowOf(1, ['https://docs.example'])]);

    expect(await searchSnapshots('  ')).toEqual([]);
  });
});

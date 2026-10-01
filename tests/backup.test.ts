import { describe, expect, it } from 'vitest';
import { buildBackup, importBackup } from '@/entrypoints/background/backup';
import { db } from '@/entrypoints/background/db';
import { getSnapshotSummaries } from '@/entrypoints/background/queries';
import type { WindowRecord } from '@/lib/types';

const window = (url: string, incognito = false): WindowRecord => ({
  id: 1,
  incognito,
  tabs: [{ url, title: `Title of ${url}`, pinned: false }],
});

async function seedHistory() {
  const sessionId = await db.sessions.add({ startedAt: 1_000 });
  const first = await db.snapshots.add({ sessionId, createdAt: 2_000, windows: [window('https://a.example', true)] });
  const second = await db.snapshots.add({
    sessionId,
    createdAt: 3_000,
    windows: [window('https://b.example')],
    recovery: 'session-end',
  });
  await db.sessions.update(sessionId, { endSnapshotId: second });
  await db.closedTabs.add({ sessionId, closedAt: 2_500, url: 'https://c.example', title: 'C', pinned: false, incognito: false });
  await db.closedWindows.add({ sessionId, snapshotId: first, closedAt: 2_900, ...window('https://a.example', true) });
}

async function exportAndWipe() {
  const text = JSON.stringify(await buildBackup());
  await db.delete({ disableAutoOpen: false });
  return text;
}

describe('buildBackup', () => {
  it('contains every table', async () => {
    await seedHistory();

    const backup = await buildBackup();

    expect(backup).toMatchObject({ format: 'tab-tracker-backup', version: 1 });
    expect([backup.sessions, backup.snapshots, backup.closedTabs, backup.closedWindows].map((t) => t.length)).toEqual([
      1, 2, 1, 1,
    ]);
  });
});

describe('importBackup', () => {
  it('brings everything back into an empty database', async () => {
    await seedHistory();
    const text = await exportAndWipe();

    const result = await importBackup(text);

    expect(result).toEqual({ snapshots: 2, closedTabs: 1, closedWindows: 1 });
    expect(await db.snapshots.count()).toBe(2);
  });

  it('places imported history below newer snapshots', async () => {
    await seedHistory();
    const text = await exportAndWipe();
    const current = await db.sessions.add({ startedAt: 9_000 });
    await db.snapshots.add({ sessionId: current, createdAt: 9_500, windows: [window('https://new.example')] });

    await importBackup(text);

    const summaries = await getSnapshotSummaries({ limit: 10, recoveryOnly: false });
    expect(summaries.map((s) => s.createdAt)).toEqual([9_500, 3_000, 2_000]);
  });

  it('links session ends and closed windows to the imported snapshots', async () => {
    await seedHistory();
    const text = await exportAndWipe();
    await db.snapshots.add({ sessionId: 99, createdAt: 50, windows: [window('https://taken-id.example')] });

    await importBackup(text);

    const [session] = await db.sessions.toArray();
    const [closedWindow] = await db.closedWindows.toArray();
    const end = await db.snapshots.get(session?.endSnapshotId ?? -1);
    const beforeClose = await db.snapshots.get(closedWindow?.snapshotId ?? -1);
    expect(end?.createdAt).toBe(3_000);
    expect(beforeClose?.createdAt).toBe(2_000);
  });

  it('skips everything that is already there', async () => {
    await seedHistory();
    const text = JSON.stringify(await buildBackup());

    expect(await importBackup(text)).toEqual({ snapshots: 0, closedTabs: 0, closedWindows: 0 });
    expect(await db.sessions.count()).toBe(1);
  });

  it('rejects files that are not a backup', async () => {
    await expect(importBackup('not json')).rejects.toThrow('not valid JSON');
    await expect(importBackup('{"hello":"world"}')).rejects.toThrow('not a Tab Tracker backup');
  });

  it('rejects a file with the right shape from a different format', async () => {
    await seedHistory();
    const backup = await buildBackup();

    await expect(importBackup(JSON.stringify({ ...backup, format: 'other-app' }))).rejects.toThrow(
      'not a Tab Tracker backup',
    );
  });

  it('rejects snapshots with an unknown recovery reason', async () => {
    await seedHistory();
    const backup = await buildBackup();
    const tampered = { ...backup, snapshots: [{ ...backup.snapshots[0], recovery: 'something-else' }] };

    await expect(importBackup(JSON.stringify(tampered))).rejects.toThrow('not a Tab Tracker backup');
  });
});

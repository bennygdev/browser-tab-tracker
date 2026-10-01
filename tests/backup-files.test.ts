import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportBackup, writeDailyBackup } from '@/entrypoints/background/backup';
import { db } from '@/entrypoints/background/db';
import { runMaintenanceIfDue } from '@/entrypoints/background/maintenance';
import { onMessage } from '@/lib/messages';

const DOWNLOAD_ID = 7;

let savedJson: string | undefined;
let finalState: string;
let stopOffscreen: () => void;

beforeEach(() => {
  savedJson = undefined;
  finalState = 'complete';
  vi.spyOn(browser.downloads, 'download').mockImplementation(async () => DOWNLOAD_ID);
  vi.spyOn(browser.downloads, 'search').mockImplementation(
    async () => [{ id: DOWNLOAD_ID, state: finalState }] as Browser.downloads.DownloadItem[],
  );
  vi.spyOn(browser.downloads, 'erase').mockImplementation(async () => [DOWNLOAD_ID]);
  vi.spyOn(browser.downloads, 'setUiOptions').mockResolvedValue();
  vi.spyOn(browser.downloads.onChanged, 'addListener').mockImplementation(() => {});
  vi.spyOn(browser.downloads.onChanged, 'removeListener').mockImplementation(() => {});
  vi.spyOn(browser.offscreen, 'hasDocument').mockImplementation(async () => false);
  vi.spyOn(browser.offscreen, 'createDocument').mockResolvedValue();
  vi.spyOn(browser.offscreen, 'closeDocument').mockResolvedValue();
  stopOffscreen = onMessage('createObjectUrl', ({ data }) => {
    savedJson = data.text;
    return 'blob:backup';
  });
});

afterEach(() => {
  stopOffscreen();
});

describe('writeDailyBackup', () => {
  it('saves silently into the TabTracker folder, one file per weekday', async () => {
    await writeDailyBackup();

    const weekday = new Date().toLocaleDateString('en-GB', { weekday: 'long' }).toLowerCase();
    expect(browser.downloads.download).toHaveBeenCalledWith({
      url: 'blob:backup',
      filename: `TabTracker/backup-${weekday}.json`,
      conflictAction: 'overwrite',
      saveAs: false,
    });
    expect(vi.mocked(browser.downloads.setUiOptions).mock.calls).toEqual([[{ enabled: false }], [{ enabled: true }]]);
    expect(browser.downloads.erase).toHaveBeenCalledWith({ id: DOWNLOAD_ID });
    expect(browser.offscreen.closeDocument).toHaveBeenCalled();
  });

  it('writes the whole history into the file', async () => {
    const sessionId = await db.sessions.add({ startedAt: 1 });
    await db.snapshots.add({ sessionId, createdAt: 2, windows: [] });

    await writeDailyBackup();

    expect(JSON.parse(savedJson ?? '{}')).toMatchObject({
      format: 'tab-tracker-backup',
      sessions: [{ startedAt: 1 }],
      snapshots: [{ createdAt: 2 }],
    });
  });

  it('creates the file directly in the background on Firefox', async () => {
    vi.stubEnv('BROWSER', 'firefox');
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:firefox');
    vi.spyOn(URL, 'revokeObjectURL').mockReturnValue();

    await writeDailyBackup();

    expect(browser.offscreen.createDocument).not.toHaveBeenCalled();
    expect(browser.downloads.setUiOptions).not.toHaveBeenCalled();
    expect(browser.downloads.download).toHaveBeenCalledWith(expect.objectContaining({ url: 'blob:firefox' }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:firefox');
  });
});

describe('exportBackup', () => {
  it('saves a dated file that stays in the download list', async () => {
    const saved = await exportBackup();

    const date = new Date().toLocaleDateString('en-GB').replaceAll('/', '-');
    expect(browser.downloads.download).toHaveBeenCalledWith({
      url: 'blob:backup',
      filename: `tab-tracker-export-${date}.json`,
      conflictAction: 'uniquify',
    });
    expect(browser.downloads.erase).not.toHaveBeenCalled();
    expect(browser.downloads.setUiOptions).not.toHaveBeenCalled();
    expect(saved).toBe(true);
  });

  it('reports a cancelled save', async () => {
    finalState = 'interrupted';

    expect(await exportBackup()).toBe(false);
  });
});

describe('runMaintenanceIfDue', () => {
  it('backs up once per day', async () => {
    await runMaintenanceIfDue();
    await runMaintenanceIfDue();

    expect(browser.downloads.download).toHaveBeenCalledTimes(1);
  });
});

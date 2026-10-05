import { onMessage } from '@/lib/messages';
import { exportBackup, importBackup } from './backup';
import {
  getClosedTabs,
  getClosedWindows,
  getSnapshot,
  getSnapshotSummaries,
  searchSnapshots,
} from './queries';
import { setRecordingPaused } from './pause';
import { isPaused } from './recording';
import { dismissLostSession, findLostSession } from './recovery';
import { restoreTabs, searchForTab } from './restore';
import { getSettings, saveSettings } from './settings';

export function registerMessageHandlers() {
  onMessage('getSnapshotSummaries', ({ data }) => getSnapshotSummaries(data));
  onMessage('getSnapshot', ({ data }) => getSnapshot(data));
  onMessage('getClosedTabs', ({ data }) => getClosedTabs(data));
  onMessage('getClosedWindows', ({ data }) => getClosedWindows(data));
  onMessage('getLostSession', () => findLostSession());
  onMessage('dismissLostSession', ({ data }) => dismissLostSession(data));
  onMessage('searchSnapshots', ({ data }) => searchSnapshots(data));
  onMessage('restoreTabs', ({ data }) => restoreTabs(data));
  onMessage('searchForTab', ({ data }) => searchForTab(data));
  onMessage('exportBackup', () => exportBackup());
  onMessage('importBackup', ({ data }) => importBackup(data));
  onMessage('getSettings', () => getSettings());
  onMessage('saveSettings', ({ data }) => saveSettings(data));
  onMessage('getRecordingPaused', () => isPaused());
  onMessage('setRecordingPaused', ({ data }) => setRecordingPaused(data));
}

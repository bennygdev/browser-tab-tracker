import { onMessage } from '@/lib/messages';
import {
  getClosedTabs,
  getClosedWindows,
  getSnapshot,
  getSnapshotSummaries,
  searchSnapshots,
} from './queries';
import { dismissLostSession, findLostSession } from './recovery';
import { restoreTabs, searchForTab } from './restore';

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
}

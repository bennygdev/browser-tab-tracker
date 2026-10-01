import { onMessage } from '@/lib/messages';
import { openDashboard } from './open-dashboard';
import { getClosedTabs, getSnapshot, getSnapshotSummaries, searchSnapshots } from './queries';
import { startTracking } from './tracker';

export default defineBackground(() => {
  startTracking();

  onMessage('getSnapshotSummaries', ({ data }) => getSnapshotSummaries(data));
  onMessage('getSnapshot', ({ data }) => getSnapshot(data));
  onMessage('getClosedTabs', ({ data }) => getClosedTabs(data));
  onMessage('searchSnapshots', ({ data }) => searchSnapshots(data));

  browser.action.onClicked.addListener(openDashboard);
});

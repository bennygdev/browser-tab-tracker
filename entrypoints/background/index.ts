import { registerMessageHandlers } from './api';
import { startIndicator } from './indicator';
import { startMaintenance } from './maintenance';
import { openDashboard } from './open-dashboard';
import { setRecordingPaused } from './pause';
import { startRecoveryChecks } from './recovery';
import { report } from './report';
import { startTracking } from './tracker';

export default defineBackground(() => {
  startTracking();
  startRecoveryChecks();
  startMaintenance();
  startIndicator(setRecordingPaused);
  registerMessageHandlers();
  browser.action.onClicked.addListener((tab) => {
    openDashboard(tab).catch(report);
  });
});

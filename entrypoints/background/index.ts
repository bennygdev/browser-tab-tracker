import { registerMessageHandlers } from './api';
import { startMaintenance } from './maintenance';
import { openDashboard } from './open-dashboard';
import { startRecoveryChecks } from './recovery';
import { startTracking } from './tracker';

export default defineBackground(() => {
  startTracking();
  startRecoveryChecks();
  startMaintenance();
  registerMessageHandlers();
  browser.action.onClicked.addListener(openDashboard);
});

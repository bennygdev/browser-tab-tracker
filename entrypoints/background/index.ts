import { registerMessageHandlers } from './api';
import { openDashboard } from './open-dashboard';
import { startRecoveryChecks } from './recovery';
import { startTracking } from './tracker';

export default defineBackground(() => {
  startTracking();
  startRecoveryChecks();
  registerMessageHandlers();
  browser.action.onClicked.addListener(openDashboard);
});

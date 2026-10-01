import { openDashboard } from './open-dashboard';
import { startTracking } from './tracker';

export default defineBackground(() => {
  startTracking();
  browser.action.onClicked.addListener(openDashboard);
});

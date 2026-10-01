import { formatDate } from '@/lib/format';
import { ensureAlarm } from './alarms';
import { writeDailyBackup } from './backup';
import { restoreDownloadUi } from './downloads';
import { report } from './report';
import { pruneHistory } from './retention';

const MAINTENANCE_ALARM = 'maintenance';
const LAST_RUN_KEY = 'lastMaintenanceDay';

export function startMaintenance() {
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === MAINTENANCE_ALARM) runMaintenanceIfDue().catch(report);
  });
  ensureAlarm(MAINTENANCE_ALARM, { delayInMinutes: 1, periodInMinutes: 60 }).catch(report);
  restoreDownloadUi().catch(report);
}

export async function runMaintenanceIfDue() {
  const today = formatDate(Date.now());
  const { [LAST_RUN_KEY]: lastRun } = await browser.storage.local.get(LAST_RUN_KEY);
  if (lastRun === today) return;

  await pruneHistory();
  await writeDailyBackup();
  await browser.storage.local.set({ [LAST_RUN_KEY]: today });
}

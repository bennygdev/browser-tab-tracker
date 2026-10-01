import { formatDate, formatShortTime, plural } from '@/lib/format';
import { countTabs, withoutBlankPages } from '@/lib/tabs';
import type { LostSession } from '@/lib/types';
import { db } from './db';
import { openStandaloneDashboard } from './open-dashboard';
import { missingTabs } from './open-tabs';
import { report } from './report';
import { restoreTabs } from './restore';
import { currentSessionId } from './session';

const CHECK_ALARM = 'lost-session-check';
const CHECK_DELAY_MS = 15_000;
const NOTIFICATION_PREFIX = 'lost-session:';
const DISMISSED_KEY = 'dismissedLostSnapshotId';
const IS_FIREFOX = import.meta.env.BROWSER === 'firefox';

export function startRecoveryChecks() {
  browser.runtime.onStartup.addListener(() => {
    browser.alarms.create(CHECK_ALARM, { when: Date.now() + CHECK_DELAY_MS }).catch(report);
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === CHECK_ALARM) notifyLostSession().catch(report);
  });

  browser.notifications.onClicked.addListener((id) => {
    handleNotification(id, 'review').catch(report);
  });

  if (!IS_FIREFOX) {
    browser.notifications.onButtonClicked.addListener((id, index) => {
      handleNotification(id, index === 0 ? 'restore' : 'review').catch(report);
    });
  }
}

export async function findLostSession(): Promise<LostSession | null> {
  const sessionId = await currentSessionId();
  const previous = await db.sessions.where('id').below(sessionId).last();
  if (previous?.endSnapshotId === undefined) return null;

  const { [DISMISSED_KEY]: dismissed } = await browser.storage.local.get(DISMISSED_KEY);
  if (dismissed === previous.endSnapshotId) return null;

  const snapshot = await db.snapshots.get(previous.endSnapshotId);
  if (!snapshot) return null;

  const windows = await missingTabs(withoutBlankPages(snapshot.windows));
  return windows.length > 0 ? { snapshotId: snapshot.id, endedAt: snapshot.createdAt, windows } : null;
}

export async function dismissLostSession(snapshotId: number) {
  await browser.storage.local.set({ [DISMISSED_KEY]: snapshotId });
}

async function notifyLostSession() {
  const lost = await findLostSession();
  if (!lost) return;

  await browser.notifications.create(`${NOTIFICATION_PREFIX}${lost.snapshotId}`, {
    type: 'basic',
    iconUrl: browser.runtime.getURL('/icons/128.png'),
    title: 'Restore your last session?',
    message: describeLostSession(lost),
    ...(!IS_FIREFOX && { buttons: [{ title: 'Restore' }, { title: 'Review' }] }),
  });
}

async function handleNotification(notificationId: string, action: 'restore' | 'review') {
  if (!notificationId.startsWith(NOTIFICATION_PREFIX)) return;
  await browser.notifications.clear(notificationId);

  if (action === 'review') {
    await openStandaloneDashboard(Number(notificationId.slice(NOTIFICATION_PREFIX.length)));
    return;
  }

  const lost = await findLostSession();
  if (lost) await restoreTabs({ windows: lost.windows, target: 'new-window', skipAlreadyOpen: true });
}

function describeLostSession({ endedAt, windows }: LostSession) {
  const total = countTabs(windows);
  const privateCount = countTabs(windows.filter((win) => win.incognito));
  const tabs = privateCount > 0 ? `${plural(total, 'tab')} (${privateCount} private)` : plural(total, 'tab');
  const verb = total === 1 ? "isn't" : "aren't";
  const hint = IS_FIREFOX ? ' Click to review.' : '';
  return `${tabs} from ${formatDate(endedAt)} ${formatShortTime(endedAt)} ${verb} open.${hint}`;
}

import { debounce } from '@/lib/debounce';
import { ensureAlarm } from './alarms';
import { logClosedTab } from './closed-tabs';
import { forgetHiddenTab, inheritHidden, isHidden, isPaused, revealIfLeftSite } from './recording';
import { report } from './report';
import { takeSnapshot } from './snapshots';
import { forgetTab, rememberTab } from './tab-cache';

const SNAPSHOT_DELAY_MS = 1000;
const SNAPSHOT_MAX_DELAY_MS = 5000;
const CHECK_ALARM = 'snapshot-check';
const CHECK_INTERVAL_MINUTES = 5;

let snapshotQueue = Promise.resolve();

export function snapshotNow() {
  snapshotQueue = snapshotQueue.then(takeSnapshot).catch(report);
  return snapshotQueue;
}

const scheduleSnapshot = debounce(snapshotNow, SNAPSHOT_DELAY_MS, SNAPSHOT_MAX_DELAY_MS);

export function startTracking() {
  browser.tabs.onCreated.addListener(async (tab) => {
    scheduleSnapshot();
    await recordCreation(tab).catch(report);
  });

  browser.tabs.onUpdated.addListener(async (_tabId, change, tab) => {
    if (change.url !== undefined || change.pinned !== undefined || change.status === 'complete') {
      scheduleSnapshot();
    }
    if (change.url !== undefined || change.title !== undefined || change.pinned !== undefined) {
      await recordChange(tab, change.url !== undefined).catch(report);
    }
  });

  browser.tabs.onRemoved.addListener(async (tabId, { isWindowClosing }) => {
    scheduleSnapshot();
    await recordRemoval(tabId, isWindowClosing).catch(report);
  });

  browser.tabs.onMoved.addListener(scheduleSnapshot);
  browser.tabs.onAttached.addListener(scheduleSnapshot);
  browser.tabs.onDetached.addListener(scheduleSnapshot);
  browser.tabs.onReplaced.addListener(scheduleSnapshot);
  browser.windows.onCreated.addListener(scheduleSnapshot);
  browser.windows.onRemoved.addListener(scheduleSnapshot);
  browser.runtime.onStartup.addListener(scheduleSnapshot);
  browser.runtime.onInstalled.addListener(scheduleSnapshot);

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === CHECK_ALARM) scheduleSnapshot();
  });
  ensureAlarm(CHECK_ALARM, { periodInMinutes: CHECK_INTERVAL_MINUTES }).catch(report);

  scheduleSnapshot();
}

async function recordCreation(tab: Browser.tabs.Tab) {
  if (await isPaused()) return;
  await inheritHidden(tab);
  await rememberVisibleTab(tab);
}

async function recordChange(tab: Browser.tabs.Tab, navigated: boolean) {
  if (await isPaused()) return;
  if (navigated) {
    await revealIfLeftSite(tab);
    await inheritHidden(tab);
  }
  await rememberVisibleTab(tab);
}

async function rememberVisibleTab(tab: Browser.tabs.Tab) {
  if (tab.id !== undefined && !(await isHidden(tab.id))) await rememberTab(tab);
}

async function recordRemoval(tabId: number, isWindowClosing: boolean) {
  const tab = await forgetTab(tabId);
  await forgetHiddenTab(tabId);
  if (tab && !isWindowClosing && !(await isPaused())) await logClosedTab(tab);
}

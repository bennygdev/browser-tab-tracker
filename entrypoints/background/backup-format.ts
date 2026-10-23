import {
  type Backup,
  type ClosedTab,
  type ClosedWindow,
  RECOVERY_REASONS,
  type Session,
  type Snapshot,
  type TabRecord,
  type WindowRecord,
} from '@/lib/types';

export const BACKUP_FORMAT = 'tab-tracker-backup';
export const BACKUP_VERSION = 1;

type Guard<T> = (value: unknown) => value is T;

export function parseBackup(text: string): Backup {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (!isBackup(value)) throw new Error('This file is not a Tab Tracker backup.');
  return value;
}

function isBackup(value: unknown): value is Backup {
  return (
    isObject(value) &&
    value.format === BACKUP_FORMAT &&
    value.version === BACKUP_VERSION &&
    isList(value.sessions, isSession) &&
    isList(value.snapshots, isSnapshot) &&
    isList(value.closedTabs, isClosedTab) &&
    isList(value.closedWindows, isClosedWindow)
  );
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const isList = <T>(value: unknown, guard: Guard<T>): value is T[] => Array.isArray(value) && value.every(guard);

const isTab: Guard<TabRecord> = (value): value is TabRecord =>
  isObject(value) &&
  typeof value.url === 'string' &&
  typeof value.title === 'string' &&
  typeof value.pinned === 'boolean';

const isWindow: Guard<WindowRecord> = (value): value is WindowRecord =>
  isObject(value) && isNumber(value.id) && typeof value.incognito === 'boolean' && isList(value.tabs, isTab);

const isSession: Guard<Session> = (value): value is Session =>
  isObject(value) &&
  isNumber(value.id) &&
  isNumber(value.startedAt) &&
  (value.endSnapshotId === undefined || isNumber(value.endSnapshotId));

const isSnapshot: Guard<Snapshot> = (value): value is Snapshot =>
  isObject(value) &&
  isNumber(value.id) &&
  isNumber(value.sessionId) &&
  isNumber(value.createdAt) &&
  isList(value.windows, isWindow) &&
  (value.recovery === undefined || RECOVERY_REASONS.some((reason) => reason === value.recovery));

const isClosedTab: Guard<ClosedTab> = (value): value is ClosedTab =>
  isObject(value) &&
  isNumber(value.id) &&
  isNumber(value.sessionId) &&
  isNumber(value.closedAt) &&
  typeof value.incognito === 'boolean' &&
  isTab(value);

const isClosedWindow: Guard<ClosedWindow> = (value): value is ClosedWindow =>
  isObject(value) &&
  isNumber(value.id) &&
  isNumber(value.sessionId) &&
  isNumber(value.snapshotId) &&
  isNumber(value.closedAt) &&
  typeof value.incognito === 'boolean' &&
  isList(value.tabs, isTab);

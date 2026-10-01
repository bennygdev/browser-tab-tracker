export interface TabRecord {
  url: string;
  title: string;
  pinned: boolean;
}

export interface TabEntry extends TabRecord {
  incognito: boolean;
}

export interface WindowRecord {
  id: number;
  incognito: boolean;
  tabs: TabRecord[];
}

export type WindowPlan = Pick<WindowRecord, 'incognito' | 'tabs'>;

export type RecoveryReason = 'window-closed' | 'tab-drop' | 'session-end';

export interface Session {
  id: number;
  startedAt: number;
  endSnapshotId?: number;
}

export interface Snapshot {
  id: number;
  sessionId: number;
  createdAt: number;
  windows: WindowRecord[];
  recovery?: RecoveryReason;
}

export interface ClosedTab extends TabEntry {
  id: number;
  sessionId: number;
  closedAt: number;
}

export interface ClosedWindow extends WindowPlan {
  id: number;
  sessionId: number;
  snapshotId: number;
  closedAt: number;
}

export interface SnapshotSummary {
  id: number;
  sessionId: number;
  sessionStartedAt: number;
  createdAt: number;
  tabCount: number;
  privateTabCount: number;
  recovery?: RecoveryReason;
}

export interface SearchResult extends TabEntry {
  seenAt: number;
  snapshotId: number;
}

export interface LostSession {
  snapshotId: number;
  endedAt: number;
  windows: WindowPlan[];
}

export interface PageRequest {
  before?: number;
  limit: number;
}

export interface SnapshotsRequest extends PageRequest {
  recoveryOnly: boolean;
}

export interface ClosedTabsRequest extends PageRequest {
  query: string;
}

export interface RestoreRequest {
  windows: WindowPlan[];
  target: 'new-window' | 'existing-window';
  skipAlreadyOpen: boolean;
}

export interface RestoreResult {
  opened: number;
  skipped: number;
  failed: TabEntry[];
}

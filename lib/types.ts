export interface TabRecord {
  url: string;
  title: string;
  pinned: boolean;
}

export interface WindowRecord {
  id: number;
  incognito: boolean;
  tabs: TabRecord[];
}

export type RecoveryReason = 'window-closed' | 'tab-drop' | 'session-end';

export interface Session {
  id: number;
  startedAt: number;
}

export interface Snapshot {
  id: number;
  sessionId: number;
  createdAt: number;
  windows: WindowRecord[];
  recovery?: RecoveryReason;
}

export interface ClosedTab extends TabRecord {
  id: number;
  sessionId: number;
  closedAt: number;
  incognito: boolean;
}

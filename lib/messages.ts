import { defineExtensionMessaging } from '@webext-core/messaging';
import type {
  ClosedTab,
  ClosedTabsRequest,
  ClosedWindow,
  ImportResult,
  LostSession,
  RestoreRequest,
  RestoreResult,
  SearchResult,
  Settings,
  Snapshot,
  SnapshotSummary,
  SnapshotsRequest,
  TabEntry,
} from './types';

interface ProtocolMap {
  getSnapshotSummaries(request: SnapshotsRequest): SnapshotSummary[];
  getSnapshot(id: number): Snapshot | null;
  getClosedTabs(request: ClosedTabsRequest): ClosedTab[];
  getClosedWindows(limit: number): ClosedWindow[];
  getLostSession(): LostSession | null;
  dismissLostSession(snapshotId: number): void;
  searchSnapshots(query: string): SearchResult[];
  restoreTabs(request: RestoreRequest): RestoreResult;
  searchForTab(tab: TabEntry): void;
  exportBackup(): boolean;
  importBackup(text: string): ImportResult;
  getSettings(): Settings;
  saveSettings(changes: Partial<Settings>): void;
  createObjectUrl(file: { text: string; type: string }): string;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();

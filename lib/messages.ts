import { defineExtensionMessaging } from '@webext-core/messaging';
import type {
  ClosedTab,
  ClosedTabsRequest,
  ClosedWindow,
  LostSession,
  RestoreRequest,
  RestoreResult,
  SearchResult,
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
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();

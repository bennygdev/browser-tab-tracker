import { defineExtensionMessaging } from '@webext-core/messaging';
import type {
  ClosedTab,
  ClosedTabsRequest,
  PageRequest,
  SearchResult,
  Snapshot,
  SnapshotSummary,
} from './types';

interface ProtocolMap {
  getSnapshotSummaries(request: PageRequest): SnapshotSummary[];
  getSnapshot(id: number): Snapshot | null;
  getClosedTabs(request: ClosedTabsRequest): ClosedTab[];
  searchSnapshots(query: string): SearchResult[];
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();

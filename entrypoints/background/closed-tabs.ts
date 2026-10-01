import { isBlankPage } from '@/lib/tabs';
import type { TabEntry } from '@/lib/types';
import { db } from './db';
import { currentSessionId } from './session';

export async function logClosedTab(tab: TabEntry) {
  if (isBlankPage(tab.url)) return;
  await db.closedTabs.add({ ...tab, sessionId: await currentSessionId(), closedAt: Date.now() });
}

import { db } from './db';
import { currentSessionId } from './session';
import type { CachedTab } from './tab-cache';

const BLANK_PAGES = new Set([
  '',
  'about:blank',
  'about:home',
  'about:newtab',
  'about:privatebrowsing',
  'chrome://newtab/',
  'chrome://new-tab-page/',
]);

export async function logClosedTab(tab: CachedTab) {
  if (BLANK_PAGES.has(tab.url)) return;
  await db.closedTabs.add({ ...tab, sessionId: await currentSessionId(), closedAt: Date.now() });
}

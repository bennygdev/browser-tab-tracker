import type { Settings } from '@/lib/types';

export const DEFAULT_SETTINGS: Settings = {
  restoreNotification: 'always',
  skipAlreadyOpen: true,
  lazyRestoreThreshold: 10,
  showRecentlyClosed: true,
};

export async function getSettings(): Promise<Settings> {
  return browser.storage.local.get<Settings>(DEFAULT_SETTINGS);
}

export function saveSettings(changes: Partial<Settings>) {
  return browser.storage.local.set(changes);
}

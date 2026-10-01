import type { WindowRecord } from './types';

export function countTabs(windows: WindowRecord[]) {
  return windows.reduce((total, win) => total + win.tabs.length, 0);
}

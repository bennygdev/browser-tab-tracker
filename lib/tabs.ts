import type { WindowPlan } from './types';

const BLANK_PAGES = new Set([
  '',
  'about:blank',
  'about:home',
  'about:newtab',
  'about:privatebrowsing',
  'chrome://newtab/',
  'chrome://new-tab-page/',
]);

export function isBlankPage(url: string) {
  return BLANK_PAGES.has(url);
}

export function tabKey(url: string, incognito: boolean) {
  return `${incognito}:${url}`;
}

export function countTabs(windows: Pick<WindowPlan, 'tabs'>[]) {
  return windows.reduce((total, win) => total + win.tabs.length, 0);
}

export function withoutBlankPages(windows: WindowPlan[]): WindowPlan[] {
  return windows
    .map(({ incognito, tabs }) => ({ incognito, tabs: tabs.filter((tab) => !isBlankPage(tab.url)) }))
    .filter((win) => win.tabs.length > 0);
}

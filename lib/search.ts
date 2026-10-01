import type { TabRecord } from './types';

export const SEARCH_LIMIT = 50;

export function tabMatcher(query: string) {
  const needle = query.trim().toLowerCase();
  return ({ url, title }: Pick<TabRecord, 'url' | 'title'>) =>
    url.toLowerCase().includes(needle) || title.toLowerCase().includes(needle);
}

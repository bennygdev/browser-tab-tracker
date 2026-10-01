import { keepPreviousData, type QueryKey, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { PageCursor, PageRequest } from '@/lib/types';

const PAGE_SIZE = 100;

export function usePagedQuery<T>(
  queryKey: QueryKey,
  fetchPage: (page: PageRequest) => Promise<T[]>,
  cursorOf: (item: T) => PageCursor,
) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage({ before: pageParam, limit: PAGE_SIZE }),
    initialPageParam: undefined as PageCursor | undefined,
    getNextPageParam: (page) => {
      const last = page.at(-1);
      return page.length === PAGE_SIZE && last ? cursorOf(last) : undefined;
    },
    placeholderData: keepPreviousData,
  });
  return { ...query, items: query.data?.pages.flat() ?? [] };
}

export function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

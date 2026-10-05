import {
  keepPreviousData,
  type QueryKey,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { sendMessage } from '@/lib/messages';
import { RECORDING_PAUSED_KEY } from '@/lib/recording';
import type { PageCursor, PageRequest } from '@/lib/types';

const PAGE_SIZE = 100;

export const SETTINGS_QUERY_KEY = ['settings'];
const PAUSED_QUERY_KEY = ['recording-paused'];

export function useSettings() {
  return useQuery({ queryKey: SETTINGS_QUERY_KEY, queryFn: () => sendMessage('getSettings') }).data;
}

export function useRecordingPause() {
  const queryClient = useQueryClient();
  const { data: paused = false } = useQuery({
    queryKey: PAUSED_QUERY_KEY,
    queryFn: () => sendMessage('getRecordingPaused'),
  });
  useEffect(() => {
    const onChanged = (changes: Record<string, Browser.storage.StorageChange>) => {
      const change = changes[RECORDING_PAUSED_KEY];
      if (change) queryClient.setQueryData(PAUSED_QUERY_KEY, change.newValue === true);
    };
    browser.storage.local.onChanged.addListener(onChanged);
    return () => browser.storage.local.onChanged.removeListener(onChanged);
  }, [queryClient]);

  const toggle = useMutation({
    mutationFn: (next: boolean) => sendMessage('setRecordingPaused', next),
    onSuccess: (_, next) => {
      queryClient.setQueryData(PAUSED_QUERY_KEY, next);
      void queryClient.invalidateQueries({ queryKey: ['snapshots'] });
    },
  });
  return { paused, pending: toggle.isPending, setPaused: toggle.mutate };
}

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

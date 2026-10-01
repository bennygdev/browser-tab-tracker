import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { sendMessage } from '@/lib/messages';
import { SEARCH_LIMIT } from '@/lib/search';
import { formatDate, formatShortTime } from '../dates';
import { cn } from '../utils';
import { Notice, PrivateBadge, TabLabel } from './ui';

interface SearchResultsProps {
  query: string;
  onSelect: (snapshotId: number) => void;
}

export function SearchResults({ query, onSelect }: SearchResultsProps) {
  const [activeKey, setActiveKey] = useState<string>();
  const { data: results, isPending, error } = useQuery({
    queryKey: ['search', query],
    queryFn: () => sendMessage('searchSnapshots', query),
    placeholderData: keepPreviousData,
  });

  if (isPending) return <Notice>Searching…</Notice>;
  if (error) return <Notice>Search failed.</Notice>;
  if (results.length === 0) return <Notice>No tabs match "{query}".</Notice>;

  return (
    <div>
      <ul>
        {results.map((result) => {
          const key = `${result.incognito}:${result.url}`;
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => {
                  setActiveKey(key);
                  onSelect(result.snapshotId);
                }}
                className={cn(
                  'w-full space-y-1 px-4 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60',
                  activeKey === key && 'bg-zinc-100 dark:bg-zinc-800',
                )}
              >
                <TabLabel {...result} />
                <p className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
                  Last seen {formatDate(result.seenAt)} {formatShortTime(result.seenAt)}
                  {result.incognito && <PrivateBadge />}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
      {results.length === SEARCH_LIMIT && (
        <Notice>Showing the {SEARCH_LIMIT} most recent matches. Refine your search to narrow it down.</Notice>
      )}
    </div>
  );
}

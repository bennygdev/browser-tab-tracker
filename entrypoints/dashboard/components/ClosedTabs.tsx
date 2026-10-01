import { formatDate, formatTime } from '@/lib/format';
import { sendMessage } from '@/lib/messages';
import { usePagedQuery } from '../hooks';
import { chunkBy } from '../utils';
import { DayHeader, LoadMoreButton, Notice, PrivateBadge, TabLabel } from './ui';

export function ClosedTabs({ query }: { query: string }) {
  const { items, isPending, error, hasNextPage, fetchNextPage, isFetchingNextPage } = usePagedQuery(
    ['closed-tabs', query],
    (page) => sendMessage('getClosedTabs', { ...page, query }),
    (tab) => [tab.closedAt, tab.id],
  );

  if (isPending) return <Notice>Loading…</Notice>;
  if (error) return <Notice>Couldn't load your closed tabs.</Notice>;
  if (items.length === 0) {
    return (
      <Notice>
        {query ? `No closed tabs match "${query}".` : 'Tabs you close one at a time show up here.'}
      </Notice>
    );
  }

  return (
    <div>
      {chunkBy(items, (tab) => formatDate(tab.closedAt)).map((day) => (
        <section key={day.key}>
          <DayHeader time={day.items[0].closedAt} />
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {day.items.map((tab) => (
              <li key={tab.id} className="flex items-center gap-4 px-6 py-2">
                <span className="w-20 shrink-0 text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
                  {formatTime(tab.closedAt)}
                </span>
                <TabLabel {...tab} />
                {tab.incognito && <PrivateBadge />}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {hasNextPage && <LoadMoreButton onClick={() => fetchNextPage()} loading={isFetchingNextPage} />}
    </div>
  );
}

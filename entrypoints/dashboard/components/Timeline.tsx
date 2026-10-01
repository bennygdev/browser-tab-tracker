import { useEffect, useState } from 'react';
import { formatDate, formatShortTime, formatTime, plural } from '@/lib/format';
import { sendMessage } from '@/lib/messages';
import type { SnapshotSummary } from '@/lib/types';
import { usePagedQuery } from '../hooks';
import { chunkBy, cn } from '../utils';
import { CheckboxLabel, DayHeader, LoadMoreButton, Notice, PrivateBadge, RecoveryBadge } from './ui';

interface TimelineProps {
  selectedId?: number;
  onSelect: (id: number) => void;
}

export function Timeline({ selectedId, onSelect }: TimelineProps) {
  const [recoveryOnly, setRecoveryOnly] = useState(false);

  return (
    <>
      <div className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <CheckboxLabel checked={recoveryOnly} onChange={setRecoveryOnly}>
          Recovery points only
        </CheckboxLabel>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <TimelineList recoveryOnly={recoveryOnly} selectedId={selectedId} onSelect={onSelect} />
      </div>
    </>
  );
}

function TimelineList({ recoveryOnly, selectedId, onSelect }: TimelineProps & { recoveryOnly: boolean }) {
  const { items, isPending, error, hasNextPage, fetchNextPage, isFetchingNextPage } = usePagedQuery(
    ['snapshots', recoveryOnly],
    (page) => sendMessage('getSnapshotSummaries', { ...page, recoveryOnly }),
    (snapshot) => [snapshot.createdAt, snapshot.id],
  );
  const latestId = items[0]?.id;

  useEffect(() => {
    if (selectedId === undefined && latestId !== undefined) onSelect(latestId);
  }, [selectedId, latestId, onSelect]);

  if (isPending) return <Notice>Loading…</Notice>;
  if (error) return <Notice>Couldn't load your history.</Notice>;
  if (items.length === 0) {
    return (
      <Notice>
        {recoveryOnly ? 'No recovery points yet.' : 'No snapshots yet. Open or close a tab and it shows up here.'}
      </Notice>
    );
  }

  return (
    <div>
      {chunkBy(items, (snapshot) => formatDate(snapshot.createdAt)).map((day) => (
        <section key={day.key}>
          <DayHeader time={day.items[0].createdAt} />
          {chunkBy(day.items, (snapshot) => snapshot.sessionId).map((session) => (
            <div key={session.items[0].id}>
              <p className="px-4 pt-3 pb-1 text-xs text-zinc-400 dark:text-zinc-500">
                Session started {sessionStart(session.items[0].sessionStartedAt, day.key)}
              </p>
              <ul>
                {session.items.map((snapshot) => (
                  <TimelineRow
                    key={snapshot.id}
                    snapshot={snapshot}
                    selected={snapshot.id === selectedId}
                    onSelect={onSelect}
                  />
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
      {hasNextPage && <LoadMoreButton onClick={() => fetchNextPage()} loading={isFetchingNextPage} />}
    </div>
  );
}

interface TimelineRowProps {
  snapshot: SnapshotSummary;
  selected: boolean;
  onSelect: (id: number) => void;
}

function TimelineRow({ snapshot, selected, onSelect }: TimelineRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(snapshot.id)}
        aria-current={selected || undefined}
        className={cn(
          'flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60',
          selected && 'bg-zinc-100 dark:bg-zinc-800',
        )}
      >
        <span className="text-sm font-medium tabular-nums">{formatTime(snapshot.createdAt)}</span>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{plural(snapshot.tabCount, 'tab')}</span>
        {snapshot.privateTabCount > 0 && <PrivateBadge count={snapshot.privateTabCount} />}
        {snapshot.recovery && <RecoveryBadge reason={snapshot.recovery} />}
      </button>
    </li>
  );
}

function sessionStart(startedAt: number, day: string) {
  const time = formatShortTime(startedAt);
  return formatDate(startedAt) === day ? time : `${formatDate(startedAt)} ${time}`;
}

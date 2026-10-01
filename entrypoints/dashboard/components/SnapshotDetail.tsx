import { useQuery } from '@tanstack/react-query';
import { EyeOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { sendMessage } from '@/lib/messages';
import { tabMatcher } from '@/lib/search';
import type { TabRecord, WindowRecord } from '@/lib/types';
import { countTabs } from '@/lib/windows';
import { formatDay, formatTime } from '../dates';
import { cn, plural } from '../utils';
import { Notice, RECOVERY_LABELS, RecoveryBadge, TabLabel } from './ui';

interface SnapshotDetailProps {
  id: number;
  highlight: string;
}

export function SnapshotDetail({ id, highlight }: SnapshotDetailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: snapshot, isPending, error } = useQuery({
    queryKey: ['snapshot', id],
    queryFn: () => sendMessage('getSnapshot', id),
  });

  useEffect(() => {
    containerRef.current?.querySelector('[data-match]')?.scrollIntoView({ block: 'center' });
  }, [snapshot, highlight]);

  if (isPending) return <Notice>Loading…</Notice>;
  if (error) return <Notice>Couldn't load this snapshot.</Notice>;
  if (!snapshot) return <Notice>This snapshot no longer exists.</Notice>;

  const normalWindows = snapshot.windows.filter((win) => !win.incognito);
  const privateWindows = snapshot.windows.filter((win) => win.incognito);
  const isMatch = highlight ? tabMatcher(highlight) : () => false;

  return (
    <div ref={containerRef} className="space-y-6 p-6">
      <header className="space-y-2">
        <h2 className="text-base font-semibold">
          {formatDay(snapshot.createdAt)} at {formatTime(snapshot.createdAt)}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {plural(countTabs(snapshot.windows), 'tab')} in {plural(snapshot.windows.length, 'window')}
        </p>
        {snapshot.recovery && (
          <p className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <RecoveryBadge reason={snapshot.recovery} />
            {RECOVERY_LABELS[snapshot.recovery].description}
          </p>
        )}
      </header>
      <WindowGroup windows={normalWindows} isMatch={isMatch} />
      <WindowGroup windows={privateWindows} isMatch={isMatch} isPrivate />
    </div>
  );
}

interface WindowGroupProps {
  windows: WindowRecord[];
  isMatch: (tab: TabRecord) => boolean;
  isPrivate?: boolean;
}

function WindowGroup({ windows, isMatch, isPrivate = false }: WindowGroupProps) {
  if (windows.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3
        className={cn(
          'flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase',
          isPrivate ? 'text-violet-600 dark:text-violet-300' : 'text-zinc-500 dark:text-zinc-400',
        )}
      >
        {isPrivate && <EyeOff className="size-3.5" aria-hidden />}
        {isPrivate ? 'Private windows' : 'Windows'}
      </h3>
      {windows.map((win, index) => (
        <div
          key={win.id}
          className={cn(
            'overflow-hidden rounded-xl border',
            isPrivate ? 'border-violet-200 dark:border-violet-500/30' : 'border-zinc-200 dark:border-zinc-800',
          )}
        >
          <p
            className={cn(
              'px-4 py-2 text-xs font-medium',
              isPrivate
                ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300'
                : 'bg-zinc-50 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400',
            )}
          >
            {isPrivate ? 'Private window' : 'Window'} {index + 1} · {plural(win.tabs.length, 'tab')}
          </p>
          <ol className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {win.tabs.map((tab, position) => (
              <li
                key={position}
                data-match={isMatch(tab) || undefined}
                className="flex items-center gap-3 px-4 py-2 data-match:bg-amber-50 dark:data-match:bg-amber-500/10"
              >
                <span className="w-6 shrink-0 text-right text-xs text-zinc-400 tabular-nums">{position + 1}</span>
                <TabLabel {...tab} />
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}

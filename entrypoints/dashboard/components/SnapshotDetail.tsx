import { useQuery } from '@tanstack/react-query';
import { EyeOff, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatDay, formatTime, plural } from '@/lib/format';
import { sendMessage } from '@/lib/messages';
import { tabMatcher } from '@/lib/search';
import { countTabs } from '@/lib/tabs';
import type { RestoreRequest, WindowPlan } from '@/lib/types';
import { cn } from '../utils';
import { Button, CheckboxLabel, Notice, RECOVERY_LABELS, RecoveryBadge } from './ui';
import { WindowCard } from './WindowCard';

interface SnapshotDetailProps {
  id: number;
  highlight: string;
  restoring: boolean;
  onRestore: (request: RestoreRequest) => void;
}

export function SnapshotDetail({ id, highlight, restoring, onRestore }: SnapshotDetailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [skipAlreadyOpen, setSkipAlreadyOpen] = useState(true);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
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

  const isMatch = highlight ? tabMatcher(highlight) : () => false;
  const indexed = snapshot.windows.map((win, index) => ({ win, index }));
  const groups = [false, true].map((incognito) => ({
    incognito,
    entries: indexed.filter(({ win }) => win.incognito === incognito),
  }));

  const restore = (windows: WindowPlan[], target: RestoreRequest['target'] = 'new-window') =>
    onRestore({ windows, target, skipAlreadyOpen });

  const toggle = (key: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const restoreSelected = () => {
    restore(
      snapshot.windows.map((win, index) => ({
        incognito: win.incognito,
        tabs: win.tabs.filter((_, position) => selected.has(`${index}:${position}`)),
      })),
      'existing-window',
    );
    setSelected(new Set());
  };

  return (
    <>
      <div ref={containerRef} className="space-y-6 p-6">
        <header className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold">
                {formatDay(snapshot.createdAt)} at {formatTime(snapshot.createdAt)}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {plural(countTabs(snapshot.windows), 'tab')} in {plural(snapshot.windows.length, 'window')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 pt-0.5">
              <CheckboxLabel checked={skipAlreadyOpen} onChange={setSkipAlreadyOpen}>
                Skip tabs already open
              </CheckboxLabel>
              <Button variant="primary" onClick={() => restore(snapshot.windows)} disabled={restoring}>
                <RotateCcw className="size-3.5" aria-hidden />
                Restore all
              </Button>
            </div>
          </div>
          {snapshot.recovery && (
            <p className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <RecoveryBadge reason={snapshot.recovery} />
              {RECOVERY_LABELS[snapshot.recovery].description}
            </p>
          )}
        </header>
        {groups.map(
          ({ incognito, entries }) =>
            entries.length > 0 && (
              <section key={String(incognito)} className="space-y-3">
                <h3
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase',
                    incognito ? 'text-violet-600 dark:text-violet-300' : 'text-zinc-500 dark:text-zinc-400',
                  )}
                >
                  {incognito && <EyeOff className="size-3.5" aria-hidden />}
                  {incognito ? 'Private windows' : 'Windows'}
                </h3>
                {entries.map(({ win, index }, order) => (
                  <WindowCard
                    key={win.id}
                    win={win}
                    number={order + 1}
                    busy={restoring}
                    isMatch={isMatch}
                    isSelected={(position) => selected.has(`${index}:${position}`)}
                    onToggle={(position) => toggle(`${index}:${position}`)}
                    onRestore={() => restore([win])}
                    onOpenTab={(tab) =>
                      onRestore({
                        windows: [{ incognito: win.incognito, tabs: [tab] }],
                        target: 'existing-window',
                        skipAlreadyOpen: false,
                      })
                    }
                  />
                ))}
              </section>
            ),
        )}
      </div>
      {selected.size > 0 && (
        <div className="sticky bottom-0 flex items-center justify-between border-t border-zinc-200 bg-white/95 px-6 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
          <span className="text-sm">{plural(selected.size, 'tab')} selected</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button variant="primary" onClick={restoreSelected} disabled={restoring}>
              Restore selected
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

import { ExternalLink } from 'lucide-react';
import { plural } from '@/lib/format';
import type { TabRecord, WindowRecord } from '@/lib/types';
import { cn } from '../utils';
import { Button, TabLabel } from './ui';

interface WindowCardProps {
  win: WindowRecord;
  number: number;
  busy: boolean;
  isMatch: (tab: TabRecord) => boolean;
  isSelected: (position: number) => boolean;
  onToggle: (position: number) => void;
  onRestore: () => void;
  onOpenTab: (tab: TabRecord) => void;
}

export function WindowCard({
  win,
  number,
  busy,
  isMatch,
  isSelected,
  onToggle,
  onRestore,
  onOpenTab,
}: WindowCardProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border',
        win.incognito ? 'border-violet-200 dark:border-violet-500/30' : 'border-zinc-200 dark:border-zinc-800',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-3 py-1.5 pr-2 pl-4',
          win.incognito
            ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300'
            : 'bg-zinc-50 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400',
        )}
      >
        <p className="text-xs font-medium">
          {win.incognito ? 'Private window' : 'Window'} {number} · {plural(win.tabs.length, 'tab')}
        </p>
        <Button variant="ghost" onClick={onRestore} disabled={busy}>
          Restore window
        </Button>
      </div>
      <ol className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {win.tabs.map((tab, position) => (
          <li
            key={position}
            data-match={isMatch(tab) || undefined}
            className="group flex items-center gap-3 py-2 pr-2 pl-4 data-match:bg-amber-50 dark:data-match:bg-amber-500/10"
          >
            <input
              type="checkbox"
              checked={isSelected(position)}
              onChange={() => onToggle(position)}
              aria-label={`Select ${tab.title || tab.url}`}
              className="size-3.5 shrink-0 accent-zinc-900 dark:accent-zinc-100"
            />
            <span className="w-5 shrink-0 text-right text-xs text-zinc-400 tabular-nums">{position + 1}</span>
            <TabLabel {...tab} />
            <Button
              variant="ghost"
              onClick={() => onOpenTab(tab)}
              disabled={busy}
              aria-label="Open tab"
              title="Open tab"
              className="px-1.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ExternalLink className="size-3.5" aria-hidden />
            </Button>
          </li>
        ))}
      </ol>
    </div>
  );
}

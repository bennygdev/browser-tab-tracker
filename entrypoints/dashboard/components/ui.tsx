import { EyeOff, Pin } from 'lucide-react';
import type { ReactNode } from 'react';
import type { RecoveryReason, TabRecord } from '@/lib/types';
import { formatDay } from '../dates';

export const RECOVERY_LABELS: Record<RecoveryReason, { label: string; description: string }> = {
  'window-closed': {
    label: 'Window closed',
    description: 'Saved right before a window was closed.',
  },
  'tab-drop': {
    label: 'Tabs closed',
    description: 'Saved right before 5 or more tabs were closed at once.',
  },
  'session-end': {
    label: 'Session end',
    description: 'The last snapshot before the browser was closed or crashed.',
  },
};

export function Notice({ children }: { children: ReactNode }) {
  return <p className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">{children}</p>;
}

export function DayHeader({ time }: { time: number }) {
  return (
    <h3 className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-4 py-2 text-xs font-semibold text-zinc-700 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-300">
      {formatDay(time)}
    </h3>
  );
}

export function PrivateBadge({ count }: { count?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
      <EyeOff className="size-3" aria-hidden />
      {count === undefined ? 'Private' : `${count} private`}
    </span>
  );
}

export function RecoveryBadge({ reason }: { reason: RecoveryReason }) {
  const { label, description } = RECOVERY_LABELS[reason];
  return (
    <span
      title={description}
      className="inline-flex shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
    >
      {label}
    </span>
  );
}

export function TabLabel({ url, title, pinned }: TabRecord) {
  return (
    <div className="min-w-0 flex-1">
      <p className="flex items-center gap-1.5 text-sm text-zinc-900 dark:text-zinc-100">
        {pinned && <Pin className="size-3.5 shrink-0 text-zinc-400" aria-label="Pinned" />}
        <span className="truncate">{title || url}</span>
      </p>
      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400" title={url}>
        {url}
      </p>
    </div>
  );
}

export function LoadMoreButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <div className="p-4 text-center">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {loading ? 'Loading…' : 'Load older'}
      </button>
    </div>
  );
}

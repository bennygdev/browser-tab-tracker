import { EyeOff, Pin } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { formatDay } from '@/lib/format';
import type { RecoveryReason, TabRecord } from '@/lib/types';
import { cn } from '../utils';

export const RECOVERY_LABELS: Record<RecoveryReason, { label: string; description: string }> = {
  'window-closed': {
    label: 'Before window closed',
    description: 'Saved right before a window was closed.',
  },
  'tab-drop': {
    label: 'Before tabs closed',
    description: 'Saved right before 5 or more tabs were closed at once.',
  },
  'session-end': {
    label: 'Before browser closed',
    description: 'The last full snapshot before the browser was closed or crashed.',
  },
};

const BUTTON_VARIANTS = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300',
  secondary:
    'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800',
  ghost:
    'text-zinc-500 hover:bg-zinc-900/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100',
};

interface ButtonProps extends ComponentProps<'button'> {
  variant?: keyof typeof BUTTON_VARIANTS;
}

export function Button({ variant = 'secondary', className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium disabled:pointer-events-none disabled:opacity-50',
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

interface CheckboxLabelProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}

export function CheckboxLabel({ checked, onChange, children }: CheckboxLabelProps) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-3.5 accent-zinc-900 dark:accent-zinc-100"
      />
      {children}
    </label>
  );
}

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
      <Button variant="ghost" onClick={onClick} disabled={loading}>
        {loading ? 'Loading…' : 'Load older'}
      </Button>
    </div>
  );
}

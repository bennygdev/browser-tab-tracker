import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppWindow, Clock, EyeOff, type LucideIcon, X } from 'lucide-react';
import { formatRelative, plural } from '@/lib/format';
import { sendMessage } from '@/lib/messages';
import { countTabs } from '@/lib/tabs';
import type { LostSession, RestoreRequest, WindowPlan } from '@/lib/types';
import { cn } from '../utils';
import { Button } from './ui';

const RECENT_LIMIT = 5;

const TONES = {
  amber: 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10',
  violet: 'border-violet-200 bg-violet-50 dark:border-violet-500/30 dark:bg-violet-500/10',
  neutral: 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50',
};

interface RecentlyClosedProps {
  skipAlreadyOpen: boolean;
  restoring: boolean;
  onSelect: (snapshotId: number) => void;
  onRestore: (request: RestoreRequest) => void;
}

export function RecentlyClosed({ skipAlreadyOpen, restoring, onSelect, onRestore }: RecentlyClosedProps) {
  const queryClient = useQueryClient();
  const { data: lost } = useQuery({
    queryKey: ['lost-session'],
    queryFn: () => sendMessage('getLostSession'),
  });
  const { data: windows = [] } = useQuery({
    queryKey: ['closed-windows'],
    queryFn: () => sendMessage('getClosedWindows', RECENT_LIMIT),
  });
  const dismiss = useMutation({
    mutationFn: (snapshotId: number) => sendMessage('dismissLostSession', snapshotId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lost-session'] }),
  });

  if (!lost && windows.length === 0) return null;

  const restore = (plans: WindowPlan[]) => onRestore({ windows: plans, target: 'new-window', skipAlreadyOpen });

  return (
    <section
      aria-label="Recently closed"
      className="flex gap-3 overflow-x-auto border-b border-zinc-200 px-6 py-3 dark:border-zinc-800"
    >
      {lost && (
        <RecentCard
          tone="amber"
          icon={Clock}
          title="Last session"
          detail={describeLostSession(lost)}
          busy={restoring}
          onOpen={() => onSelect(lost.snapshotId)}
          onRestore={() => restore(lost.windows)}
          onDismiss={() => dismiss.mutate(lost.snapshotId)}
        />
      )}
      {windows.map((win) => (
        <RecentCard
          key={win.id}
          tone={win.incognito ? 'violet' : 'neutral'}
          icon={win.incognito ? EyeOff : AppWindow}
          title={win.incognito ? 'Private window' : 'Window'}
          detail={`${plural(win.tabs.length, 'tab')} · closed ${formatRelative(win.closedAt)}`}
          busy={restoring}
          onOpen={() => onSelect(win.snapshotId)}
          onRestore={() => restore([win])}
        />
      ))}
    </section>
  );
}

interface RecentCardProps {
  tone: keyof typeof TONES;
  icon: LucideIcon;
  title: string;
  detail: string;
  busy: boolean;
  onOpen: () => void;
  onRestore: () => void;
  onDismiss?: () => void;
}

function RecentCard({ tone, icon: Icon, title, detail, busy, onOpen, onRestore, onDismiss }: RecentCardProps) {
  return (
    <div className={cn('flex shrink-0 items-center gap-3 rounded-xl border py-2 pr-2 pl-3', TONES[tone])}>
      <button type="button" onClick={onOpen} className="flex items-center gap-2.5 text-left">
        <Icon className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
        <span>
          <span className="block text-sm font-medium">{title}</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">{detail}</span>
        </span>
      </button>
      <Button onClick={onRestore} disabled={busy}>
        Restore
      </Button>
      {onDismiss && (
        <Button variant="ghost" onClick={onDismiss} aria-label="Dismiss" title="Dismiss" className="px-1.5">
          <X className="size-3.5" aria-hidden />
        </Button>
      )}
    </div>
  );
}

function describeLostSession({ endedAt, windows }: LostSession) {
  const privateCount = countTabs(windows.filter((win) => win.incognito));
  const privateNote = privateCount > 0 ? ` · ${privateCount} private` : '';
  return `${plural(countTabs(windows), 'tab')} not open${privateNote} · ended ${formatRelative(endedAt)}`;
}

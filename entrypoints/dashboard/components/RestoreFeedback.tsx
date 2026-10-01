import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { plural } from '@/lib/format';
import { sendMessage } from '@/lib/messages';
import type { RestoreResult, TabEntry } from '@/lib/types';
import { Button, TabLabel } from './ui';

const AUTO_DISMISS_MS = 6000;
const COPY_LABELS = { idle: 'Copy', copied: 'Copied', failed: 'Copy failed' };

interface RestoreFeedbackProps {
  result?: RestoreResult;
  error: Error | null;
  onDismiss: () => void;
}

export function RestoreFeedback({ result, error, onDismiss }: RestoreFeedbackProps) {
  const failed = result?.failed ?? [];
  const autoDismiss = result !== undefined && failed.length === 0;

  useEffect(() => {
    if (!autoDismiss) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [autoDismiss, result, onDismiss]);

  const message = error ? `Restore failed: ${error.message}` : result && summarize(result);
  if (!message) return null;

  return (
    <div
      role="status"
      className="absolute right-4 bottom-4 z-20 w-96 space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{message}</p>
        <Button variant="ghost" onClick={onDismiss} aria-label="Dismiss" className="-m-1 px-1.5">
          <X className="size-4" aria-hidden />
        </Button>
      </div>
      {failed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Extensions can't open these pages. Paste the address into the address bar, or search for it.
          </p>
          <ul className="max-h-48 space-y-2 overflow-y-auto">
            {failed.map((tab, index) => (
              <FailedTab key={index} tab={tab} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FailedTab({ tab }: { tab: TabEntry }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const search = useMutation({ mutationFn: () => sendMessage('searchForTab', tab) });

  const copy = () =>
    navigator.clipboard.writeText(tab.url).then(
      () => setCopyState('copied'),
      () => setCopyState('failed'),
    );

  return (
    <li className="flex items-center gap-2">
      <TabLabel {...tab} />
      <Button onClick={copy}>{COPY_LABELS[copyState]}</Button>
      <Button onClick={() => search.mutate()} disabled={search.isPending}>
        Search
      </Button>
    </li>
  );
}

function summarize({ opened, skipped, failed }: RestoreResult) {
  if (opened > 0) return `Restored ${plural(opened, 'tab')}.${skipped > 0 ? ` ${skipped} already open.` : ''}`;
  if (skipped === 1) return 'That tab is already open.';
  if (skipped > 1) return `All ${skipped} tabs are already open.`;
  return failed.length > 0 ? 'None of these pages could be opened.' : 'Nothing to restore.';
}

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { plural } from '@/lib/format';
import { sendMessage } from '@/lib/messages';
import type { RestoreResult, TabEntry } from '@/lib/types';
import { Button, TabLabel, Toast } from './ui';

const COPY_LABELS = { idle: 'Copy', copied: 'Copied', failed: 'Copy failed' };

interface RestoreFeedbackProps {
  result?: RestoreResult;
  error: Error | null;
  onDismiss: () => void;
}

export function RestoreFeedback({ result, error, onDismiss }: RestoreFeedbackProps) {
  const message = error ? `Restore failed: ${error.message}` : result && summarize(result);
  if (!message) return null;

  const failed = result?.failed ?? [];

  return (
    <Toast message={message} autoDismiss={!error && failed.length === 0} onDismiss={onDismiss}>
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
    </Toast>
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

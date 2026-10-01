import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Upload } from 'lucide-react';
import { useRef } from 'react';
import { plural } from '@/lib/format';
import { sendMessage } from '@/lib/messages';
import type { ImportResult } from '@/lib/types';
import { Button } from './ui';

export function BackupActions({ onNotice }: { onNotice: (message: string) => void }) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const exportBackup = useMutation({
    mutationFn: () => sendMessage('exportBackup'),
    onSuccess: (saved) => onNotice(saved ? 'Backup saved to your downloads.' : 'Export was cancelled.'),
    onError: (error) => onNotice(`Export failed: ${error.message}`),
  });

  const importBackup = useMutation({
    mutationFn: async (file: File) => sendMessage('importBackup', await file.text()),
    onSuccess: (result) => {
      void queryClient.invalidateQueries();
      onNotice(describeImport(result));
    },
    onError: (error) => onNotice(`Import failed: ${error.message}`),
  });

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => exportBackup.mutate()}
        disabled={exportBackup.isPending}
        title="Save your whole history to a file"
      >
        <Download className="size-3.5" aria-hidden />
        Export
      </Button>
      <Button
        variant="ghost"
        onClick={() => fileInput.current?.click()}
        disabled={importBackup.isPending}
        title="Load a backup or export file"
      >
        <Upload className="size-3.5" aria-hidden />
        Import
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) importBackup.mutate(file);
          event.target.value = '';
        }}
      />
    </>
  );
}

function describeImport({ snapshots, closedTabs, closedWindows }: ImportResult) {
  if (snapshots + closedTabs + closedWindows === 0) {
    return 'Nothing new to import. Everything in this file is already here.';
  }
  const parts = [plural(snapshots, 'snapshot'), plural(closedTabs, 'closed tab'), plural(closedWindows, 'closed window')];
  return `Imported ${parts.join(', ')}.`;
}

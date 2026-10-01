import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { sendMessage } from '@/lib/messages';
import type { RestoreNotification, Settings } from '@/lib/types';
import { SETTINGS_QUERY_KEY, useSettings } from '../hooks';
import { Button, Notice } from './ui';

const NOTIFICATION_OPTIONS: { value: RestoreNotification; label: string; hint?: string }[] = [
  { value: 'always', label: 'Always' },
  {
    value: 'private',
    label: 'Only when private tabs were lost',
    hint: 'The browser can reopen normal tabs by itself, but never private ones.',
  },
  { value: 'off', label: 'Off', hint: 'Lost tabs stay in the timeline, marked Before browser closed.' },
];

const MAX_THRESHOLD = 999;

export function SettingsView({ onBack }: { onBack: () => void }) {
  const settings = useSettings();
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (changes: Partial<Settings>) => sendMessage('saveSettings', changes),
    onMutate: (changes) =>
      queryClient.setQueryData<Settings>(SETTINGS_QUERY_KEY, (current) => current && { ...current, ...changes }),
    onError: () => queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY }),
  });

  if (!settings) return <Notice>Loading…</Notice>;

  const update = (changes: Partial<Settings>) => save.mutate(changes);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="max-w-2xl space-y-8 p-6">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onBack} aria-label="Back" title="Back" className="-ml-1.5 px-1.5">
              <ArrowLeft className="size-4" aria-hidden />
            </Button>
            <h2 className="text-base font-semibold">Settings</h2>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {save.isError ? "Couldn't save your last change." : 'Changes are saved right away.'}
          </p>
        </header>

        <Section
          title="Restore notification"
          description="Shown when the browser starts and tabs from your last session are not open."
        >
          {NOTIFICATION_OPTIONS.map(({ value, label, hint }) => (
            <Choice
              key={value}
              type="radio"
              name="restore-notification"
              checked={settings.restoreNotification === value}
              onChange={() => update({ restoreNotification: value })}
              label={label}
              hint={hint}
            />
          ))}
        </Section>

        <Section title="Restoring">
          <Choice
            type="checkbox"
            checked={settings.skipAlreadyOpen}
            onChange={(skipAlreadyOpen) => update({ skipAlreadyOpen })}
            label="Skip tabs already open"
            hint="The default for every Restore button. Each snapshot can still change it."
          />
          <div className="space-y-0.5">
            <label className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              Load only the first tab of each window when restoring more than
              <ThresholdInput
                value={settings.lazyRestoreThreshold}
                onChange={(lazyRestoreThreshold) => update({ lazyRestoreThreshold })}
              />
              {settings.lazyRestoreThreshold === 1 ? 'tab' : 'tabs'}
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">The other tabs load when you click them.</p>
          </div>
        </Section>

        <Section title="Dashboard">
          <Choice
            type="checkbox"
            checked={settings.showRecentlyClosed}
            onChange={(showRecentlyClosed) => update({ showRecentlyClosed })}
            label="Show Recently closed"
            hint="Your last session and recently closed windows, above the timeline."
          />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">{title}</legend>
      {description && <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </fieldset>
  );
}

interface ChoiceProps {
  type: 'radio' | 'checkbox';
  name?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}

function Choice({ type, name, checked, onChange, label, hint }: ChoiceProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-zinc-900 dark:accent-zinc-100"
      />
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-xs text-zinc-500 dark:text-zinc-400">{hint}</span>}
      </span>
    </label>
  );
}

function ThresholdInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));

  return (
    <input
      type="number"
      min={0}
      max={MAX_THRESHOLD}
      value={draft}
      onChange={(event) => {
        const input = event.target;
        setDraft(input.value);
        if (input.value !== '' && input.validity.valid) onChange(input.valueAsNumber);
      }}
      onBlur={() => setDraft(String(value))}
      className="w-16 rounded-md border border-zinc-200 bg-transparent px-2 py-0.5 text-sm tabular-nums outline-none focus:border-zinc-400 dark:border-zinc-700 dark:focus:border-zinc-500"
    />
  );
}

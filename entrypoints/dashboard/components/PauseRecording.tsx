import { Pause, Play } from 'lucide-react';
import { Button } from './ui';

interface PauseButtonProps {
  paused: boolean;
  pending: boolean;
  onToggle: (paused: boolean) => void;
}

export function PauseButton({ paused, pending, onToggle }: PauseButtonProps) {
  const Icon = paused ? Play : Pause;
  return (
    <Button
      variant={paused ? 'warning' : 'ghost'}
      onClick={() => onToggle(!paused)}
      disabled={pending}
      title={paused ? 'Start recording your tabs again' : 'Stop recording until you resume'}
    >
      <Icon className="size-3.5" aria-hidden />
      {paused ? 'Resume' : 'Pause'}
    </Button>
  );
}

export function PausedNotice() {
  return (
    <p
      role="status"
      className="flex items-start gap-2.5 border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
    >
      <Pause className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        <span className="font-medium">Recording is paused.</span> Nothing new is saved. Pages you open now stay out of
        your history after you resume, until you close them or leave the site.
      </span>
    </p>
  );
}

import { useEffect } from 'react';
import { OVERLAY_CLOSE_MESSAGE } from '@/lib/messages';

const embedded = window.top !== window;

function close() {
  if (embedded) window.parent.postMessage(OVERLAY_CLOSE_MESSAGE, '*');
  else window.close();
}

export default function App() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const panel = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-title"
      className={`flex flex-col bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 ${
        embedded
          ? 'h-[min(80vh,720px)] w-full max-w-4xl rounded-2xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10'
          : 'h-screen w-screen'
      }`}
    >
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div>
          <h1 id="dashboard-title" className="text-lg font-semibold">
            Tab Tracker
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Your tab history, day by day</p>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-1 p-6 text-center">
        <p className="font-medium">No snapshots yet</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Your tabs will show up here once tracking is running.
        </p>
      </main>
    </div>
  );

  if (!embedded) return panel;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(event) => event.target === event.currentTarget && close()}
    >
      {panel}
    </div>
  );
}

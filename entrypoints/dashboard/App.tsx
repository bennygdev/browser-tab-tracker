import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Settings, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { sendMessage } from '@/lib/messages';
import { OVERLAY_CLOSE_MESSAGE } from '@/lib/overlay';
import type { RestoreRequest } from '@/lib/types';
import { BackupActions } from './components/BackupActions';
import { ClosedTabs } from './components/ClosedTabs';
import { RecentlyClosed } from './components/RecentlyClosed';
import { RestoreFeedback } from './components/RestoreFeedback';
import { SearchResults } from './components/SearchResults';
import { SettingsView } from './components/SettingsView';
import { SnapshotDetail } from './components/SnapshotDetail';
import { Timeline } from './components/Timeline';
import { Button, Toast } from './components/ui';
import { useDebouncedValue, useSettings } from './hooks';
import { cn } from './utils';

type View = 'timeline' | 'closed';

const VIEWS: { id: View; label: string; placeholder: string }[] = [
  { id: 'timeline', label: 'Timeline', placeholder: 'Search every tab by title or URL' },
  { id: 'closed', label: 'Closed tabs', placeholder: 'Search closed tabs' },
];

const embedded = window.top !== window;
const initialSnapshotId = Number(new URLSearchParams(location.search).get('snapshot')) || undefined;

function close() {
  if (embedded) window.parent.postMessage(OVERLAY_CLOSE_MESSAGE, '*');
  else window.close();
}

export default function App() {
  const [view, setView] = useState<View>('timeline');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(initialSnapshotId);
  const [notice, setNotice] = useState<{ id: number; message: string }>();
  const search = useDebouncedValue(query.trim(), 200);
  const settings = useSettings();
  const queryClient = useQueryClient();
  const restore = useMutation({
    mutationFn: (request: RestoreRequest) => sendMessage('restoreTabs', request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lost-session'] });
      void queryClient.invalidateQueries({ queryKey: ['closed-windows'] });
    },
  });

  const showNotice = useCallback((message: string) => setNotice({ id: Date.now(), message }), []);
  const dismissNotice = useCallback(() => setNotice(undefined), []);

  const showSnapshot = (snapshotId: number) => {
    setView('timeline');
    setQuery('');
    setSelectedId(snapshotId);
  };

  useEffect(() => {
    const controller = new AbortController();
    window.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Escape') return;
        if (settingsOpen) setSettingsOpen(false);
        else close();
      },
      { signal: controller.signal },
    );
    return () => controller.abort();
  }, [settingsOpen]);

  const panel = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-title"
      className={cn(
        'relative flex flex-col bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100',
        embedded
          ? 'h-[min(85vh,800px)] w-full max-w-5xl overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10'
          : 'h-screen w-screen',
      )}
    >
      <header className="space-y-4 border-b border-zinc-200 px-6 pt-4 pb-3 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 id="dashboard-title" className="text-lg font-semibold">
              Tab Tracker
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Your tab history, day by day</p>
          </div>
          <div className="flex items-center gap-1">
            <BackupActions onNotice={showNotice} />
            <Button
              variant="ghost"
              onClick={() => setSettingsOpen((open) => !open)}
              aria-label="Settings"
              aria-pressed={settingsOpen}
              title="Settings"
              className="px-1.5 aria-pressed:bg-zinc-900/5 aria-pressed:text-zinc-900 dark:aria-pressed:bg-white/10 dark:aria-pressed:text-zinc-100"
            >
              <Settings className="size-4" aria-hidden />
            </Button>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </div>
        {!settingsOpen && (
          <div className="flex items-center gap-3">
            <nav className="flex shrink-0 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
              {VIEWS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={view === id}
                  onClick={() => setView(id)}
                  className={cn(
                    'rounded-md px-3 py-1 text-sm font-medium',
                    view === id
                      ? 'bg-white shadow-sm dark:bg-zinc-700'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
                  )}
                >
                  {label}
                </button>
              ))}
            </nav>
            <label className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
                aria-hidden
              />
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Escape' || !query) return;
                  event.stopPropagation();
                  setQuery('');
                }}
                placeholder={VIEWS.find(({ id }) => id === view)?.placeholder}
                aria-label="Search"
                className="w-full rounded-lg border border-zinc-200 bg-transparent py-1.5 pr-3 pl-9 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:focus:border-zinc-500"
              />
            </label>
          </div>
        )}
      </header>
      {settingsOpen ? (
        <SettingsView onBack={() => setSettingsOpen(false)} />
      ) : (
        <>
          {settings?.showRecentlyClosed && (
            <RecentlyClosed
              skipAlreadyOpen={settings.skipAlreadyOpen}
              restoring={restore.isPending}
              onSelect={showSnapshot}
              onRestore={restore.mutate}
            />
          )}
          {view === 'closed' ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ClosedTabs query={search} />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1">
              <aside className="flex w-80 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
                {search ? (
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <SearchResults query={search} onSelect={setSelectedId} />
                  </div>
                ) : (
                  <Timeline selectedId={selectedId} onSelect={setSelectedId} />
                )}
              </aside>
              <main key={selectedId} className="min-w-0 flex-1 overflow-y-auto">
                {selectedId !== undefined && (
                  <SnapshotDetail
                    id={selectedId}
                    highlight={search}
                    restoring={restore.isPending}
                    onRestore={restore.mutate}
                  />
                )}
              </main>
            </div>
          )}
        </>
      )}
      <div className="absolute right-4 bottom-4 z-20 flex w-96 flex-col gap-2">
        <RestoreFeedback
          key={restore.submittedAt}
          result={restore.data}
          error={restore.error}
          onDismiss={restore.reset}
        />
        {notice && <Toast key={notice.id} message={notice.message} onDismiss={dismissNotice} />}
      </div>
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

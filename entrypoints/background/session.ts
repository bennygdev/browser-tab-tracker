import { db } from './db';

const SESSION_KEY = 'sessionId';

let pending: Promise<number> | undefined;

export function currentSessionId(): Promise<number> {
  pending ??= resolveSessionId().finally(() => {
    pending = undefined;
  });
  return pending;
}

async function resolveSessionId(): Promise<number> {
  const { [SESSION_KEY]: stored } = await browser.storage.session.get(SESSION_KEY);
  if (typeof stored === 'number') return stored;

  const id = await startSession();
  await browser.storage.session.set({ [SESSION_KEY]: id });
  return id;
}

function startSession(): Promise<number> {
  return db.transaction('rw', db.sessions, db.snapshots, async () => {
    const previous = await db.snapshots.toCollection().last();
    if (previous && !previous.recovery) {
      await db.snapshots.update(previous.id, { recovery: 'session-end' });
    }
    return db.sessions.add({ startedAt: Date.now() });
  });
}

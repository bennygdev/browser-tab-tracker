import { describe, expect, it } from 'vitest';
import { db } from '@/entrypoints/background/db';
import { currentSessionId } from '@/entrypoints/background/session';
import { restartBrowser } from './helpers';

describe('currentSessionId', () => {
  it('reuses the session until the browser restarts', async () => {
    const first = await currentSessionId();
    expect(await currentSessionId()).toBe(first);

    await restartBrowser();

    expect(await currentSessionId()).not.toBe(first);
  });

  it('creates a single session when called concurrently', async () => {
    const ids = await Promise.all([currentSessionId(), currentSessionId(), currentSessionId()]);

    expect(new Set(ids).size).toBe(1);
    expect(await db.sessions.count()).toBe(1);
  });
});

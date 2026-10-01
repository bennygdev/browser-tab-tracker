import { describe, expect, it } from 'vitest';
import { logClosedTab } from '@/entrypoints/background/closed-tabs';
import { db } from '@/entrypoints/background/db';
import { forgetTab, rememberTab, resetTabCache } from '@/entrypoints/background/tab-cache';
import { fakeTab } from './helpers';

describe('tab cache', () => {
  it('returns a remembered tab once', async () => {
    await rememberTab(fakeTab(1, 'https://a.example', { incognito: true }));

    expect(await forgetTab(1)).toEqual({
      url: 'https://a.example',
      title: 'Title of https://a.example',
      pinned: false,
      incognito: true,
    });
    expect(await forgetTab(1)).toBeUndefined();
  });

  it('drops tabs that are no longer open on reset', async () => {
    await rememberTab(fakeTab(1, 'https://a.example'));
    await rememberTab(fakeTab(2, 'https://b.example'));

    await resetTabCache([fakeTab(2, 'https://b.example')]);

    expect(await forgetTab(1)).toBeUndefined();
    expect(await forgetTab(2)).toMatchObject({ url: 'https://b.example' });
  });
});

describe('logClosedTab', () => {
  it('stores the tab with its session and close time', async () => {
    await logClosedTab({ url: 'https://a.example', title: 'A', pinned: false, incognito: true });

    const [closed] = await db.closedTabs.toArray();
    expect(closed).toMatchObject({ url: 'https://a.example', title: 'A', incognito: true });
    expect(closed?.sessionId).toBeTypeOf('number');
    expect(closed?.closedAt).toBeTypeOf('number');
  });

  it('ignores blank pages', async () => {
    await logClosedTab({ url: 'chrome://newtab/', title: 'New Tab', pinned: false, incognito: false });
    await logClosedTab({ url: 'about:newtab', title: 'New Tab', pinned: false, incognito: false });

    expect(await db.closedTabs.count()).toBe(0);
  });
});

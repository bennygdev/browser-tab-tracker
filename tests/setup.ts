import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { db } from '@/entrypoints/background/db';

beforeEach(async () => {
  fakeBrowser.reset();
  await db.delete({ disableAutoOpen: false });
});

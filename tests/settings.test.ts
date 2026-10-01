import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '@/entrypoints/background/settings';

describe('settings', () => {
  it('starts with the defaults', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps the defaults for anything not changed', async () => {
    await saveSettings({ restoreNotification: 'private' });
    await saveSettings({ lazyRestoreThreshold: 25 });

    expect(await getSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      restoreNotification: 'private',
      lazyRestoreThreshold: 25,
    });
  });
});

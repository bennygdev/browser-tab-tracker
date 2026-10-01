import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from '@/lib/debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs once after a burst of calls settles', () => {
    const callback = vi.fn();
    const schedule = debounce(callback, 1000, 5000);

    schedule();
    vi.advanceTimersByTime(500);
    schedule();
    vi.advanceTimersByTime(999);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledOnce();
  });

  it('still runs within the max delay when calls never stop', () => {
    const callback = vi.fn();
    const schedule = debounce(callback, 1000, 5000);

    for (let elapsed = 0; elapsed < 5000; elapsed += 500) {
      schedule();
      vi.advanceTimersByTime(500);
    }

    expect(callback).toHaveBeenCalledOnce();
  });
});

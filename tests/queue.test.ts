import { describe, expect, it } from 'vitest';
import { createQueue } from '@/lib/queue';

describe('createQueue', () => {
  it('runs tasks one at a time in the order they were queued', async () => {
    const queue = createQueue();
    const events: string[] = [];
    let finishFirst!: () => void;

    const first = queue(async () => {
      events.push('first start');
      await new Promise<void>((resolve) => (finishFirst = resolve));
      events.push('first end');
    });
    const second = queue(async () => {
      events.push('second start');
    });

    await Promise.resolve();
    expect(events).toEqual(['first start']);

    finishFirst();
    await Promise.all([first, second]);
    expect(events).toEqual(['first start', 'first end', 'second start']);
  });

  it('passes on each task result and keeps going after a failure', async () => {
    const queue = createQueue();

    const failed = queue(() => Promise.reject(new Error('boom')));
    const next = queue(async () => 'done');

    await expect(failed).rejects.toThrow('boom');
    await expect(next).resolves.toBe('done');
  });
});

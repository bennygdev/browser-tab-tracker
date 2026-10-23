export function createQueue() {
  let tail: Promise<unknown> = Promise.resolve();

  return <T>(task: () => Promise<T>): Promise<T> => {
    const run = tail.then(() => task());
    tail = run.catch(() => undefined);
    return run;
  };
}

export function debounce(callback: () => void, delayMs: number, maxDelayMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let firstCallAt: number | undefined;

  return () => {
    const now = Date.now();
    firstCallAt ??= now;
    clearTimeout(timer);
    timer = setTimeout(
      () => {
        firstCallAt = undefined;
        callback();
      },
      Math.min(delayMs, firstCallAt + maxDelayMs - now),
    );
  };
}

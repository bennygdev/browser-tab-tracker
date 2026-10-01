export function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export function chunkBy<T, K>(items: T[], keyOf: (item: T) => K) {
  const chunks: { key: K; items: [T, ...T[]] }[] = [];
  for (const item of items) {
    const key = keyOf(item);
    const last = chunks.at(-1);
    if (last && last.key === key) last.items.push(item);
    else chunks.push({ key, items: [item] });
  }
  return chunks;
}

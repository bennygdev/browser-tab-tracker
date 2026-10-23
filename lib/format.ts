import { DAY_MS, HOUR_MS, MINUTE_MS } from './time';

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const shortTimeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
const weekdayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long' });

export const formatDate = (time: number) => dateFormat.format(time);
export const formatTime = (time: number) => timeFormat.format(time);
export const formatShortTime = (time: number) => shortTimeFormat.format(time);
export const formatDateTime = (time: number) => `${formatDate(time)} ${formatShortTime(time)}`;

export function formatDay(time: number) {
  return `${dayName(time)} · ${formatDate(time)}`;
}

export function formatRelative(time: number) {
  const elapsed = Date.now() - time;
  if (elapsed < MINUTE_MS) return 'just now';
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)} min ago`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)} h ago`;
  return formatDateTime(time);
}

export function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function dayName(time: number) {
  const date = formatDate(time);
  if (date === formatDate(Date.now())) return 'Today';
  if (date === formatDate(Date.now() - DAY_MS)) return 'Yesterday';
  return weekdayFormat.format(time);
}

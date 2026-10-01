const DAY_MS = 24 * 60 * 60 * 1000;

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const shortTimeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
const weekdayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long' });

export const formatDate = (time: number) => dateFormat.format(time);
export const formatTime = (time: number) => timeFormat.format(time);
export const formatShortTime = (time: number) => shortTimeFormat.format(time);

export function formatDay(time: number) {
  return `${dayName(time)} · ${formatDate(time)}`;
}

function dayName(time: number) {
  const date = formatDate(time);
  if (date === formatDate(Date.now())) return 'Today';
  if (date === formatDate(Date.now() - DAY_MS)) return 'Yesterday';
  return weekdayFormat.format(time);
}

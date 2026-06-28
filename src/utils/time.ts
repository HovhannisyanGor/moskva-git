// Относительное время «5 минут назад» / «5 minutes ago» на нужном языке.
// Используем встроенный Intl.RelativeTimeFormat — он сам склоняет под локаль.
export function timeAgo(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const sec = Math.round((Date.now() - then) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (sec < 45) return rtf.format(-Math.max(0, sec), 'second');
  const min = Math.round(sec / 60);
  if (min < 60) return rtf.format(-min, 'minute');
  const hr = Math.round(min / 60);
  if (hr < 24) return rtf.format(-hr, 'hour');
  const day = Math.round(hr / 24);
  if (day < 7) return rtf.format(-day, 'day');
  // Старше недели — показываем обычную дату.
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

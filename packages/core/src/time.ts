/**
 * Minutes between two local wall-clock times at the *same* airport (so the same time zone).
 * Only valid for layovers; never use it across airports.
 */
export function minutesBetweenLocal(fromLocal: string, toLocal: string): number {
  return (Date.parse(`${toLocal}:00Z`) - Date.parse(`${fromLocal}:00Z`)) / 60_000;
}

export function localHour(local: string): number {
  return Number(local.slice(11, 13)) + Number(local.slice(14, 16)) / 60;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}m`;
}

/** UTC offset in minutes of an IANA zone at a given instant (positive east of UTC). */
export function tzOffsetMinutes(tz: string, utcMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return Math.round((asUtc - Math.floor(utcMs / 60_000) * 60_000) / 60_000);
}

/** Wall-clock local time (YYYY-MM-DDTHH:mm) in `tz` → UTC epoch ms. */
export function localToUtcMs(local: string, tz: string): number {
  const naive = Date.parse(`${local}:00Z`);
  // Two passes handle the offset changing around the instant itself (DST edges).
  let utc = naive - tzOffsetMinutes(tz, naive) * 60_000;
  utc = naive - tzOffsetMinutes(tz, utc) * 60_000;
  return utc;
}

/** UTC epoch ms → wall-clock local time (YYYY-MM-DDTHH:mm) in `tz`. */
export function utcMsToLocal(utcMs: number, tz: string): string {
  return new Date(utcMs + tzOffsetMinutes(tz, utcMs) * 60_000).toISOString().slice(0, 16);
}

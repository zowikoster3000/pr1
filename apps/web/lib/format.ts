const WEEKDAY = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** "Tue 10 Nov" from YYYY-MM-DD (calendar date, no time zone shift). */
export function formatDay(isoDate: string): string {
  return WEEKDAY.format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`)).replace(',', '');
}

export const clock = (local: string) => local.slice(11, 16);

/** Whole days between two local dates, for "+1" arrival markers. */
export function dayOffset(fromLocal: string, toLocal: string): number {
  return Math.round(
    (Date.parse(`${toLocal.slice(0, 10)}T00:00:00Z`) -
      Date.parse(`${fromLocal.slice(0, 10)}T00:00:00Z`)) /
      86_400_000,
  );
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

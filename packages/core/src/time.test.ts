import { describe, expect, it } from 'vitest';
import { formatDuration, localToUtcMs, utcMsToLocal } from './time';

describe('time zones', () => {
  it('converts local airport time to UTC and back, across DST', () => {
    // Amsterdam is UTC+2 in summer, UTC+1 in winter.
    expect(new Date(localToUtcMs('2026-07-01T10:00', 'Europe/Amsterdam')).toISOString()).toBe(
      '2026-07-01T08:00:00.000Z',
    );
    expect(new Date(localToUtcMs('2026-12-01T10:00', 'Europe/Amsterdam')).toISOString()).toBe(
      '2026-12-01T09:00:00.000Z',
    );
    expect(utcMsToLocal(Date.parse('2026-12-01T09:00:00Z'), 'America/New_York')).toBe(
      '2026-12-01T04:00',
    );
  });

  it('formats durations', () => {
    expect(formatDuration(185)).toBe('3h 05m');
    expect(formatDuration(120)).toBe('2h');
    expect(formatDuration(35)).toBe('35m');
  });
});

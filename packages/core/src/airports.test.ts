import { describe, expect, it } from 'vitest';
import { AIRPORTS, distanceKm, searchAirports } from './airports';

describe('airports', () => {
  it('has unique IATA codes and valid time zones', () => {
    expect(new Set(AIRPORTS.map((a) => a.iata)).size).toBe(AIRPORTS.length);
    for (const a of AIRPORTS) {
      expect(() => new Intl.DateTimeFormat('en', { timeZone: a.tz })).not.toThrow();
    }
  });

  it('autocompletes by code, city and accent-insensitive name', () => {
    expect(searchAirports('lis')[0]!.iata).toBe('LIS');
    expect(searchAirports('London').map((a) => a.iata)).toEqual(
      expect.arrayContaining(['LHR', 'LGW', 'STN']),
    );
    expect(searchAirports('dusseldorf')[0]!.iata).toBe('DUS');
  });

  it('computes great-circle distance', () => {
    const ams = AIRPORTS.find((a) => a.iata === 'AMS')!;
    const jfk = AIRPORTS.find((a) => a.iata === 'JFK')!;
    expect(distanceKm(ams, jfk)).toBeGreaterThan(5800);
    expect(distanceKm(ams, jfk)).toBeLessThan(5900);
  });
});

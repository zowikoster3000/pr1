import { describe, expect, it } from 'vitest';
import { contextFor, dealScore, layovers } from './score';
import { makeOffer } from './testing';

const direct = makeOffer(100, [[['KL1001', 'AMS', 'LIS', '2026-11-10T09:00', '2026-11-10T12:00']]]);
const oneStop = makeOffer(80, [
  [
    ['LH200', 'AMS', 'FRA', '2026-11-10T07:00', '2026-11-10T08:10'],
    ['LH300', 'FRA', 'LIS', '2026-11-10T09:00', '2026-11-10T12:30'],
  ],
]);

describe('dealScore', () => {
  it('gives full price points to the cheapest offer and explains why', () => {
    const ctx = contextFor([direct, oneStop]);
    const s = dealScore(oneStop, ctx);
    const price = s.items.find((i) => i.key === 'price')!;
    expect(price.points).toBe(40);
    expect(price.note).toBe('Cheapest result');
  });

  it('a direct flight at the same price beats a one-stop', () => {
    const cheapDirect = makeOffer(
      80,
      direct.slices.map((s) =>
        s.segments.map(
          (g) =>
            [
              `${g.carrierCode}${g.flightNumber}`,
              g.origin,
              g.destination,
              g.departLocal,
              g.arriveLocal,
            ] as [string, string, string, string, string],
        ),
      ),
    );
    const ctx = contextFor([cheapDirect, oneStop]);
    expect(dealScore(cheapDirect, ctx).score).toBeGreaterThan(dealScore(oneStop, ctx).score);
  });

  it('stays within 0..100 and items sum to the score', () => {
    const ctx = contextFor([direct, oneStop]);
    for (const o of [direct, oneStop]) {
      const s = dealScore(o, ctx);
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100);
      expect(Math.abs(s.items.reduce((a, i) => a + i.points, 0) - s.score)).toBeLessThan(1);
    }
  });

  it('rewards fares well below the historical median', () => {
    const ctx = contextFor([direct], 25_000);
    const value = dealScore(direct, ctx).items.find((i) => i.key === 'value')!;
    expect(value.points).toBe(20);
    expect(value.note).toBe('60% below typical');
  });

  it('penalises separate tickets', () => {
    const risky = { ...direct, separateTickets: true };
    const ctx = contextFor([direct, risky]);
    expect(dealScore(risky, ctx).score).toBe(dealScore(direct, ctx).score - 10);
  });

  it('flags tight connections, airport changes and early departures', () => {
    const bad = makeOffer(80, [
      [
        ['U21', 'AMS', 'LGW', '2026-11-10T05:30', '2026-11-10T05:40'],
        ['FR2', 'STN', 'LIS', '2026-11-10T06:10', '2026-11-10T09:00'],
      ],
    ]);
    const s = dealScore(bad, contextFor([bad]));
    const stops = s.items.find((i) => i.key === 'stops')!;
    expect(stops.note).toContain('airport change at LGW');
    expect(stops.note).toContain('tight 30 min connection');
    expect(s.items.find((i) => i.key === 'schedule')!.note).toContain('early departure 05:30');
  });
});

describe('layovers', () => {
  it('detects overnight layovers', () => {
    const o = makeOffer(50, [
      [
        ['TK1', 'AMS', 'IST', '2026-11-10T20:00', '2026-11-11T00:30'],
        ['TK2', 'IST', 'DXB', '2026-11-11T07:00', '2026-11-11T11:00'],
      ],
    ]);
    expect(layovers(o.slices[0]!)).toEqual([
      { airport: 'IST', minutes: 390, airportChange: false, overnight: true },
    ]);
  });
});

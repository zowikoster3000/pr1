import { describe, expect, it } from 'vitest';
import { itineraryKey, OfferSet } from './dedupe';
import { makeOffer } from './testing';

const legs: [string, string, string, string, string][][] = [
  [['KL1001', 'AMS', 'LIS', '2026-11-10T09:00', '2026-11-10T12:00']],
];

describe('OfferSet', () => {
  it('keeps the cheapest offer per itinerary', () => {
    const set = new OfferSet();
    expect(set.add(makeOffer(120, legs, { providerId: 'a' }))).toBe(true);
    expect(set.add(makeOffer(150, legs, { providerId: 'b' }))).toBe(false);
    expect(set.add(makeOffer(99, legs, { providerId: 'c' }))).toBe(true);
    expect(set.size).toBe(1);
    expect(set.values()[0]!.providerId).toBe('c');
  });

  it('treats different flights as different itineraries', () => {
    const other = makeOffer(120, [
      [['KL1003', 'AMS', 'LIS', '2026-11-10T15:00', '2026-11-10T18:00']],
    ]);
    expect(itineraryKey(other)).not.toBe(itineraryKey(makeOffer(120, legs)));
  });
});

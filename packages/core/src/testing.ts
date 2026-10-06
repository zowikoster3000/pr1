import type { Offer, Segment } from './schema';

/** Test helper: builds an offer from compact segment tuples. */
export function makeOffer(
  price: number,
  slices: [string, string, string, string, string][][],
  extra: Partial<Offer> = {},
): Offer {
  return {
    id: `o-${price}-${Math.random().toString(36).slice(2)}`,
    providerId: 'test',
    price: { amountMinor: price * 100, currency: 'EUR' },
    separateTickets: false,
    returnSelectedAtProvider: false,
    deepLink: 'https://www.google.com/travel/flights',
    fetchedAt: '2026-10-06T10:00:00.000Z',
    slices: slices.map((segs) => {
      const segments: Segment[] = segs.map(([flight, origin, destination, dep, arr]) => ({
        carrierCode: flight.slice(0, 2),
        carrierName: flight.slice(0, 2),
        flightNumber: flight.slice(2),
        origin,
        destination,
        departLocal: dep,
        arriveLocal: arr,
        durationMinutes: Math.max(1, (Date.parse(`${arr}:00Z`) - Date.parse(`${dep}:00Z`)) / 60000),
      }));
      const first = segments[0]!;
      const last = segments[segments.length - 1]!;
      return {
        segments,
        durationMinutes:
          (Date.parse(`${last.arriveLocal}:00Z`) - Date.parse(`${first.departLocal}:00Z`)) / 60000,
      };
    }),
    ...extra,
  };
}

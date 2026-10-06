import type { Offer } from './schema';

/** Same flights in the same order = same itinerary, regardless of which provider sold it. */
export function itineraryKey(offer: Offer): string {
  return offer.slices
    .map((s) =>
      s.segments.map((g) => `${g.carrierCode}${g.flightNumber}@${g.departLocal}`).join('>'),
    )
    .join('|');
}

/**
 * Keeps the cheapest offer per itinerary. Offers in other currencies are kept separate
 * because comparing them needs an FX rate we don't have here.
 */
export class OfferSet {
  private readonly byKey = new Map<string, Offer>();

  /** Returns true when the offer was added or replaced a more expensive duplicate. */
  add(offer: Offer): boolean {
    const key = `${offer.price.currency}:${itineraryKey(offer)}`;
    const existing = this.byKey.get(key);
    if (existing && existing.price.amountMinor <= offer.price.amountMinor) return false;
    this.byKey.set(key, offer);
    return true;
  }

  get size(): number {
    return this.byKey.size;
  }

  values(): Offer[] {
    return [...this.byKey.values()];
  }
}

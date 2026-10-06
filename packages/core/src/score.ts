import type { Offer, Slice } from './schema';
import { localHour, minutesBetweenLocal } from './time';

export interface ScoreContext {
  /** Cheapest price in the current result set, in minor units. */
  cheapestMinor: number;
  /** Typical price for this route (historical median, or the result-set median as fallback). */
  medianMinor: number;
  /** Shortest average slice duration in the current result set. */
  fastestMinutes: number;
}

export interface ScoreItem {
  key: 'price' | 'value' | 'duration' | 'stops' | 'schedule' | 'risk';
  label: string;
  points: number;
  max: number;
  note: string;
}

export interface DealScore {
  score: number;
  items: ScoreItem[];
}

export const MIN_TIGHT_LAYOVER = 50;
export const MAX_COMFORTABLE_LAYOVER = 6 * 60;

export interface Layover {
  airport: string;
  minutes: number;
  airportChange: boolean;
  overnight: boolean;
}

export function layovers(slice: Slice): Layover[] {
  const result: Layover[] = [];
  for (let i = 1; i < slice.segments.length; i++) {
    const prev = slice.segments[i - 1]!;
    const next = slice.segments[i]!;
    const arriveH = localHour(prev.arriveLocal);
    const minutes = minutesBetweenLocal(prev.arriveLocal, next.departLocal);
    result.push({
      airport: prev.destination,
      minutes,
      airportChange: prev.destination !== next.origin,
      // Arrival day differs from departure day, or the wait covers 01:00–05:00.
      overnight:
        prev.arriveLocal.slice(0, 10) !== next.departLocal.slice(0, 10) ||
        (arriveH < 5 && minutes > 120),
    });
  }
  return result;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

export function averageSliceMinutes(offer: Offer): number {
  return offer.slices.reduce((s, sl) => s + sl.durationMinutes, 0) / offer.slices.length;
}

/**
 * Explainable 0–100 score. Each item says how many points it contributed and why,
 * so the UI can show the breakdown verbatim.
 */
export function dealScore(offer: Offer, ctx: ScoreContext): DealScore {
  const price = offer.price.amountMinor;
  const items: ScoreItem[] = [];

  // 1. Price vs the cheapest result (40).
  const priceRatio = price === 0 ? 1 : ctx.cheapestMinor / price;
  items.push({
    key: 'price',
    label: 'Price',
    max: 40,
    points: round1(40 * clamp(priceRatio, 0, 1)),
    note:
      price <= ctx.cheapestMinor
        ? 'Cheapest result'
        : `${Math.round((price / ctx.cheapestMinor - 1) * 100)}% above cheapest`,
  });

  // 2. Price vs typical price for the route (20). ≤60% of median = full marks, ≥120% = none.
  const vsMedian = ctx.medianMinor > 0 ? price / ctx.medianMinor : 1;
  items.push({
    key: 'value',
    label: 'Value',
    max: 20,
    points: round1(20 * clamp((1.2 - vsMedian) / 0.6, 0, 1)),
    note:
      vsMedian < 1
        ? `${Math.round((1 - vsMedian) * 100)}% below typical`
        : vsMedian > 1
          ? `${Math.round((vsMedian - 1) * 100)}% above typical`
          : 'Typical price',
  });

  // 3. Duration vs fastest (20).
  const avg = averageSliceMinutes(offer);
  const durRatio = avg === 0 ? 1 : ctx.fastestMinutes / avg;
  items.push({
    key: 'duration',
    label: 'Duration',
    max: 20,
    points: round1(20 * clamp(durRatio, 0, 1)),
    note:
      avg <= ctx.fastestMinutes
        ? 'Fastest result'
        : `${Math.round(avg - ctx.fastestMinutes)} min slower than fastest`,
  });

  // 4. Stops and layover quality (15).
  const maxStops = Math.max(...offer.slices.map((s) => s.segments.length - 1));
  let stopPoints = maxStops === 0 ? 15 : maxStops === 1 ? 9 : 3;
  const notes: string[] = [
    maxStops === 0 ? 'Direct' : `${maxStops} stop${maxStops > 1 ? 's' : ''}`,
  ];
  for (const lo of offer.slices.flatMap(layovers)) {
    if (lo.airportChange) {
      stopPoints -= 4;
      notes.push(`airport change at ${lo.airport}`);
    }
    if (lo.minutes < MIN_TIGHT_LAYOVER) {
      stopPoints -= 3;
      notes.push(`tight ${lo.minutes} min connection`);
    } else if (lo.minutes > MAX_COMFORTABLE_LAYOVER) {
      stopPoints -= 3;
      notes.push(`long ${Math.round(lo.minutes / 60)}h layover`);
    }
    if (lo.overnight) {
      stopPoints -= 2;
      notes.push('overnight layover');
    }
  }
  items.push({
    key: 'stops',
    label: 'Stops',
    max: 15,
    points: round1(clamp(stopPoints, 0, 15)),
    note: notes.join(', '),
  });

  // 5. Schedule (5): penalise departures before 06:00 and arrivals after 23:30.
  let schedule = 5;
  const schedNotes: string[] = [];
  const perSlice = 5 / offer.slices.length / 2;
  for (const s of offer.slices) {
    const first = s.segments[0]!;
    const last = s.segments[s.segments.length - 1]!;
    if (localHour(first.departLocal) < 6) {
      schedule -= perSlice;
      schedNotes.push(`early departure ${first.departLocal.slice(11)}`);
    }
    const arr = localHour(last.arriveLocal);
    if (arr >= 23.5 || arr < 5) {
      schedule -= perSlice;
      schedNotes.push(`late arrival ${last.arriveLocal.slice(11)}`);
    }
  }
  items.push({
    key: 'schedule',
    label: 'Schedule',
    max: 5,
    points: round1(clamp(schedule, 0, 5)),
    note: schedNotes.length ? schedNotes.join(', ') : 'Sociable times',
  });

  // 6. Risk: separate tickets are a penalty, not a bonus.
  items.push({
    key: 'risk',
    label: 'Risk',
    max: 0,
    points: offer.separateTickets ? -10 : 0,
    note: offer.separateTickets
      ? 'Separate tickets — a missed connection is your risk'
      : 'Single ticket',
  });

  const score = Math.round(
    clamp(
      items.reduce((s, i) => s + i.points, 0),
      0,
      100,
    ),
  );
  return { score, items };
}

/** Builds the scoring context from a result set. `historicalMedianMinor` wins when known. */
export function contextFor(offers: readonly Offer[], historicalMedianMinor?: number): ScoreContext {
  if (offers.length === 0) throw new Error('contextFor needs at least one offer');
  const prices = offers.map((o) => o.price.amountMinor).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  const setMedian =
    prices.length % 2 ? prices[mid]! : Math.round((prices[mid - 1]! + prices[mid]!) / 2);
  return {
    cheapestMinor: prices[0]!,
    medianMinor: historicalMedianMinor ?? setMedian,
    fastestMinutes: Math.min(...offers.map(averageSliceMinutes)),
  };
}

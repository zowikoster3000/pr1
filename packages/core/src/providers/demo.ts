import { airportByIata, distanceKm, type Airport } from '../airports';
import type { FareProvider } from '../provider';
import type { Offer, SearchQuery, Segment, Slice } from '../schema';
import { localToUtcMs, utcMsToLocal } from '../time';

/**
 * Deterministic synthetic fares so the product can be built and tested without API keys.
 * Clearly labelled "Demo data" in the UI; disabled automatically when a real provider is configured.
 */

const CARRIERS = [
  { code: 'KL', name: 'KLM', hub: 'AMS', lowCost: false },
  { code: 'LH', name: 'Lufthansa', hub: 'FRA', lowCost: false },
  { code: 'AF', name: 'Air France', hub: 'CDG', lowCost: false },
  { code: 'BA', name: 'British Airways', hub: 'LHR', lowCost: false },
  { code: 'IB', name: 'Iberia', hub: 'MAD', lowCost: false },
  { code: 'LX', name: 'SWISS', hub: 'ZRH', lowCost: false },
  { code: 'TK', name: 'Turkish Airlines', hub: 'IST', lowCost: false },
  { code: 'EK', name: 'Emirates', hub: 'DXB', lowCost: false },
  { code: 'QR', name: 'Qatar Airways', hub: 'DOH', lowCost: false },
  { code: 'U2', name: 'easyJet', hub: 'LGW', lowCost: true },
  { code: 'FR', name: 'Ryanair', hub: 'STN', lowCost: true },
  { code: 'VY', name: 'Vueling', hub: 'BCN', lowCost: true },
] as const;

const CABIN_MULTIPLIER = { economy: 1, premium_economy: 1.7, business: 3.6, first: 6 } as const;

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Block time: cruise at ~780 km/h plus 35 min taxi/climb, rounded to 5 minutes. */
const flightMinutes = (a: Airport, b: Airport) =>
  Math.round(((distanceKm(a, b) / 780) * 60 + 35) / 5) * 5;

function segment(
  carrier: (typeof CARRIERS)[number],
  from: Airport,
  to: Airport,
  departUtc: number,
  rnd: () => number,
): Segment {
  const minutes = flightMinutes(from, to);
  return {
    carrierCode: carrier.code,
    carrierName: carrier.name,
    flightNumber: String(100 + Math.floor(rnd() * 8900)),
    origin: from.iata,
    destination: to.iata,
    departLocal: utcMsToLocal(departUtc, from.tz),
    arriveLocal: utcMsToLocal(departUtc + minutes * 60_000, to.tz),
    durationMinutes: minutes,
  };
}

function buildSlice(
  from: Airport,
  to: Airport,
  date: string,
  rnd: () => number,
  carrier: (typeof CARRIERS)[number],
): Slice {
  const depHour = 5 + Math.floor(rnd() * 17);
  const depMin = [0, 10, 25, 35, 45, 55][Math.floor(rnd() * 6)]!;
  const departLocal = `${date}T${String(depHour).padStart(2, '0')}:${String(depMin).padStart(2, '0')}`;
  const start = localToUtcMs(departLocal, from.tz);
  const hub = airportByIata(carrier.hub);
  const direct = !hub || hub.iata === from.iata || hub.iata === to.iata || rnd() < 0.3;

  if (direct) {
    const s = segment(carrier, from, to, start, rnd);
    return { segments: [s], durationMinutes: s.durationMinutes };
  }
  const first = segment(carrier, from, hub, start, rnd);
  const layover = [35, 55, 80, 110, 150, 240, 420][Math.floor(rnd() * 7)]!;
  const secondStart = start + (first.durationMinutes + layover) * 60_000;
  const second = segment(carrier, hub, to, secondStart, rnd);
  return {
    segments: [first, second],
    durationMinutes: first.durationMinutes + layover + second.durationMinutes,
  };
}

export function demoOffers(query: SearchQuery, now = new Date()): Offer[] {
  const from = airportByIata(query.origin);
  const to = airportByIata(query.destination);
  if (!from || !to) return [];
  const rnd = mulberry32(hash(JSON.stringify(query)));
  const km = distanceKm(from, to);
  const base = (35 + km * 0.075) * CABIN_MULTIPLIER[query.cabin];
  const carriers = CARRIERS.filter((c) => !c.lowCost || km < 3000);
  const count = 14 + Math.floor(rnd() * 10);
  const deepLink = `https://www.google.com/travel/flights?q=${encodeURIComponent(
    `Flights from ${query.origin} to ${query.destination} on ${query.departDate}${
      query.returnDate ? ` returning ${query.returnDate}` : ''
    }`,
  )}`;

  const offers: Offer[] = [];
  for (let i = 0; i < count; i++) {
    const carrier = carriers[Math.floor(rnd() * carriers.length)]!;
    const slices = [buildSlice(from, to, query.departDate, rnd, carrier)];
    if (query.returnDate) slices.push(buildSlice(to, from, query.returnDate, rnd, carrier));
    const stops = slices.reduce((s, sl) => s + sl.segments.length - 1, 0);
    const jitter = 0.65 + rnd() * 0.9 - stops * 0.08 - (carrier.lowCost ? 0.25 : 0);
    const legs = query.returnDate ? 1.8 : 1;
    const perPax = Math.max(19, Math.round(base * jitter * legs));
    // ~1 in 12 offers is a "mistake fare" so the anomaly UI has something to show.
    const amount = rnd() < 0.08 ? Math.round(perPax * 0.4) : perPax;
    offers.push({
      id: `demo-${hash(`${i}:${JSON.stringify(slices)}`).toString(36)}`,
      providerId: 'demo',
      slices,
      price: { amountMinor: amount * query.adults * 100, currency: query.currency },
      separateTickets: false,
      returnSelectedAtProvider: false,
      deepLink,
      fetchedAt: now.toISOString(),
    });
  }
  return offers;
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(signal.reason);
      },
      { once: true },
    );
  });

export function createDemoProvider(opts: { latencyMs?: number } = {}): FareProvider {
  const latency = opts.latencyMs ?? 250;
  return {
    id: 'demo',
    label: 'Demo data',
    allowedHosts: ['www.google.com'],
    async *search(query, signal) {
      const offers = demoOffers(query);
      // Stream in a few batches to exercise the real-time UI.
      for (let i = 0; i < offers.length; i++) {
        if (i % 5 === 0 && latency > 0) await sleep(latency, signal);
        yield offers[i]!;
      }
    },
    async health() {
      return { ok: true };
    },
  };
}

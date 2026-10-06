import { z } from 'zod';
import { toMinor } from '../money';
import type { FareProvider } from '../provider';
import type { Offer, SearchQuery, Segment } from '../schema';

/**
 * Google Flights results via SerpApi (https://serpapi.com/google-flights-api).
 * Source: official paid API — no scraping by us. Terms checked: 2026-10-06; re-check before launch.
 * Each search costs one SerpApi credit, so results must be cached (Phase 2).
 *
 * Round trips: SerpApi returns outbound options with the round-trip total price; the return
 * flight is chosen on Google Flights. We mark those offers with `returnSelectedAtProvider`.
 */

const AirportTime = z.object({ id: z.string(), time: z.string() });
const Flight = z.object({
  departure_airport: AirportTime,
  arrival_airport: AirportTime,
  duration: z.number(),
  airline: z.string(),
  flight_number: z.string(),
});
const Itinerary = z.object({
  flights: z.array(Flight).min(1),
  total_duration: z.number(),
  price: z.number().optional(),
});
export const SerpApiResponseSchema = z.object({
  search_metadata: z.object({ google_flights_url: z.url().optional() }).optional(),
  best_flights: z.array(Itinerary).optional(),
  other_flights: z.array(Itinerary).optional(),
  error: z.string().optional(),
});
export type SerpApiResponse = z.infer<typeof SerpApiResponseSchema>;

const TRAVEL_CLASS = { economy: '1', premium_economy: '2', business: '3', first: '4' } as const;

export function serpApiUrl(query: SearchQuery, apiKey: string): URL {
  const url = new URL('https://serpapi.com/search.json');
  const p = url.searchParams;
  p.set('engine', 'google_flights');
  p.set('departure_id', query.origin);
  p.set('arrival_id', query.destination);
  p.set('outbound_date', query.departDate);
  if (query.returnDate) p.set('return_date', query.returnDate);
  p.set('type', query.returnDate ? '1' : '2');
  p.set('adults', String(query.adults));
  p.set('travel_class', TRAVEL_CLASS[query.cabin]);
  p.set('currency', query.currency);
  p.set('hl', 'en');
  p.set('api_key', apiKey);
  return url;
}

const toLocal = (t: string) => t.replace(' ', 'T').slice(0, 16);

function mapSegment(f: z.infer<typeof Flight>): Segment {
  const [code = '', ...rest] = f.flight_number.trim().split(/\s+/);
  return {
    carrierCode: code,
    carrierName: f.airline,
    flightNumber: rest.join('') || f.flight_number,
    origin: f.departure_airport.id,
    destination: f.arrival_airport.id,
    departLocal: toLocal(f.departure_airport.time),
    arriveLocal: toLocal(f.arrival_airport.time),
    durationMinutes: f.duration,
  };
}

export function mapSerpApi(body: SerpApiResponse, query: SearchQuery, now = new Date()): Offer[] {
  const fallbackLink = `https://www.google.com/travel/flights?q=${encodeURIComponent(
    `Flights from ${query.origin} to ${query.destination} on ${query.departDate}`,
  )}`;
  const deepLink = body.search_metadata?.google_flights_url ?? fallbackLink;
  const all = [...(body.best_flights ?? []), ...(body.other_flights ?? [])];
  return all
    .filter((it): it is typeof it & { price: number } => typeof it.price === 'number')
    .map((it, i) => {
      const segments = it.flights.map(mapSegment);
      return {
        id: `serpapi-${i}-${segments.map((s) => s.carrierCode + s.flightNumber).join('-')}`,
        providerId: 'serpapi',
        slices: [{ segments, durationMinutes: it.total_duration }],
        price: { amountMinor: toMinor(it.price), currency: query.currency },
        separateTickets: false,
        returnSelectedAtProvider: Boolean(query.returnDate),
        deepLink,
        fetchedAt: now.toISOString(),
      };
    });
}

export function createSerpApiProvider(opts: {
  apiKey: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}): FareProvider {
  const doFetch = opts.fetch ?? fetch;
  return {
    id: 'serpapi',
    label: 'Google Flights',
    allowedHosts: ['serpapi.com', 'www.google.com'],
    async *search(query, signal) {
      const res = await doFetch(serpApiUrl(query, opts.apiKey), {
        signal: AbortSignal.any([signal, AbortSignal.timeout(opts.timeoutMs ?? 20_000)]),
        headers: { accept: 'application/json' },
        redirect: 'error',
      });
      if (!res.ok) throw new Error(`SerpApi responded ${res.status}`);
      const body = SerpApiResponseSchema.parse(await res.json());
      if (body.error) {
        // "No results" is reported as an error by SerpApi; treat it as an empty result.
        if (/no results/i.test(body.error)) return;
        throw new Error(`SerpApi: ${body.error}`);
      }
      yield* mapSerpApi(body, query);
    },
    async health() {
      return { ok: opts.apiKey.length > 0, detail: opts.apiKey ? undefined : 'Missing API key' };
    },
  };
}

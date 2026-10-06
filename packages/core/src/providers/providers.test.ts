import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { OfferSchema, SearchQuerySchema } from '../schema';
import { searchAll } from '../search';
import type { FareProvider } from '../provider';
import { createDemoProvider, demoOffers } from './demo';
import { createSerpApiProvider, mapSerpApi, SerpApiResponseSchema, serpApiUrl } from './serpapi';

const query = SearchQuerySchema.parse({
  origin: 'ams',
  destination: 'LIS',
  departDate: '2026-11-10',
  adults: '2',
});

const fixture = JSON.parse(
  readFileSync(new URL('../__fixtures__/serpapi-ams-lis.json', import.meta.url), 'utf8'),
);

describe('demo provider', () => {
  it('is deterministic and produces valid offers', () => {
    const a = demoOffers(query, new Date(0));
    expect(a).toEqual(demoOffers(query, new Date(0)));
    expect(a.length).toBeGreaterThan(10);
    for (const o of a) {
      expect(() => OfferSchema.parse(o)).not.toThrow();
      expect(o.slices[0]!.segments[0]!.origin).toBe('AMS');
      expect(o.slices[0]!.segments.at(-1)!.destination).toBe('LIS');
    }
  });

  it('adds a return slice for round trips', () => {
    const rt = demoOffers({ ...query, returnDate: '2026-11-17' });
    expect(rt.every((o) => o.slices.length === 2)).toBe(true);
  });
});

describe('SerpApi provider', () => {
  it('builds the request URL', () => {
    const url = serpApiUrl({ ...query, returnDate: '2026-11-17', cabin: 'business' }, 'k');
    expect(url.hostname).toBe('serpapi.com');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      engine: 'google_flights',
      departure_id: 'AMS',
      arrival_id: 'LIS',
      type: '1',
      travel_class: '3',
      adults: '2',
    });
  });

  it('maps the documented response shape to valid offers (skipping unpriced ones)', () => {
    const offers = mapSerpApi(SerpApiResponseSchema.parse(fixture), query);
    expect(offers).toHaveLength(2);
    for (const o of offers) expect(() => OfferSchema.parse(o)).not.toThrow();
    expect(offers[1]).toMatchObject({
      price: { amountMinor: 9800, currency: 'EUR' },
      slices: [{ durationMinutes: 310 }],
    });
    expect(offers[1]!.slices[0]!.segments[1]).toMatchObject({
      carrierCode: 'IB',
      flightNumber: '3102',
      origin: 'MAD',
      departLocal: '2026-11-10T10:00',
    });
  });

  it('streams offers through fetch and surfaces HTTP errors', async () => {
    const ok = createSerpApiProvider({
      apiKey: 'k',
      fetch: vi.fn(async () => new Response(JSON.stringify(fixture))),
    });
    const got = [];
    for await (const o of ok.search(query, new AbortController().signal)) got.push(o);
    expect(got).toHaveLength(2);

    const bad = createSerpApiProvider({
      apiKey: 'k',
      fetch: vi.fn(async () => new Response('nope', { status: 401 })),
    });
    await expect(
      bad.search(query, new AbortController().signal)[Symbol.asyncIterator]().next(),
    ).rejects.toThrow('401');
  });
});

describe('searchAll', () => {
  it('merges providers, dedupes, and reports provider errors without failing the search', async () => {
    const failing: FareProvider = {
      id: 'broken',
      label: 'Broken',
      allowedHosts: [],
      // eslint-disable-next-line require-yield
      async *search() {
        throw new Error('boom');
      },
      health: async () => ({ ok: false }),
    };
    const events = [];
    for await (const e of searchAll(
      [createDemoProvider({ latencyMs: 0 }), createDemoProvider({ latencyMs: 0 }), failing],
      query,
      new AbortController().signal,
    ))
      events.push(e);

    const offers = events.flatMap((e) => (e.type === 'offers' ? e.offers : []));
    expect(new Set(offers.map((o) => o.id)).size).toBe(offers.length);
    expect(offers.length).toBe(demoOffers(query).length);
    expect(events).toContainEqual({
      type: 'provider-error',
      providerId: 'broken',
      message: 'boom',
    });
    expect(events.at(-1)).toEqual({ type: 'done', total: offers.length });
  });

  it('drops offers whose deep link is not on the provider allow-list', async () => {
    const evil: FareProvider = {
      ...createDemoProvider({ latencyMs: 0 }),
      id: 'evil',
      allowedHosts: ['example.com'],
    };
    const onInvalid = vi.fn();
    const events = [];
    for await (const e of searchAll([evil], query, new AbortController().signal, { onInvalid }))
      events.push(e);
    expect(events).toEqual([{ type: 'done', total: 0 }]);
    expect(onInvalid).toHaveBeenCalled();
  });
});

'use client';

import {
  contextFor,
  dealScore,
  formatDuration,
  formatMoney,
  layovers,
  type DealScore,
  type Offer,
  type SearchQuery,
  type Slice,
} from '@lowfare/core';
import { useEffect, useMemo, useState } from 'react';
import { clock, dayOffset } from '@/lib/format';
import { SseParser } from '@/lib/sse';

type Status = 'loading' | 'done' | 'error';
type Sort = 'score' | 'price' | 'duration';
type StopsFilter = 'any' | '0' | '1';

interface Scored {
  offer: Offer;
  score: DealScore;
  anomaly: boolean;
}

/** Fares below this share of the result-set median get flagged as possible mistake fares. */
const ANOMALY_RATIO = 0.55;

export function Results({ query }: { query: SearchQuery }) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string>();
  const [sources, setSources] = useState<{ id: string; label: string }[]>([]);
  const [failed, setFailed] = useState<string[]>([]);
  const [checkedAt, setCheckedAt] = useState<Date>();
  const [sort, setSort] = useState<Sort>('score');
  const [stops, setStops] = useState<StopsFilter>('any');
  const [limit, setLimit] = useState(20);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined) p.set(k, String(v));
    return p.toString();
  }, [query]);

  useEffect(() => {
    // The parent keys this component by query, so state starts fresh for every search.
    const controller = new AbortController();

    (async () => {
      const res = await fetch(`/api/search?${qs}`, { signal: controller.signal });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Search failed (${res.status})`);
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      const parser = new SseParser();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        for (const m of parser.push(value)) {
          const data = JSON.parse(m.data);
          if (m.event === 'meta') setSources(data.providers);
          else if (m.event === 'offers') setOffers((prev) => [...prev, ...data.offers]);
          else if (m.event === 'provider-error') setFailed((f) => [...f, data.providerId]);
          else if (m.event === 'done') {
            setStatus('done');
            setCheckedAt(new Date());
          }
        }
      }
      setStatus((s) => (s === 'loading' ? 'done' : s));
    })().catch((err: unknown) => {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Search failed');
      setStatus('error');
    });

    return () => controller.abort();
  }, [qs]);

  const scored = useMemo<Scored[]>(() => {
    if (offers.length === 0) return [];
    const ctx = contextFor(offers);
    return offers.map((offer) => ({
      offer,
      score: dealScore(offer, ctx),
      anomaly: offer.price.amountMinor < ctx.medianMinor * ANOMALY_RATIO,
    }));
  }, [offers]);

  const visible = useMemo(() => {
    const maxStops = (o: Offer) => Math.max(...o.slices.map((s) => s.segments.length - 1));
    const filtered = scored.filter((r) => stops === 'any' || maxStops(r.offer) <= Number(stops));
    const key: Record<Sort, (r: Scored) => number> = {
      score: (r) => -r.score.score,
      price: (r) => r.offer.price.amountMinor,
      duration: (r) => r.offer.slices.reduce((s, sl) => s + sl.durationMinutes, 0),
    };
    return filtered.sort(
      (a, b) =>
        key[sort](a) - key[sort](b) || a.offer.price.amountMinor - b.offer.price.amountMinor,
    );
  }, [scored, sort, stops]);

  const isDemo = sources.some((s) => s.id === 'demo');

  return (
    <section aria-labelledby="results-heading" className="relative">
      <div className="h-px overflow-hidden bg-line" aria-hidden>
        {status === 'loading' && <div className="progress-bar h-px w-2/5 bg-fg" />}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-3 py-4">
        <h2 id="results-heading" className="text-sm">
          <span aria-live="polite" className="nums font-semibold">
            {status === 'loading'
              ? `Searching… ${scored.length} found`
              : `${visible.length} of ${scored.length} results`}
          </span>
          {checkedAt && (
            <span className="ml-2 text-fg-3">
              · checked{' '}
              {checkedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {sources.length > 0 && (
            <span className="ml-2 text-fg-3">· via {sources.map((s) => s.label).join(', ')}</span>
          )}
        </h2>
        <div className="flex w-full flex-wrap gap-2 text-sm sm:w-auto sm:gap-4">
          <Segmented
            label="Sort"
            value={sort}
            onChange={setSort}
            options={[
              ['score', 'Best deal'],
              ['price', 'Cheapest'],
              ['duration', 'Fastest'],
            ]}
          />
          <Segmented
            label="Stops"
            value={stops}
            onChange={setStops}
            options={[
              ['any', 'Any'],
              ['0', 'Direct'],
              ['1', '≤1 stop'],
            ]}
          />
        </div>
      </div>

      {isDemo && (
        <p className="mb-4 border border-line px-3 py-2 text-xs text-fg-2">
          Demo data — prices and flights are simulated. Add a provider API key to see live fares.
        </p>
      )}
      {failed.length > 0 && (
        <p role="status" className="mb-4 border border-line px-3 py-2 text-xs text-fg-2">
          Some sources didn’t respond. Results may be incomplete.
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className="border border-fg px-3 py-3 text-sm">
          {error}
        </p>
      )}
      {status === 'done' && scored.length === 0 && (
        <p className="py-16 text-center text-fg-2">
          No flights found. Try nearby dates or a different airport.
        </p>
      )}

      {status === 'loading' && scored.length === 0 && <Skeleton />}

      <ol className="divide-y divide-line border-y border-line">
        {visible.slice(0, limit).map((r, i) => (
          <OfferRow key={r.offer.id} row={r} rank={i + 1} adults={query.adults} />
        ))}
      </ol>

      {visible.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + 20)}
          className="mt-6 w-full border border-fg py-3 text-sm font-semibold hover:bg-fill"
        >
          Show more ({visible.length - limit})
        </button>
      )}
    </section>
  );
}

function Segmented<T extends string>(props: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div
      role="group"
      aria-label={props.label}
      className="flex flex-1 border border-line sm:flex-none"
    >
      {props.options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          aria-pressed={props.value === v}
          onClick={() => props.onChange(v)}
          className={`flex-1 whitespace-nowrap px-3 py-1.5 text-xs sm:flex-none ${props.value === v ? 'bg-fg text-bg' : 'hover:bg-fill'}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <ul aria-hidden className="divide-y divide-line">
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="flex items-center justify-between py-6">
          <div className="h-4 w-48 animate-pulse bg-fill" />
          <div className="h-6 w-20 animate-pulse bg-fill" />
        </li>
      ))}
    </ul>
  );
}

function stopsLabel(slice: Slice): string {
  const n = slice.segments.length - 1;
  if (n === 0) return 'Direct';
  const via = slice.segments.slice(0, -1).map((s) => s.destination);
  return `${n} stop${n > 1 ? 's' : ''} · ${via.join(', ')}`;
}

function SliceLine({ slice }: { slice: Slice }) {
  const first = slice.segments[0]!;
  const last = slice.segments[slice.segments.length - 1]!;
  const plus = dayOffset(first.departLocal, last.arriveLocal);
  const carriers = [...new Set(slice.segments.map((s) => s.carrierName))].join(', ');
  return (
    <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 sm:grid-cols-[9rem_6rem_1fr]">
      <span className="nums text-base font-semibold">
        {clock(first.departLocal)}–{clock(last.arriveLocal)}
        {plus > 0 && <sup className="ml-0.5 text-xs font-normal">+{plus}</sup>}
      </span>
      <span className="nums text-sm text-fg-2">{formatDuration(slice.durationMinutes)}</span>
      <span className="col-span-2 truncate text-sm text-fg-3 sm:col-span-1">
        {first.origin}–{last.destination} · {stopsLabel(slice)} · {carriers}
      </span>
    </div>
  );
}

function OfferRow({ row, rank, adults }: { row: Scored; rank: number; adults: number }) {
  const [open, setOpen] = useState(false);
  const { offer, score, anomaly } = row;
  const detailsId = `offer-${offer.id}`;
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => setOpen((o) => !o)}
        className="grid w-full grid-cols-[1fr_auto] items-center gap-4 py-5 text-left hover:bg-fill sm:px-2"
      >
        <span className="sr-only">Result {rank}. </span>
        <div className="min-w-0 space-y-2">
          {offer.slices.map((s, i) => (
            <SliceLine key={i} slice={s} />
          ))}
          {offer.returnSelectedAtProvider && (
            <p className="text-xs text-fg-3">Return flight chosen on booking site</p>
          )}
        </div>
        <div className="text-right">
          {anomaly && (
            <span className="mb-1 inline-block bg-fg px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-bg">
              Unusually low
            </span>
          )}
          <div className="nums text-xl font-light leading-none tracking-tight">
            {formatMoney(offer.price)}
          </div>
          <div className="nums mt-1 text-xs text-fg-3">
            {adults > 1 &&
              `${formatMoney({ ...offer.price, amountMinor: Math.round(offer.price.amountMinor / adults) })} pp · `}
            Score <span className="font-semibold text-fg">{score.score}</span>
          </div>
        </div>
      </button>

      {open && (
        <div id={detailsId} className="grid gap-8 pb-8 pt-2 sm:grid-cols-[1fr_16rem] sm:px-2">
          <div className="space-y-6">
            {offer.slices.map((slice, si) => {
              const lays = layovers(slice);
              return (
                <ol key={si} className="space-y-3 border-l border-fg pl-4 text-sm">
                  {slice.segments.map((seg, i) => (
                    <li key={i}>
                      <div className="nums font-semibold">
                        {clock(seg.departLocal)} {seg.origin} → {clock(seg.arriveLocal)}{' '}
                        {seg.destination}
                      </div>
                      <div className="text-fg-3">
                        {seg.carrierName} {seg.carrierCode}
                        {seg.flightNumber} · {formatDuration(seg.durationMinutes)}
                      </div>
                      {lays[i] && (
                        <div className="nums mt-3 text-xs text-fg-2">
                          {formatDuration(lays[i].minutes)} layover in {lays[i].airport}
                          {lays[i].airportChange && ' · change airport'}
                          {lays[i].overnight && ' · overnight'}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              );
            })}
            {offer.separateTickets && (
              <p className="border border-fg px-3 py-2 text-xs">
                Separate tickets. If a flight is delayed and you miss the next one, the airline
                doesn’t have to rebook you.
              </p>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-xs text-fg-3">Why score {score.score}</h3>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-line">
                {score.items.map((it) => (
                  <tr key={it.key}>
                    <th scope="row" className="py-1.5 pr-2 text-left font-semibold">
                      {it.label}
                    </th>
                    <td className="py-1.5 pr-2 text-fg-2">{it.note}</td>
                    <td className="nums py-1.5 text-right">
                      {it.max > 0 ? `${it.points}/${it.max}` : it.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <a
              href={offer.deepLink}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-4 block bg-fg py-3 text-center text-sm font-semibold text-bg hover:opacity-85"
            >
              View deal ↗
            </a>
            <p className="mt-2 text-[11px] text-fg-3">
              Prices change quickly — confirm the final price on the booking site.
            </p>
          </div>
        </div>
      )}
    </li>
  );
}

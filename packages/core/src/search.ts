import { OfferSet } from './dedupe';
import type { FareProvider } from './provider';
import { OfferSchema, type Offer, type SearchQuery } from './schema';

export type SearchEvent =
  | { type: 'offers'; providerId: string; offers: Offer[] }
  | { type: 'provider-error'; providerId: string; message: string }
  | { type: 'done'; total: number };

function hostAllowed(link: string, hosts: readonly string[]): boolean {
  try {
    const u = new URL(link);
    return u.protocol === 'https:' && hosts.includes(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Fans out to every provider in parallel and yields deduplicated offers as soon as they arrive.
 * Offers are re-validated and their deep links checked against the provider's host allow-list,
 * so a buggy or compromised provider cannot inject an open redirect.
 */
export async function* searchAll(
  providers: readonly FareProvider[],
  query: SearchQuery,
  signal: AbortSignal,
  opts: { batchMs?: number; onInvalid?: (providerId: string, reason: string) => void } = {},
): AsyncGenerator<SearchEvent> {
  const set = new OfferSet();
  const queue: SearchEvent[] = [];
  let wake: (() => void) | undefined;
  const push = (e: SearchEvent) => {
    queue.push(e);
    wake?.();
  };

  let running = providers.length;
  for (const p of providers) {
    void (async () => {
      let batch: Offer[] = [];
      let lastFlush = Date.now();
      const flush = () => {
        if (batch.length) push({ type: 'offers', providerId: p.id, offers: batch });
        batch = [];
        lastFlush = Date.now();
      };
      try {
        for await (const raw of p.search(query, signal)) {
          const parsed = OfferSchema.safeParse(raw);
          if (!parsed.success) {
            opts.onInvalid?.(p.id, parsed.error.message);
            continue;
          }
          if (!hostAllowed(parsed.data.deepLink, p.allowedHosts)) {
            opts.onInvalid?.(p.id, `deep link host not allowed: ${parsed.data.deepLink}`);
            continue;
          }
          if (set.add(parsed.data)) batch.push(parsed.data);
          if (Date.now() - lastFlush >= (opts.batchMs ?? 100)) flush();
        }
        flush();
      } catch (err) {
        flush();
        if (!signal.aborted) {
          push({
            type: 'provider-error',
            providerId: p.id,
            message: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      } finally {
        running--;
        wake?.();
      }
    })();
  }

  while (running > 0 || queue.length > 0) {
    if (queue.length === 0) {
      await new Promise<void>((r) => (wake = r));
      wake = undefined;
      continue;
    }
    yield queue.shift()!;
  }
  yield { type: 'done', total: set.size };
}

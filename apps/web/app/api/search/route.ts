import { searchAll, SearchQuerySchema } from '@lowfare/core';
import { configuredProviders } from '@/lib/providers';
import { clientKey, RateLimiter } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 10 searches burst, then one every 6 seconds per client.
const limiter = new RateLimiter(10, 1 / 6);

/**
 * GET /api/search?origin=AMS&destination=LIS&departDate=2026-11-10[&returnDate=…&adults=1&cabin=economy]
 * Streams Server-Sent Events: `offers`, `provider-error`, `done`.
 */
export async function GET(request: Request): Promise<Response> {
  const limit = limiter.take(clientKey(request.headers));
  if (!limit.ok) {
    return Response.json(
      { error: 'Too many searches. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  for (const k of Object.keys(params)) if (params[k] === '') delete params[k];
  const parsed = SearchQuerySchema.safeParse(params);
  if (!parsed.success) {
    return Response.json(
      {
        error: 'Invalid search',
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
      { status: 400 },
    );
  }

  const providers = configuredProviders();
  const controller = new AbortController();
  request.signal.addEventListener('abort', () => controller.abort(), { once: true });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(sink) {
      const send = (event: string, data: unknown) =>
        sink.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      send('meta', { providers: providers.map((p) => ({ id: p.id, label: p.label })) });
      try {
        for await (const e of searchAll(providers, parsed.data, controller.signal, {
          onInvalid: (providerId, reason) =>
            console.warn(JSON.stringify({ msg: 'invalid offer dropped', providerId, reason })),
        })) {
          if (e.type === 'provider-error') {
            console.error(JSON.stringify({ msg: 'provider error', ...e }));
            // Don't leak upstream error details to the client.
            send(e.type, {
              providerId: e.providerId,
              message: 'This source is unavailable right now.',
            });
          } else {
            send(e.type, e);
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error(JSON.stringify({ msg: 'search failed', err: String(err) }));
          send('provider-error', { providerId: 'all', message: 'Search failed.' });
        }
      } finally {
        sink.close();
      }
    },
    cancel() {
      controller.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

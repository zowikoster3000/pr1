/**
 * In-memory token bucket. Good enough for a single instance; swap for a Redis-backed limiter
 * (e.g. Upstash) before running more than one instance — see docs/NEXT_STEPS.md.
 */
export class RateLimiter {
  private readonly buckets = new Map<string, { tokens: number; updated: number }>();

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    private readonly now: () => number = Date.now,
  ) {}

  take(key: string): { ok: boolean; retryAfterSeconds: number } {
    const t = this.now();
    const b = this.buckets.get(key) ?? { tokens: this.capacity, updated: t };
    b.tokens = Math.min(this.capacity, b.tokens + ((t - b.updated) / 1000) * this.refillPerSecond);
    b.updated = t;
    if (this.buckets.size > 10_000) this.buckets.clear(); // crude memory bound
    this.buckets.set(key, b);
    if (b.tokens < 1) {
      return { ok: false, retryAfterSeconds: Math.ceil((1 - b.tokens) / this.refillPerSecond) };
    }
    b.tokens -= 1;
    return { ok: true, retryAfterSeconds: 0 };
  }
}

export function clientKey(headers: Headers): string {
  // On Vercel and most proxies the left-most x-forwarded-for entry is the client.
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'anon'
  );
}

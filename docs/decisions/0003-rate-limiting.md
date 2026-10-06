# 0003 — In-memory rate limiting until Redis is provisioned

**Status:** accepted (temporary) · 2026-10-06

`/api/search` uses an in-process token bucket (10 burst, 1 per 6 s per client IP). This is correct
for a single instance only. **Before production with more than one instance**, replace
`apps/web/lib/rate-limit.ts` with a Redis-backed limiter (e.g. `@upstash/ratelimit`) behind the same
`take(key)` interface.

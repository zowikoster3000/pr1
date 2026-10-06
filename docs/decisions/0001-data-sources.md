# 0001 — Data sources: official APIs first, demo data as fallback

**Status:** accepted · 2026-10-06

## Context

The brief asks for a "real-time scraper". Scraping airline/OTA sites usually breaches their terms,
is blocked by bot protection, and breaks on every redesign. CLAUDE.md §4 sets the order:
official APIs → provider adapters → scraping only where permitted.

## Decision

- **SerpApi (Google Flights)** is the first live provider. It offers broad coverage, a deep link to
  book, and no booking/payment flow on our side. It's enabled by `SERPAPI_API_KEY`.
- **Duffel** is deferred. It's a booking API (you sell the ticket), which conflicts with "we never take
  payment". Revisit it if we decide to sell tickets.
- **Amadeus Self-Service** is deferred until its availability and terms have been checked.
- A **deterministic demo provider** is used when no key is configured, so the full product can be built,
  tested and demoed for free. The UI labels it "Demo data".
- Every provider implements `FareProvider` and is re-validated by `searchAll`. That covers both the schema
  and the deep-link host allow-list.

## Consequences

- Each SerpApi search costs one credit, so a Redis cache (5–15 min TTL) is required before launch (Phase 2).
- For round trips, SerpApi returns outbound options with the round-trip total; the return flight is picked
  on Google Flights (`returnSelectedAtProvider`).

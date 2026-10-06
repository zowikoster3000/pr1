# 0002 — Store segment times as local airport time + durations

**Status:** accepted · 2026-10-06 · deviates from CLAUDE.md §8 ("store in UTC")

## Context

Providers (SerpApi/Google Flights) publish local wall-clock times without offsets, plus durations.
Converting to UTC requires a complete airport→time-zone table, which we don't have yet (the starter
list has ~85 airports).

## Decision

- `Segment.departLocal` / `arriveLocal` hold the local airport time (`YYYY-MM-DDTHH:mm`), exactly as
  published. Durations come from the provider.
- Layovers are computed between two local times at the _same_ airport, which is always valid.
- Time-of-day scoring uses local time, which is what matters to the traveller.

## Revisit when

The full airport dataset (OurAirports + time zones) lands in Phase 2. At that point, add UTC
instants alongside the local times for price-history storage.

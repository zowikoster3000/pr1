# MASTER PROMPT — "Lowfare": Flight Deal Hacker & Real-Time Fare Engine

> This file is the project's standing brief. Claude Code reads `CLAUDE.md` automatically at the start of every
> session, so every agent working in this repo follows it. Keep it current; change it on purpose.

---

## 1. Role

You are a principal full-stack engineer and product designer with deep experience in travel tech
(GDS/NDC fare data, fare construction, caching of volatile pricing), high-throughput data pipelines, and
restrained, typography-led interface design. You ship small, tested, secure increments. You do not
over-engineer, you do not leave TODOs without an issue, and you never trade correctness for speed of delivery.

## 2. Mission

Build a web app that finds the **best real flight deals** for a user's trip, faster and more cleverly than
the mainstream search engines, and presents them in a calm, minimal interface.

"Best" is not just "cheapest". Rank on a **Deal Score** (0–100) combining:

- total price incl. bags/seat fees for the chosen fare family,
- price vs. the route's historical median (how unusual is this price?),
- total travel time, number of stops, layover quality (too short / overnight / airport change),
- departure/arrival time-of-day penalties,
- airline/itinerary reliability (self-transfer risk, separate tickets).

Every score must be explainable: the UI shows _why_ a result scored the way it did.

## 3. Core features (MVP → V1)

**MVP (ship first)**

1. Search: origin, destination, dates, passengers, cabin. Airport/city autocomplete (IATA).
2. **Flexible search**: ±3 days and a month calendar view showing cheapest price per day.
3. **Nearby airports**: optionally include airports within N km of origin/destination.
4. Results list ranked by Deal Score, with sort (price, duration, score) and filters (stops, airlines, times, max duration).
5. Deep link to the provider/airline to book. We never take payment.
6. Price alerts: user saves a route + max price, gets e-mail when a fare drops below it.

**V1 "hacks" (each one a toggle, each one with an honest risk label)**

- **Split / self-transfer tickets**: combine two one-ways or two separate tickets via a hub when cheaper. Label: "Separate tickets — missed connection is your risk."
- **Open-jaw & multi-city combos** that undercut a plain return.
- **"Anywhere" / explore mode**: cheapest destinations from an origin in a date window, shown as a list + map.
- **Price history & prediction**: sparkline of the route's price over time; "buy now / wait" hint with confidence, only when we have enough data.
- **Mistake-fare / anomaly detector**: flag fares far below the route median (e.g. < 40% of median) and push alerts.
- **Hidden-city (skiplagging) detection — informational only**: may show that such an itinerary exists, but with a clear warning that it breaches most airlines' conditions of carriage (no checked bags, return segment may be cancelled, loyalty account risk). Off by default.

## 4. Data sourcing — "real-time scraper", done legally and robustly

Order of preference. Do not skip ahead without a reason recorded in `docs/decisions/`.

1. **Official flight APIs first** (stable, legal, real bookable prices). Evaluate current availability and pricing
   at build time, as these change: e.g. Duffel, Amadeus for Developers, Travelport/Sabre (enterprise),
   Travelpayouts/Aviasales data API, SerpApi (Google Flights results), Kiwi/Tequila (check if still accepting partners).
2. **Provider adapters** behind one interface:
   ```ts
   interface FareProvider {
     id: string;
     search(q: SearchQuery, signal: AbortSignal): AsyncIterable<Offer>; // stream results as they arrive
     health(): Promise<ProviderHealth>;
   }
   ```
   All providers normalise into one `Offer` schema (validated with Zod). Fan out in parallel, stream partial
   results to the client (SSE), dedupe identical itineraries, keep the cheapest per itinerary.
3. **Web scraping only where permitted**: respect `robots.txt` and the site's Terms of Service; no login-walled,
   CAPTCHA-protected or anti-bot-protected content; no CAPTCHA solving or bot-detection evasion. Polite rate limits
   (per-domain token bucket), identifiable User-Agent, exponential backoff, circuit breaker per source.
   Use Playwright only when a permitted source requires JS rendering. Scrapers run as isolated workers, never in
   the web request path.
4. **Caching**: fares are volatile. Cache search results in Redis with short TTL (5–15 min), price history in
   Postgres (append-only, used for medians and prediction). Always show "price checked X min ago" and re-verify
   price on click-through when the provider supports it.

## 5. Tech stack (default — deviate only with a written reason)

- **Monorepo**: pnpm + Turborepo. TypeScript `strict` everywhere.
- **Web**: Next.js (App Router, React Server Components), Tailwind CSS, Radix UI primitives, TanStack Query for client state.
- **API**: Next.js route handlers or a separate Fastify service; tRPC or OpenAPI-typed endpoints. Zod at every boundary.
- **Workers**: Node workers with BullMQ (Redis) for alerts, price-history collection and scraping jobs.
- **Data**: PostgreSQL (Drizzle ORM, migrations in repo), Redis (cache, queues, rate limits).
- **Auth** (only for alerts/saved searches): Auth.js or Clerk; magic-link e-mail. Search works without an account.
- **E-mail**: Resend/Postmark. **Observability**: OpenTelemetry + Sentry, structured JSON logs (pino).
- **Hosting**: Vercel (web) + Fly.io/Railway/Render (workers, Postgres, Redis), or one cloud of choice. Infra as code.

## 6. Visual language & UX

**Palette — strictly monochrome.** Colour is never used for meaning; use weight, size, position, and icons.

```
--black:   #000000   primary text, primary buttons
--ink:     #111111   dark surfaces (dark mode background)
--grey-700:#3A3A3A   secondary text
--grey-500:#767676   tertiary text, placeholders (passes 4.5:1 on white)
--grey-300:#C8C8C8   borders, dividers
--grey-100:#F2F2F2   subtle fills, hover rows
--white:   #FFFFFF   background
```

Dark mode = inverted tokens. All text meets WCAG 2.2 AA contrast.

**Typography — Helvetica Neue feel.**
`font-family: "Helvetica Neue", Helvetica, "Inter", Arial, sans-serif;`
Self-host **Inter** (or Neue Haas Grotesk / Neue Montreal if licensed) as the guaranteed web font via `next/font`.
Scale: 12 / 14 / 16 / 20 / 28 / 44 px. Weights 400 and 600 only (plus 300 for very large price figures).
Tabular numerals (`font-variant-numeric: tabular-nums`) for all prices and times. Tight tracking on large sizes.

**Layout & components**

- 8-px spacing grid, generous whitespace, 1-px hairline dividers instead of cards and shadows. Border radius 0–4 px.
- Home = one sentence-style search bar ("From Amsterdam to Anywhere, in March, 2 adults") with keyboard-first input.
- Results = dense, aligned rows: times · duration · stops · airline · **price (largest element)** · Deal Score.
  Expand a row inline to see segments, layovers, fees, and the score breakdown.
- Results stream in with a thin progress line at the top; no spinners blocking the page; skeleton rows.
- Motion: 150–200 ms ease-out, opacity/transform only; honour `prefers-reduced-motion`.
- Mobile-first; thumb-reachable filters in a bottom sheet; works at 320 px width.
- Full keyboard navigation, visible focus rings (2 px black/white), screen-reader labels on every control.
- Empty, loading, error and "no results" states are designed, not afterthoughts.

## 7. Security requirements (non-negotiable)

- Follow OWASP ASVS L2 / OWASP Top 10. Validate all input with Zod server-side; never trust the client.
- Secrets only in environment variables / secret manager; never committed. `.env.example` documents them. Run
  secret scanning (gitleaks) in CI and as a pre-commit hook.
- Strict HTTP headers: CSP (nonce-based, no `unsafe-inline` scripts), HSTS, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, frame-ancestors `none`.
- Rate limiting per IP and per user on search and alert endpoints (Redis); bot protection on sign-up.
- SSRF-safe outbound fetching: scrapers and providers only call an allow-list of hosts.
- Deep links: only to allow-listed provider domains (no open redirects).
- Store minimal personal data (e-mail + alerts). GDPR: consent for e-mails, one-click unsubscribe, account deletion, data export.
- Dependencies: lockfile committed, Dependabot/Renovate, `pnpm audit` and CodeQL in CI. Pin GitHub Actions by SHA.
- Least-privilege DB users; parameterised queries only (ORM); backups enabled.

## 8. Quality bar

- TypeScript strict, ESLint + Prettier, no `any` without a comment explaining why.
- **Tests**: Vitest unit tests for the Deal Score, normalisation and dedupe (property-based with fast-check for
  pricing math); contract tests per provider adapter using recorded fixtures; Playwright e2e for search → results → deep link;
  axe accessibility checks in e2e.
- **Performance budgets**: LCP < 2.0 s on 4G, first results visible < 3 s, JS < 150 kB gz on the home page. Lighthouse CI enforces them.
- CI (GitHub Actions) on every PR: typecheck, lint, unit, e2e, a11y, Lighthouse, audit, secret scan. Main is always deployable.
- Money is handled as integer minor units + ISO currency code. Never floats.
- Times are stored in UTC with the airport's IANA time zone; displayed in local airport time.

## 9. How to work (instructions to the agent)

1. Before coding a phase, write a short plan (files, data model, risks) and wait for approval on anything that changes
   architecture, data sourcing, or security posture.
2. Work in small vertical slices; each PR is shippable, tested and under ~400 lines of diff where possible.
3. Record significant decisions as ADRs in `docs/decisions/NNNN-title.md`.
4. When a provider's API, pricing or terms are uncertain, check current docs rather than relying on memory, and say so.
5. Never add a scraper for a site without noting in its adapter file: source, ToS/robots.txt check date, rate limit.
6. Definition of done: tests green, a11y clean, no new lint warnings, docs/README updated, `.env.example` updated.

## 10. Build phases

| Phase               | Outcome                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| 0. Foundation       | Monorepo, CI, lint/test, design tokens, typography, base layout, security headers, deploy preview.      |
| 1. Search MVP       | One official API adapter, normalised `Offer`, streaming results, Deal Score v1, results UI, deep links. |
| 2. Flexibility      | Second provider, dedupe, flexible dates calendar, nearby airports, Redis cache.                         |
| 3. Alerts & history | Accounts (magic link), saved searches, price-history collector, e-mail alerts.                          |
| 4. Hacks            | Split tickets, open-jaw, explore/anywhere, anomaly detector, (informational) hidden-city.               |
| 5. Hardening        | Load test, observability dashboards, pen-test checklist, GDPR flows, prediction model.                  |

Start with **Phase 0**. Produce the plan first.

# Next steps — from master prompt to working product

## Where to put the master prompt

| Place | Why |
|---|---|
| **`CLAUDE.md` in the repo root** (done) | Claude Code loads it automatically in every session (local, web, or GitHub). It is versioned with the code, so the brief and the code evolve together. |
| `.claude/settings.json` | Team permissions (allowed commands), hooks (e.g. run lint/tests after edits). |
| `.claude/commands/` or `.claude/skills/` | Reusable workflows, e.g. `/new-provider` that scaffolds an adapter + contract test. |
| A Claude Project (claude.ai) | Optional: paste the same prompt there for product/design discussions outside the code. |

Keep one source of truth: `CLAUDE.md`. Don't paste diverging copies elsewhere.

## Fastest path (about 2–3 weeks to a usable MVP)

**Day 0 — accounts & decisions (you)**
1. Sign up for 1–2 flight data APIs (e.g. Duffel and/or Amadeus for Developers; SerpApi for Google Flights data).
   Check current terms, pricing, and whether they're still taking new sign-ups. Get test keys.
2. Create accounts: Vercel (web), Neon/Supabase (Postgres), Upstash (Redis), Resend (e-mail), Sentry.
3. Store all keys in each platform's secret manager, never in the repo.

**Day 1 — Phase 0 (Claude Code)**
Prompt: *"Read CLAUDE.md. Plan Phase 0, then implement it."* Review the plan, approve, let it build:
monorepo, CI pipeline, design tokens, fonts, security headers, deploy preview.

**Days 2–6 — Phase 1: search MVP**
Prompt per slice: *"Implement Phase 1, slice: <Duffel adapter | Offer schema | streaming endpoint | results UI | Deal Score v1>."*
One PR per slice. Review each PR on the preview deployment.

**Week 2 — Phases 2–3**: second provider, flexible dates, caching, alerts.

**Week 3+ — Phase 4 hacks**, then Phase 5 hardening before you go public.

## Speed tips
- Run several Claude Code sessions in parallel on independent slices (e.g. UI vs. provider adapter), each on its own branch.
- Add a `SessionStart` hook so cloud sessions install dependencies and can run tests immediately.
- Record API responses as fixtures early. Tests and UI work then don't spend API quota.
- Build the UI against fixtures while provider integration is in progress.

## Security & quality checklist before public launch
- [ ] CI green: typecheck, lint, unit, e2e, axe a11y, Lighthouse budgets, `pnpm audit`, CodeQL, gitleaks
- [ ] CSP/HSTS headers verified (securityheaders.com grade A)
- [ ] Rate limits on search + alerts; bot protection on sign-up
- [ ] Outbound host allow-list for providers and scrapers; no open redirects on deep links
- [ ] Run `/security-review` in Claude Code on every major PR; an external pen test before scaling
- [ ] GDPR: privacy policy, e-mail consent, unsubscribe, delete/export account
- [ ] Each scraper documents its ToS/robots.txt check; API terms reviewed (many forbid caching or redistribution beyond limits)
- [ ] Sentry alerts + uptime monitor; DB backups tested by restoring once

## Legal note
Prefer official APIs. Scraping airline/OTA sites often breaches their terms and gets blocked. Hidden-city
ticketing is legal for travellers in most places but breaks airline contracts. Show it only as information,
with a warning. Get a short legal review before monetising, e.g. through affiliate links.

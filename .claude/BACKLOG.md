# DevAstroAI — Backlog

> **READ THIS FIRST every session.** Then `tail -60 .claude/DAILY_LOG.md` for the most recent context.
> Times in this file are local IST. Audience = user + future Claude sessions (internal, terse is fine).

---

## How to use this file

**Claude on session start**: read this entire file, then tail the last 60 lines of `.claude/DAILY_LOG.md`. Do NOT assume prior conversation context — it's compressed or lost. These two files are the source of truth.

**Updates allowed without asking**:
- Append to §Shipped log when a PR merges to develop.
- Append to `.claude/DAILY_LOG.md` at end of day when user says "we are done for the day".
- Tick items off Track A / B / C queues as they ship.

**Updates requiring explicit user approval**:
- Change §Current stance (Option A / B / C).
- Reorder track queues.
- Add / remove / re-scope any decided business-model principle.
- Move items between Do-Not-Implement and active queues.

---

## Ultimate goal

**DevAstroAI — the #1 AI app for KP Astrologers.** Premium feel, not student/kid-tier.

Benchmarks:
- **KundaliGPT** → astrology-domain product to beat (features + UX).
- **GitHub** → look-and-feel reference (dark, dense, professional).
- **Power BI** → drag-and-drop dashboard reference (for future astrologer dashboard work).

Two audiences:
- **KP astrologers** (core) — get CRM + prediction tracker + client workspace. They're the moat.
- **General users / consumers** — get own chart + AI Q&A with freemium gating.

---

## Why developv2 was paused

The v2 big-bang SaaS rewrite kept crashing in production. Every infrastructure layer added a new failure mode:
- CORS misconfig → `ERR_NETWORK`
- Supabase RLS blocking legit queries
- Railway ↔ Supabase IPv6 routing
- JWT algorithm mismatch (HS256 vs ES256/RS256)
- axios stall in interceptor waiting on `supabase.auth.getSession()`
- Missing same-origin proxy route for cross-origin ERR

All preserved at `developv2@146a919` but deliberately **not deployed**. Tagged `v1-stable-2026-04-17` and came back to the stateless v1 that actually works in production.

**Strategic lesson**: earn the right to add auth + DB by first shipping a polished UI that people actually use.

---

## Business model — DECIDED principles + OPEN research

### Decided (do not change without explicit reopen)

- **Motto**: *"Not to make money. First goal is to get people on the platform and cut my own expenses to zero so it stops coming out of my pocket."*
- **Pricing rule**: **charge $1 more than what they actually cost us.** Cost-recovery + tiny margin, never profit-max.
- **Indian market** = price-sensitive. Many users have debit, not credit. **Debit-card-friendly mandatory.**
- **Stripe = DEFERRED.** No billing code, no subscription webhooks, no tier-gating logic until proven PMF.
- **Freemium gating** = `localStorage` counter in-browser until real auth lands. Good enough to see if people hit the limit.
- **Landing page pricing copy** = stripped. No "$19/mo" baked in. CTAs go to `/app`, not `/signup`.

### Open — needs its own dedicated planning session before ANY pricing code is written

- Three tiers to evaluate: **pay-as-you-go / monthly / yearly**.
- Pay-as-you-go unit: **per client loaded** OR **per AI analysis** (Claude call passthrough). Which is clearer + fairer to users?
- Does pay-as-you-go work with debit cards in India? Razorpay? PhonePe? UPI Autopay?
- What monthly amount covers average-usage Claude API cost + $1 margin?
- GST implications for Indian seller?
- Consumer vs astrologer price points — same tier or different?

---

## Freemium UX rule (decided)

Everyone can log in. Universal shell access.

| Role | Free sees | Locked behind upgrade |
|---|---|---|
| **Astrologer** | Clients list + card info (name, basic chips) | Clicking a client → full workspace **blurred** with "Upgrade to access this client" overlay |
| **Consumer** | Technical chart details (cusps, planets, significators — "they can't make sense anyway") | AI features (Analysis tab, AI-generated interpretations). One profile / family profiles allowed. |

Principle: **show enough that the tool feels real, lock what costs us money** (Claude API calls). Technical data is cheap to serve. AI calls are the pay-per-use resource we can't subsidize at scale.

Astrologers' Clients list is browse-free (social proof, value visibility); opening any client's full chart + analysis consumes a per-client unit or monthly quota. Revenue aligns with usage — 5-client astrologer pays little; 100-client astrologer pays proportionally.

---

## Three tracks

### Track A — v1 UI polish (ACTIVE)
Port v2's **look** onto v1's stable backend. Stateless. No auth. No DB. Each PR small and reversible.

### Track B — astrologer SaaS features (QUEUED, starts after Track A completes)
Shells exist on `developv2@146a919`; nothing on develop. Clients CRM, Sessions, Predictions, Followups, Dashboard KPIs, per-tab AI threads.

### Track C — consumer SaaS features (QUEUED, interleaves with Track B)
Per-user persistent chart, AI history, freemium counter (DB-backed), personal panchang, family profiles.

---

## Current stance — **Option A**

> *"Complete Track A polish before any Track B infrastructure."*

**Rationale** (user, 2026-04-19 local IST): *"currently i lean more towards option A or C, but picking option A because of fear we mess up again like we did in developv2 if we mix everything."*

**Flip-switch rule**: user may reassess A → B mid-sequence at any time without penalty. If flipped, update this §Current stance block + note the flip reason in DAILY_LOG.

---

## MANDATORY PRE-PR PROTOCOL (UI polish)

**Before every Track A polish PR: inspect the matching developv2 component for inspiration.**

User rule (2026-04-19): *"every time you go for any UI polish just have a look into developv2 so you get much more idea because that is our before-best UI. Otherwise we might need to do polish two times in long go."*

- `developv2` worktree lives at `C:\Users\manyu\kp-astro\.claude\worktrees\v2-phase0-design\` (commit 146a919).
- For each tab polish, read the corresponding file under `.claude/worktrees/v2-phase0-design/frontend/app/pro/*` or `frontend/components/pro/*-tab.tsx`.
- Extract visual-only patterns: card treatments, section typography, hero card designs, spacing, color application, micro-interactions.
- Do **NOT** cherry-pick functional / data code (that's Track B). Visual patterns only.
- If developv2's version is clearly better than current develop, match or exceed it. Never ship polish worse than the developv2 reference.

**Why this matters**: post-generate-chart, the current `/app` UI is "common and clumsy" (user's own words). Landing page is the only surface that feels premium today. Each polish PR must close that gap, not half-close it — or we end up polishing twice.

---

## Shipped log

| PR | Commit | Tag | Date (IST) | Summary |
|---|---|---|---|---|
| PR1  | (history) | —                       | ~Apr 12–13 | Design tokens + UI primitives (theme, Logo, PlacePicker, ContentCard, Dialog) |
| PR2  | (history) | —                       | ~Apr 13–14 | Polished landing at `/`, v1 tool moved to `/app` |
| PR3  | (history) | —                       | ~Apr 14    | App shell — sticky top bar + backdrop blur |
| PR4  | (history) | —                       | ~Apr 15    | Onboarding card polish |
| PR5  | (history) | —                       | ~Apr 15–16 | Chart + Workspace polish |
| PR6  | (history) | —                       | ~Apr 16    | Per-tab refinements (chart/houses/dasha) |
| PR7  | (history) | —                       | ~Apr 16–17 | Planet palette unification + more polish |
| PR8  | (history) | —                       | ~Apr 17    | Universal EN / TE+EN / TE language toggle |
| PR9  | `a0d3581` | `v1.9-i18n-complete`    | Apr 18     | Analysis-tab i18n + AI-lang modal timing (Option A) |
| PR10 | `e6d6292` | (not yet tagged)        | Apr 19     | Sidebar dedup + animated Saturn canvas logo |
| PR11 | `b3b8d63` | (not yet tagged)        | Apr 19     | Houses tab full i18n + sub-tab pill polish |
| PR12 | `254cc20` | (not yet tagged)        | Apr 19     | New-chart floating modal + Muhurtha/Panchang emoji→lucide |

**Rollback anchor**: `v1-stable-2026-04-17` on origin. Nuclear: `git reset --hard v1-stable-2026-04-17 && git push --force-with-lease origin develop`.

---

## Track A — remaining queue (Option A order)

Before starting each PR: **read the developv2 reference file first** (per Pre-PR protocol above).

| PR | Scope | developv2 reference to inspect first |
|---|---|---|
| **PR13** | Horary tab polish + i18n | `frontend/app/pro/tools/horary/page.tsx` |
| PR14 | Muhurtha tab i18n sweep (icons already done in PR12) | `frontend/app/pro/tools/muhurtha/page.tsx` (minimal — it's just an info card on developv2) |
| PR15 | Marriage Match polish + i18n + inline "Add Person 2" | `frontend/app/pro/tools/match/page.tsx` |
| PR16 | Transit tab polish + i18n | `frontend/app/pro/tools/transit/page.tsx` |
| PR17 | Dasha tab unify + polish | `frontend/components/pro/dasha-tab.tsx` |
| PR18 | Panchang tab i18n sweep (icons already done in PR12) | `frontend/app/pro/tools/panchang/page.tsx` |
| PR19 | Mobile responsive pass (all tabs) | `frontend/app/app/layout.tsx` drawer pattern |
| PR20 | Legal pages (`/privacy`, `/terms`) + footer links | `frontend/app/privacy/page.tsx`, `frontend/app/terms/page.tsx`, `frontend/components/legal/shell.tsx` |

**Analysis tab = permanently skipped** per user: *"Analysis tab is perfect, don't touch."*

---

## Track B — queued (starts only after PR20 ships clean)

| PR | Scope | developv2 cherry-pick source |
|---|---|---|
| **B1** | Supabase auth (email-only, no OAuth yet) | `frontend/lib/supabase/*`, `frontend/middleware.ts`, `backend/app/auth/*` |
| B2 | `profiles` + `clients` tables; `/pro/clients` list UI | `frontend/app/pro/clients/page.tsx`, `frontend/hooks/use-clients.ts`, `backend/app/routers/clients.py`, `backend/app/db/models/client.py` |
| B3 | `sessions` table + Sessions tab (AI-summarize-session, Haiku) | `frontend/components/pro/sessions-tab.tsx`, `backend/app/routers/sessions.py` |
| B4 | `predictions` table + Predictions accuracy scoreboard | `frontend/components/pro/predictions-tab.tsx`, `backend/app/routers/predictions.py` |
| B5 | `followups` + Resend cron emails | `frontend/components/pro/followups-tab.tsx`, `backend/app/routers/followups.py` |
| B6 | `/app` consumer dashboard — HeroAI, Today's Energy, Family Profiles | `frontend/app/app/*` (developv2 version) |
| B7 | Inline "Add Person 2" for Match + per-tab AI threads | `frontend/components/pro/analysis-tab.tsx`, match/muhurtha tab variants |
| B8 | `/pro/tools` hub + standalone tool pages | `frontend/app/pro/tools/*` |
| B9 | Settings page (profile / billing / appearance / notifications / security / sign-out) | `frontend/app/pro/settings/*` |
| **B10** | RLS + Stripe billing | **DEFERRED — needs pricing-research planning session first** |

---

## Track C — queued (consumer pieces, interleaves with B6+)

- Per-user persistent chart (supplants current `localStorage`-saved-charts).
- AI question history saved to account.
- Freemium counter moves from `localStorage` to DB.
- Family profiles (up to 5 per account — spouse, kids, parents).
- Auto-located personal panchang saved to profile.

---

## DO NOT implement until signal

- **Stripe / pay-per-use / subscription billing** — pricing model unresolved, needs research session first.
- **RLS** — wait for B10 with Stripe; until then app-level `owner_id` checks.
- **Google / Apple / SSO auth** — email-only first; OAuth only after we hit friction.
- **PostHog / Sentry / analytics** — not needed pre-PMF.
- **Mobile native apps** — mobile-responsive web first.
- **Public social features** — no sharing, comments, profiles-public.
- **Multi-language beyond en/te** — no Hindi, Tamil, Kannada yet. Scope creep risk.
- **Auto-migrating developv2 features to develop** — explicit user approval required per cherry-pick; never bulk-merge developv2.

---

## Safety rails

- **Backend is stable.** Do not touch `backend/app/routers/*.py` or `backend/app/services/*` during Track A. Only during Track B.
- **developv2 is frozen.** Do not push, merge, or rebase onto developv2 without explicit user approval. Cherry-pick only via `git checkout developv2@146a919 -- <file>` into develop.
- **Feature-branch workflow for each PR.** `feature/prXX-<scope>` off develop → push → user reviews → user says "merge" → fast-forward merge → push develop → Vercel deploys → tag after user confirms green.
- **Never force-push main or develop** without explicit user approval. Never skip hooks. Never `--amend` a pushed commit.
- **Nuclear rollback**: `git reset --hard v1-stable-2026-04-17 && git push --force-with-lease origin develop`. (Don't run unless genuinely broken.)

---

## End-of-day protocol

User says *"we are done for the day"* → Claude appends an entry to `.claude/DAILY_LOG.md` with:

- Date + local IST times (session start → end).
- PRs shipped today (with commit SHAs).
- PRs in flight (unmerged feature branches).
- Decisions made.
- Next session's top-3 priorities.

**Start of next session**: read `BACKLOG.md` + tail last 60 lines of `DAILY_LOG.md` before replying to the user's first message.

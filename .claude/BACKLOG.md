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

**Analysis tab — UPDATE**: ~~permanently skipped~~ — user reopened it on 2026-04-20+ after testing the AI output. Found the LLM was getting ZERO KB content (KNOWLEDGE_DIR path bug) + gender wasn't reaching the LLM + predictions felt thin. That triggered the **A1.3 analysis-tab arc** — 11 PRs (`76368a2` → `aa31528`) that took it from broken to **structurally complete KSK-strict KP analysis** (34 system-prompt rules, 6 KB files, 5 compute modules, 3 audit rounds). See `.claude/HANDOFF-analysis-tab.md` for the full record. Next PR: A1.3-fix-11 output structure refactor.

**Track A status as of 2026-04-20**: COMPLETE. PR13–PR26 all shipped to develop. Mobile CommandOrb + swipe-dismiss + masked inputs + legal pages all in production. Next track is A.1 below.

---

## Track A.1 — Backend KP accuracy audit (current track)

Opened 2026-04-20 at user's request. First track to touch backend logic.

**North Star**: astrologer-grade correctness in every tool without regressing Analysis. User's quote: *"we shd increase the performance but not decrease at any cost."*

### Why this track exists
- User's dad is a practicing KP astrologer and uses the app. His feedback + user's own observation: Panchang is "mostly wrong", Ruling Planets logic across Horary / Muhurtha feels off (suspicion: we're using natal-chart derived RPs instead of live-moment RPs), Match engine reasoning isn't clearly astrologer-valuable, Transit isn't obviously based on current time + current location.
- Analysis tab remains the gold-standard reference. Whatever the KP engine feeds into Analysis is what makes Analysis feel accurate — so fixing underlying engine bugs *improves* Analysis, it doesn't degrade it (user-approved trade-off).

### Scope — the 5 tools, in this order
1. **Horary** (start here — smallest scope, rule-dense, best verification target)
2. **Panchang** (external website cross-reference available)
3. **Transit** (current time + current location verification)
4. **Muhurtha** (RP logic audit especially)
5. **Match** (engine + reasoning audit, highest interpretive component)

### Process (per tool)

Every tool goes through the same four phases. No tool skips a phase.

1. **Research** — deep read of KP textbooks + web + free tools.
   - Primary source: Krishnamurti "A Handbook of Astrology — KP Reader I & II"
   - Secondary: Kanak Bosmia, Chandrakant Bhatt, Sepharial (comparison) for horary; K.S. Krishnamurti panchang methodology for panchang; Tin Win's "Advanced KP" for match rules
   - Web: Parasara.com, kp-ezine archives, KP Council India, astrovidhi
   - Deliverable: `.claude/research/{tool}-audit.md` containing:
     - What KP canonically says (with source citations)
     - What our code does (line-by-line, no omissions)
     - Gap analysis table (our-behavior vs canonical-behavior)
     - Proposed fix list with severity tags (critical / significant / minor)
     - Known verification cases (textbook example with expected output)

2. **Audit approval** — user reviews the `{tool}-audit.md` doc. No code yet. User says go / tweak / skip-this-item.

3. **Implementation PR** (numbered PR A1.x) — per-tool fix PR:
   - Golden snapshot test captured BEFORE any change (pin current behavior)
   - Fixes applied in service file
   - Reference test case from the audit doc added to the test harness
   - Diff report: what changed between golden and new output
   - No UI changes unless the fix strictly requires it
   - Analysis regression check: same natal chart through Analysis before/after → surface any AI output deltas to user for explicit approval

4. **User verification** — user runs the fixed tool against his reference sources (external sites for Panchang, dad's feedback for others). Approval unblocks the next tool.

### Constraints

- **DO NOT touch the Analysis tab input path except as required** — `backend/app/services/kp_chart.py` is load-bearing. If a core-chart bug is found, fix it (user approved), but flag it in the PR.
- **NO new features without research justification** — if the research surfaces a genuinely valuable missing piece (e.g. Vimshottari-based horary timing, Bhavartha Ratnakara rules for match), propose it; user will approve case by case.
- **NO speed-running** — user stance: *"later slowly my dad will give feedback when he gives we will correct them no hurry but i trust you"*.
- **NO backend tests exist today** (confirmed via `find backend -name "test_*.py"` → all hits are from venv, zero project tests). Every accuracy PR introduces pytest with at minimum: golden snapshot for the chart under test, reference snapshot for the expected output, simple diff-based assertion. This is our regression guard for Analysis too.

### Decisions locked 2026-04-20

- ✅ Start with Horary
- ✅ Ruling Planets = user's current time + astrologer's current location (not natal) — dad confirmed this is canonical KP; may require client-side geolocation plumbing in the API contract
- ✅ Fix core `kp_chart.py` bugs if found, even if they ripple into Analysis
- ✅ New feature additions allowed if research justifies them
- ✅ User's father gives async feedback, not real-time verification oracle
- ✅ Panchang verification via external websites (user to share list)
- ✅ No commercial KP software required (free JHora may be installed later for second-opinion checks)
- ✅ Golden-snapshot test harness before every PR
- ✅ User controls pace, no deadline

### PR queue

| PR | Scope | First deliverable | Status |
|---|---|---|---|
| **A1.0** | Horary research audit | `.claude/research/horary-audit.md` (no code) | ✅ shipped |
| A1.1 | Horary engine accuracy fixes | `backend/app/services/horary_engine.py` + pytest golden + reference case | ✅ shipped |
| A1.2 | Panchang research audit + fixes | `.claude/research/panchang-audit.md` | ✅ shipped (PR A1.2a–d) |
| **A1.3** | **Analysis tab KB overhaul + accuracy** (originally not planned — opened mid-track after user testing) | See `.claude/HANDOFF-analysis-tab.md` for the 12-PR arc | ✅ shipped (`76368a2` → `d60527b`, fix-1 through fix-11) |
| ~~A1.3-fix-11~~ | ~~Output structure refactor + chat UI polish~~ | ~~design locked~~ | ✅ **shipped** `d60527b` — 5-section refactor + chat-feel UI (avatar dot, typing dots, copy button, topic auto-collapse, suggested follow-ups) |
| A1.3e | UX polish for Analysis tab — confidence-bar visual, source-citation expandables, conflicting-signals panel rendering, life-arc timeline visualization, user-mode 3-section format | frontend changes only (backend support exists) | ⏳ queued — deferred from fix-11 |
| A1.4 | Transit research audit | `.claude/research/transit-audit.md` | ⏳ pending |
| A1.5 | Transit engine accuracy fixes | `backend/app/services/transit_engine.py` + tests | ⏳ pending |
| A1.6 | Muhurtha research audit | `.claude/research/muhurtha-audit.md` | ✅ shipped (PR A2.2a–f) |
| A1.7 | Muhurtha engine accuracy fixes | `backend/app/services/muhurtha_engine.py` + tests | ✅ shipped |
| A1.8 | Match research audit | `.claude/research/match-audit.md` | ⏳ pending |
| A1.9 | Match engine accuracy fixes | `backend/app/services/match_engine.py` + tests | ⏳ pending |
| A1.10 | Cross-tab regression sweep | Verify Analysis output unchanged (or approved-changed) across all natal charts in the test harness | ⏳ pending |

Each audit PR is pure markdown — zero code risk. Each accuracy PR is small, focused, testable, revertible. Same small-PR discipline as Track A.

### Research directory

New at `.claude/research/`. Created when the first audit doc is written. One markdown file per tool. Not committed to main docs (`CLAUDE.md` / `BACKLOG.md`) but linked from BACKLOG's PR queue rows.

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

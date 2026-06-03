# Launch Tracker — 2026-09-09 (Astrologer Public Release)

**Status:** Active planning. ~14 weeks remaining as of doc creation
(2026-05-28).
**Scope:** **Astrologers only.** General-public consumer release is
deliberately *not* part of this milestone — it's a separate later phase.
**Audience:** user + future Claude sessions. Read this before any
launch-prep work.

---

## North star for this launch

> **Sept 9, 2026: paying-astrologer-ready DevAstroAI** — accounts,
> persistent storage, client management, per-client portal pages,
> payment, basic discoverability. No consumer surfaces, no marketing
> to general public. Word of mouth among KP astrologers only.

Why Sept 9: user-set deadline; ~3 months gives breathing room without
dawdling. Astrologer base = your father + his network as initial test
pool. Public consumer launch later, separate roadmap.

---

## Scope rules (do NOT mix consumer work into this)

✅ **In scope:**
- Astrologer mode reliability, polish, completeness
- Auth, accounts, DB-backed storage (the real one, not localStorage)
- Per-client portal pages (the killer differentiator)
- Razorpay payments
- SEO + Google indexing
- Operational basics (monitoring, backups, ToS, privacy)

❌ **Out of scope (deferred to a later milestone):**
- General-user mode revamp (`Phase G` is paused after 8 confusing iterations on 2026-05-28)
- Cross-astrologer matching network (`Phase M` — Nov 2026 / Q1 2027)
- Multi-language UI beyond what already ships (EN / TE+EN / TE)
- Mobile native app / PWA install prompts beyond what's already
  in place
- Astrologer-to-astrologer messaging (comes with Phase M)

---

## P0 — must ship (launch blockers)

| # | Item | Effort | Owner | Notes |
|---|---|---|---|---|
| 1 | **Astrologer signup + login** | ✅ **CODE DONE 2026-06-01** | Claude | Frontend pages at `/auth/login`, `/auth/signup`, `/auth/reset-password`, `/auth/confirm`. Backend JWT verification via `app/auth/supabase_jwt.py`. **Needs user to do SETUP-PHASE-1.md dashboard steps to activate.** |
| 2 | **Real database (Railway Postgres)** | ✅ **CODE DONE 2026-06-01** | Claude | SQLAlchemy 2.0 async + Alembic. 7 tables migration ready (`backend/alembic/versions/20260601_0001_initial_schema.py`). Needs user to add Postgres add-on to Railway + run migration (steps in SETUP-PHASE-1.md). |
| 3 | **Migrate chart sessions to DB** | ⏳ **PARTIAL** | Claude | Read-side sync DONE (sidebar reflects DB sessions when authenticated). Write-side mutation pass-through is the next focused commit (P1.5b — touches ~5 sites in page.tsx). Migration endpoint `/chart-sessions/migrate` ready for future bulk imports. |
| 4 | **Client portal pages** (per-client URL) | 2 wk | TBD | The killer differentiator. See `client-portal-spec.md` for details. Schema already in place (`clients.portal_slug`, `client_notes` table with `is_private` flag). |
| 5 | **Razorpay subscription + checkout** | 1 wk | TBD | Subscription flow + UPI Autopay + question-counter wiring. Pricing locked: see [pricing-payment-business-spec.md](./pricing-payment-business-spec.md). Schema in place (`subscriptions` table with plan/status/topup_credits/razorpay_subscription_id). |
| 6 | **Email auth + reset password + system emails** | ✅ **AUTH DONE 2026-06-01** | Claude | Supabase Auth handles signup/confirm/reset emails out of the box. Custom system emails (billing receipts, portal-opened notifications) deferred to later. |
| 7 | **Terms of Service + Privacy Policy** | 1 day | TBD | Polish the stubs at `/privacy` + `/terms`. Add astrologer-data-handling clauses. |
| 8 | **SEO basics** (meta, OG, robots, sitemap) | 2 days | TBD | Discoverable from day 1 on "KP astrology app" / "AI astrology" searches. |
| 9 | **Error monitoring** | 1 day | TBD | Sentry free tier. Capture front-end + back-end errors. |
| 10 | **DB backup verification** | 1 day | TBD | Confirm Neon's PITR works; test a restore. |
| 11 | **Route segment refactor** | SEQUENCED post-auth/DB | TBD | 2026-06-01 (clarified by user): IS in scope. Sequenced AFTER auth+DB, not cancelled. When we do it, we do it RIGHT — remove the G2 `pushState`/`popstate` hack entirely, move ~80 tab-local state pieces into respective tab files, create real Next.js route segments. No shortcuts. Foundation (WorkspaceContext, commits A+B) already shipped on develop as prep work. If this slips Sept 9, we postpone the launch rather than ship the temporary hack. |
| 12 | **Custom domain (devastroai.com)** | ✅ done | — | 2026-05-28 |
| 13 | **AppToast for error visibility** | ✅ done | — | 2026-05 |
| 14 | **Mobile responsive shell** | ✅ done | — | Phase 9 work |

---

## P1 — should ship (significantly better launch)

| Item | Effort | Notes |
|---|---|---|
| Today's appointments calendar (lightweight) | 3 days | Per-astrologer schedule of upcoming consultations |
| Per-client consultation history (timeline view) | included in client portal | Lives inside the client portal pages |
| PDF v3 with astrologer's branding (logo, name, signature) | 3 days | Builds on existing pdf_engine_v2 |
| Astrologer profile / bio / photo | 2 days | Used on client portal pages + future astrologer directory |
| Onboarding flow for new astrologers (5-step tour) | 3 days | First-time experience matters for retention |
| Email notifications (new client opened portal, consult-back request) | 2 days | Reuses email infra from P0 #6 |
| Referral program (astrologer→astrologer codes) | 2 days | Cheap growth lever |
| **Astrologer notes per client** (pending discussion) | TBD | Comes up in next strategic conversation |
| **Prediction accuracy tracking** (pending discussion) | TBD | Same — needs design before estimate |

---

## P2 — nice to have (post-launch iteration)

- Mobile PWA install prompt
- Voice notes for the astrologer
- Calendar sync (Google Calendar 2-way)
- WhatsApp Business API integration
- Multi-user accounts (junior astrologer + senior reviewer)
- Analytics dashboard (which clients open their portal, how often)
- Telugu language UI strings beyond current coverage

---

## Open decisions

Updated 2026-06-01. Pricing, payment, and business setup were
discussed in depth and are now spec'd separately in
[`pricing-payment-business-spec.md`](./pricing-payment-business-spec.md).

| # | Decision | Status |
|---|---|---|
| 1 | Route segment refactor — when? | ✅ **DECIDED 2026-06-01: SEQUENCED post-auth/DB, NOT cancelled.** User: "i want you to complete the route also, i don't need the temporary G1/G2 hotfix." When we do it, full migration: remove pushState hack, move ~80 tab-local state pieces into tab files, real Next.js route segments. If this slips Sept 9, we postpone the launch rather than compromise. Foundation (WorkspaceContext) already shipped on develop as commits A+B. |
| 2 | Database (Neon / Railway / other)? | _pending_ — recommend Neon free tier |
| 3 | **Pricing tiers + AI quotas** | ✅ **DECIDED 2026-06-01.** Plus ₹499/mo (5 AI q), Pro ₹1,499/mo (30 AI q), top-up packs ₹200/500/1000. See pricing spec. |
| 4 | **Free trial length** | ✅ **DECIDED 2026-06-01.** 30 days of Plus, no credit card upfront. |
| 5 | Max clients per astrologer (cap or unlimited)? | _pending_ — recommend unlimited |
| 6 | Email provider (Resend / SendGrid / SES)? | _pending_ — recommend Resend |
| 7 | OAuth providers v1 (email-only / +Google / +Apple)? | _pending_ — recommend email-only v1 |
| 7a | **ORM / DB layer** | ✅ **DECIDED 2026-06-01.** SQLAlchemy 2.0 (async) + Alembic. See `architecture-decisions-2026-06-01.md`. |
| 7b | **Auth provider** | ✅ **DECIDED 2026-06-01.** Supabase Auth (auth-only; DB stays on Railway). Delete dormant Supabase, create fresh project. |
| 7c | **FE/BE type sync** | ✅ **DECIDED 2026-06-01.** OpenAPI codegen → TypeScript via `openapi-typescript`. |
| 7d | **Frontend state architecture** | ✅ **DECIDED 2026-06-01.** Context (auth) + Zustand (UI) + TanStack Query (server data). |
| 8 | **Payment processor** | ✅ **DECIDED 2026-06-01.** Razorpay (UPI Autopay critical; Stripe ruled out). See pricing spec. |
| 9 | **Business entity + registration country** | ✅ **DECIDED 2026-06-01.** India sole proprietorship in dad's name (resident Indian, zero NRI hassle). Ultra-lean start: NO Udyam / Current Account / GST / CA until revenue triggers cross thresholds. See pricing spec § 5. |
| 10 | **Workspace features for Plus tier** (notes per client, today's appointments, prediction accuracy tracking, etc.) | _pending discussion_ — next strategic conversation. Plus tier needs strong deterministic feature set so AI-disabled users feel value, not crippled. |

---

## Proposed sequencing — 14 weeks (May 28 → Sept 9)

```
W 1–2  (May 28 → Jun 11):
  - Delete dormant Supabase
  - Set up Neon DB, schema design
  - Build auth (signup / login / reset / confirm)
  - Migrate localStorage chart sessions → DB
  - Astrologer profile model

W 3–4  (Jun 11 → Jun 25):
  - Route segment refactor (each tab = own URL)
  - Astrologer profile UI + edit screen
  - Client CRUD (add / edit / delete clients in DB)
  - Cross-device session sync verification

W 5–7  (Jun 25 → Jul 16):
  - Client portal pages (the differentiator)
  - Backend API: /client/<uuid> public + /astrologer/clients/<id>/notes private
  - Bilingual rendering on client pages
  - Consult-back WhatsApp deep-link
  - DB columns: notes timeline, matching_opt_in flag (for Phase M prep)

W 8–9  (Jul 16 → Jul 30):
  - Razorpay integration + pricing page
  - Subscription management (start / cancel / upgrade)
  - Email notifications (Resend integration)
  - Today's appointments calendar (lightweight)
  - Astrologer-branded PDF v3

W 10–11 (Jul 30 → Aug 13):
  - SEO pass (meta tags, OG, sitemap.xml, robots.txt, Schema.org)
  - Onboarding flow for new astrologers
  - Sentry + error monitoring
  - DB backup verification (restore test)
  - 5–10 anchor SEO content pages ("What is KP astrology", "KP vs Vedic", etc.)

W 12–13 (Aug 13 → Aug 27):
  - QA + regression across all astrologer flows
  - Real-world testing with your father's clients
  - Polish based on feedback
  - Marketing landing page tuning

W 14    (Aug 27 → Sept 9):
  - Final fixes
  - Soft launch to small group (your father + 5 friends)
  - Sept 9 public launch announcement to astrologer networks
```

---

## Cancelled paths (do not revive without explicit user discussion)

- **General-user mode v1** (`Phase G`) — paused 2026-05-28 after 8 iterations failed to converge. The astrologer-mode-with-user-tabs hybrid was visibly cluttered (TIME SHIFT, permanent left chart, multi-chart pills all astrologer-specific). User instruction: *"lets not work on user mode now."*
  Status: latest hotfix v5 stripped most chrome, but the experience is still not the designed UX. Code lives on develop, gated behind `mode === "user"` toggle. Don't surface it in marketing.
- **3 home-screen concepts (Almanac / Oracle / Compass)** — explored 2026-05-28, rejected by user. *"lets build simple dashboard… simple clear easy navigation."* The HTML prototypes live in `.claude/research/prototypes/` as historical reference.
- **v2 SaaS rewrite** (`developv2@146a919`) — cancelled per `CLAUDE.md` since 2026-05-24.

---

## Risks + mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| DB migration introduces data-loss bug | Medium | Full backup before migration; parallel write to localStorage for 1 week post-migration; manual reconciliation tool |
| Razorpay integration takes longer than 1 week | Medium | Start integration in Week 7 (1 week early); have Stripe as fallback ($USD international fallback if Razorpay fails QA) |
| Auth flow has edge cases breaking signup | Medium | Use a battle-tested library (NextAuth / Clerk / Lucia). Don't roll our own. |
| SEO ranking takes 3-6 months to show — won't help launch month | High | Treat SEO as ongoing; don't expect organic traffic in September. Launch via direct astrologer outreach instead. |
| Client portal pages have privacy bug (URL guessable) | Low | UUID v4 (2^128 entropy); rate-limit guesses; manually-verifiable URL pattern |
| Sept 9 deadline slip | Medium | Hard rule: P0 must all ship. P1 nice-to-have. If we slip 1-2 weeks, OK. If 4+ weeks, regroup. |

---

## What this doc replaces / makes obsolete

- The original `general-user-vision.md` § "Phase G1-G3 roadmap" — that was consumer launch. Now deferred. Vision doc stays for reference but launch tracker (this file) is the canonical pre-launch source.
- The `BACKLOG.md` § "Three tracks" — Track A polish is mostly done; Track B (astrologer SaaS) is now the active focus aligned with this launch.

When updating progress: ✅ mark P0 items as they ship. Append to "Shipped" log at the bottom of this file.

---

## Shipped (post-launch-tracker creation)

| Date | Item | Commit | Notes |
|---|---|---|---|
| 2026-06-01 | P0 #1 Auth (Supabase + JWT) | Phase 1 batch | Sign-up / login / confirm / reset wired end-to-end. AuthGate on /app. |
| 2026-06-01 | P0 #2 DB (Railway Postgres + Alembic) | Phase 1 batch | 7 tables, all migrations, lazy provisioning of Astrologer row on first auth-gated hit. |
| 2026-06-01 | P0 #3 Chart sessions (replace localStorage) | Phase 1.5b | DB-backed CRUD via TanStack; write-side mutation pass-through. |
| 2026-06-02 | P0 #4 Client portal pages (PUBLIC + ADMIN) | Phase 3 (S1-S4) | `/c/<slug>` public read-only page, `/app/clients/[id]/portal` astrologer admin, notes CRUD, WhatsApp consult-back, rate-limited 60/min/IP, kill switch (`portal_enabled`), per-field privacy (`portal_visibility` JSONB), AI-draft promotion lane. |
| 2026-06-02 | P0 #6 Email auth (Supabase magic) | Phase 1 + reset-password | Sign-up + email confirm + password reset all working. |
| 2026-06-02 | P0 #8 SEO basics | Phase 5 SEO | `sitemap.ts`, `robots.ts`, OG/Twitter/canonical metadata; only public routes indexed (`/`, `/privacy`, `/terms`, `/auth/*`). |
| 2026-06-02 | P1 Auth gate + CRM home | Phase 2 (S1-S4) | Authenticated /app shows CRM home (Today panchang strip + recent activity + clients roster), Add Client modal, per-client workspace route. |
| 2026-06-02 | P1 Mobile-first CRM redesign | Wave-6 mobile pass | CrmShell bottom-nav-with-FAB on mobile, AddClientModal as drag-dismissible bottom sheet, ClientsRoster card reflow, portal admin mobile stacking. |
| 2026-06-02 | P0/P1 Security hardening (pre-launch sweep) | Waves 1-3, 7-10 | CORS lockdown + fullmatch, /astrologer/workspace auth-gate, CRUD rate limits, request-log memory cap, hmac compare_digest, /version split, /clients verbose-error suppression. |
| 2026-06-02 | DB schema groundwork for outcome ledger | Migration 0002 + 0003 | `client_notes.outcome` (pending/confirmed/partial/disconfirmed/na), `client_notes.source` (astrologer/ai_draft), `client_notes.promoted_from_key`, `clients.portal_enabled`, `clients.portal_visibility`. UI ships post-launch. |
| 2026-06-02 | Operational: auto-migrate + schema-drift probe | Hotfix `0719bef` | Railway startCommand chains `alembic upgrade head && uvicorn`; startup probe logs `schema_drift_detected` if model references unmigrated columns. |
| 2026-06-02 | P0 perf — scoped queries on public portal + AI drafts | Wave-7 P0-1, P0-2 | Replaced `selectinload(chart_sessions, notes)` with `SELECT … LIMIT 1` + `SELECT … is_private=false LIMIT 50`. AI drafts SELECTs only the 3 cols it uses, not the full session row. |
| 2026-06-02 | P0 UX — /app error boundary + 401-logout + per-client retry | Wave-7 P0-3, P0-4, P0-5 | `frontend/app/app/error.tsx`; `devastroai:auth-invalidated` CustomEvent → sign-out → /auth/login?reauth=1; per-client workspace isError branch with Retry button. |
| 2026-06-03 | P0 #9 Error monitoring (Sentry wire-up) | Wave-10 | `sentry-sdk[fastapi]` initialized in main.py, gated by SENTRY_DSN env. Release tag from Railway commit SHA. Free-tier-friendly sampling. |

**Note (2026-06-02):** P0 #4 (client portal) is feature-complete
beyond what client-portal-spec.md originally contemplated — added a
kill switch, per-field visibility, AI-draft promotion contract, and
exact-link "Published" detection (`promoted_from_key`). See ADR-005
for the architecture-decisions delta vs the original spec.

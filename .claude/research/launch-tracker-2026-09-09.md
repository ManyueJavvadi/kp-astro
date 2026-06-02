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
| 1 | **Astrologer signup + login** | 1 wk | TBD | Email + password (no Google OAuth v1). Reset-password flow. Confirm-email flow. |
| 2 | **Real database (decide: Neon recommended)** | 3 days | TBD | Replaces localStorage. Neon free tier, no auto-pause, 3GB. Connection from Railway backend. |
| 3 | **Migrate chart sessions to DB** | 3 days | TBD | Astrologer's saved clients persist server-side. Cross-device sync falls out of this. |
| 4 | **Client portal pages** (per-client URL) | 2 wk | TBD | The killer differentiator. See `client-portal-spec.md` for details. |
| 5 | **Razorpay subscription + checkout** | 1 wk | TBD | Subscription flow + UPI Autopay + question-counter wiring. Pricing locked: see [pricing-payment-business-spec.md](./pricing-payment-business-spec.md) |
| 6 | **Email auth + reset password + system emails** | 3 days | TBD | Account confirm, password reset, billing receipt. Use Resend or similar. |
| 7 | **Terms of Service + Privacy Policy** | 1 day | TBD | Polish the stubs at `/privacy` + `/terms`. Add astrologer-data-handling clauses. |
| 8 | **SEO basics** (meta, OG, robots, sitemap) | 2 days | TBD | Discoverable from day 1 on "KP astrology app" / "AI astrology" searches. |
| 9 | **Error monitoring** | 1 day | TBD | Sentry free tier. Capture front-end + back-end errors. |
| 10 | **DB backup verification** | 1 day | TBD | Confirm Neon's PITR works; test a restore. |
| 11 | **Route segment refactor** | 1 wk | TBD | Conditional — pending user decision (see §Open decisions). Each tab gets its own URL. Browser back works natively. |
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
| 1 | Route segment refactor (yes / defer)? | _pending_ — recommend yes Week 3-4 |
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
| — | — | — | (none yet — this doc was just created) |

# DevAstroAI — Master Plan (2026-06-02)

**Status:** Deep-dive synthesis. Written after Claude (me) read the
entire codebase, all canonical specs, all .claude/research/ docs, the
last 30 days of DAILY_LOG, full git history (50 commits + tags + 30+
branches), and the live state of develop.

**Audience:** the user + future Claude sessions. This is the
canonical plan that supersedes ad-hoc sequencing decisions made
in conversation.

**Purpose:** Stop making decisions on the fly. Have one document that
sequences every piece of remaining work, identifies what to throw
away, what to keep, and the order to ship things — grounded in what
already exists in the codebase, not invented from scratch.

---

## TL;DR (read this first)

1. **Phase 1 (auth + DB) is shipped.** Astrologers can sign up, log in,
   reset password, confirm email. 7 DB tables exist on Railway Postgres.
   Asymmetric JWT verification works against Supabase's new JWT Signing
   Keys. Read + write sync of chart_sessions both ship.

2. **The current /app is wrong for authenticated astrologers.** The
   "enter your name + DOB / I am a General user vs KP astrologer" form
   is dead UI for someone who just signed up as an astrologer. Per the
   spec already in BACKLOG.md (§ "Freemium UX rule"), authenticated
   astrologers need a **CRM-first home**: their clients list, with
   "click a client → open that client's workspace". The form should be
   reframed as the "Add new client" modal, not the entry point.

3. **The path to Sept 9 isn't a feature list — it's three structural
   shifts**:
   - **Shift 1**: Reframe /app for authenticated astrologers (CRM home,
     not personal chart). Existing components stay; ONE new screen +
     ONE removed entry point.
   - **Shift 2**: Build the client portal pages (the killer
     differentiator — devastroai.com/c/&lt;uuid&gt;).
   - **Shift 3**: Add Razorpay subscription + paywall. Until this ships,
     everything is free for the early astrologers.

4. **The route segment refactor is no longer optional.** Per the user's
   "quality > deadline" rule, we do it RIGHT (real Next.js segments,
   remove the G2 pushState hack, move ~80 tab-local state pieces into
   tab files). But it folds INTO Shift 1 naturally — extracting /app
   into a CRM home + per-client workspace IS the route segment
   refactor in disguise.

5. **Track A.1 (KP accuracy audit) still has Transit + Match audits
   pending.** Not strictly launch-blocking, but on the queue.

6. **Phase M (matching network) waits for post-launch v1.5 (Nov
   2026)**. Schema is already in place from Phase 1 — `clients.matching_opt_in`
   column exists.

---

## 1. Where we are right now (state of the world, 2026-06-02)

### What's deployed on develop / Vercel / Railway

**Frontend:**
- Next.js 16 App Router, React 19, TypeScript
- Landing at `/` (polished, SEO-ready)
- Auth pages at `/auth/{login,signup,reset-password,confirm}` (Phase 1)
- Main app at `/app` (5,400-line page.tsx, 8 astrologer tabs + 6
  consumer tabs, conditional rendering on `mode`)
- Legal pages at `/privacy` + `/terms`
- All 9 routes prerender cleanly

**Backend:**
- FastAPI on Railway, `devastroai.up.railway.app`
- 25+ endpoints across 12 router files
- Engines: chart, horary, muhurtha, panchangam, transit, match,
  compatibility, cross_chart, multi_chart, pdf_v2 (~34K lines in
  services/)
- AI: Anthropic Claude (Sonnet primary, Haiku for user-mode, Opus
  for compatibility), 6 system prompts in llm_service.py, 55 KB
  files in knowledge/
- Phase 1 additions: /me, /chart-sessions (5 endpoints), /me, JWT
  verification dep, lazy astrologer-row provisioning

**Database (Railway Postgres):**
- 7 tables migrated: `astrologers`, `clients`, `chart_sessions`,
  `client_notes`, `subscriptions`, `usage_events`, `audit_log`
- 15 indexes (incl. partial indexes for Phase M + portal-visible notes)
- pgcrypto enabled (gen_random_uuid for all PKs)
- Connection: backend uses internal Railway URL; local migrations use
  public proxy URL

**Identity (Supabase Auth, fresh project, Mumbai region):**
- Email + password signup with confirm email enabled
- Data API DISABLED (security: we don't expose Supabase REST)
- New asymmetric JWT Signing Keys active (RS256/ES256)
- Legacy HS256 JWT secret also available; our backend supports both

### The actual user state as of testing

- 1 astrologer signed up: `javvadimanyue@gmail.com` (you)
- 1 chart session persisted: `manyue / 09/09/2000 / Tenali`
- /health: all 5 subsystems green
- Auto-load on `/app` reload: confirmed not firing (Vercel deploy
  timing or race condition — not investigated because Shift 1 below
  replaces this flow entirely)

### What's NOT working as designed

- **Post-login /app shows the onboarding form** with "I am a /
  General user vs KP astrologer" toggle. For an authenticated
  astrologer this is dead UI. The form should be reframed as
  "Add new client" in a CRM home.
- **Sidebar "saved sessions" is personal-use framing**, not CRM-style
  client roster. Doesn't surface the metadata an astrologer cares
  about (last consultation date, total notes, upcoming dasha shifts).
- **No protected route gate.** /app works without login. Anonymous
  state still loads onboarding + chart engine. Fine pre-launch, but
  after Razorpay ships, /app must require login.
- **G2 pushState routing.** The temporary hack from May 2026. Per
  user's "quality > deadline" stance, we replace it with real
  Next.js route segments.

---

## 2. North Star — what is this product, really?

(Synthesized from launch-tracker + BACKLOG + general-user-vision +
kundaligpt-observations + client-portal-spec)

**DevAstroAI is the first KP-rigorous, beautiful, mobile-first SaaS
for professional KP astrologers in India. We give them a CRM, a
chart engine, and a public client-portal per client — replacing the
PDF-via-WhatsApp workflow with a living document the astrologer can
update across visits.**

The product has two distinct surfaces:
- **Astrologer mode** (the paying product, Sept 9 launch focus) — a
  CRM for KP astrologers managing dozens to hundreds of clients
- **Consumer mode** (deferred to post-launch) — individual users
  asking about their own chart

These are two different products that share one chart engine.
For Sept 9, we ship ONLY the astrologer product.

### Astrologer mode's three jobs-to-be-done (priority order)

1. **Manage clients across consultations** — replace pen-and-paper
   notebooks + photocopied charts with a searchable digital roster.
   This is the table stakes that 100% of KP astrologers need.

2. **Hand clients a living record** — the per-client portal page
   replaces the post-consultation PDF that gets lost in WhatsApp.
   Astrologer types notes once → client sees them at a stable URL
   forever. **This is the killer differentiator nobody else has.**

3. **Audit their predictions with AI assistance** — the Analysis tab
   gives them a second opinion on every chart, citing CSL chains
   + sub-lord doctrine. Optional cost layer; majority of value is
   the deterministic engines.

### Consumer mode's job (deferred)

Help an individual user ask a specific question about their own
chart (Career? Marriage timing? Should I take this job?) with a
KP-rigorous AI that shows its work. **This is paused per the
2026-05-28 decision. We come back to it post-Sept-9.**

---

## 3. Decisions locked (NEVER re-litigate without explicit reopen)

### Strategic (from launch-tracker + HANDOFF + pricing spec)

- **Sept 9, 2026 launch = astrologer-only.** Consumer launch is a
  separate later milestone.
- **Quality > deadline.** If work slips, postpone the launch rather
  than ship temporary hacks. User direction 2026-06-01.
- **No remedy/gemstone monetization.** We don't sell fear.
- **No fear-based copy.** No "Mangal Dosha will destroy your
  marriage" content.
- **No per-minute meter.** Subscription-only pricing.
- **KP doctrinal accuracy = sacred.** Analysis tab, KB files, KP
  engines.
- **Telugu rendering + KP-Ayanamsa = non-negotiable.** Cultural
  authenticity.

### Pricing (locked 2026-06-01 — see pricing-payment-business-spec.md)

- Plus ₹499/mo (5 AI questions) + Pro ₹1,499/mo (30 AI questions)
- Top-up packs ₹200/500/1000 (questions never expire)
- 30-day free trial of Plus, no credit card upfront
- Annual: 17% discount on both tiers
- Razorpay (NOT Stripe; UPI Autopay critical)
- India sole proprietorship in dad's name (resident Indian; zero
  NRI hassle). Ultra-lean: no Udyam / GST / CA until revenue
  triggers thresholds.

### Architecture (locked 2026-06-01 — ADR-001..004)

- ORM: SQLAlchemy 2.0 (async) + Alembic
- Auth: Supabase Auth (auth-only; DB stays on Railway Postgres)
- Types: OpenAPI codegen → TypeScript via openapi-typescript
- State: Context (auth/workspace) + Zustand (UI) + TanStack Query
  (server data)

### Sacred regions (do NOT touch without explicit approval + golden
chart regression pass)

- `backend/app/services/llm_service.py` — prompts, KB selection,
  format_chart_for_llm
- `backend/app/services/compatibility_engine.py` — _five_signal_classification,
  _h7_sublord_promise, _planet_significations_tiered
- `backend/app/services/chart_engine.py` — planet/cusp/sub-lord/dasha
- `backend/app/services/horary_engine.py` (post-A1.1 audit fixes)
- `backend/app/services/muhurtha_engine.py` (post-A2.x audit fixes)
- `backend/knowledge/*` — all 55 KB files
- `frontend/app/app/tabs/AnalysisTab.tsx` — SSE streaming handler

Any change here requires:
1. Golden chart regression (Manyue, Ramya, Vineetha, Sreeja) snapshot
2. Per-topic verdict snapshot compare (no surprise flips)
3. No internal label leakage (no "RULE N", "PR A1.X" in output)

---

## 4. Decisions pending (need answers before specific phases)

### Phase 2 (CRM home redesign) — needs

- Q1. Does the existing 8-tab astrologer view become **8 tabs
  per-client**, or do we hoist common tabs (Today's Panchang,
  Muhurtha calculator) to be standalone? Recommendation: tabs stay
  per-client, but Today's Panchang + Muhurtha-finder become a
  separate "Tools" section accessible from the CRM home.
- Q2. Sidebar / nav layout? Three options sketched in §6 below.
  **STATUS: pending user choice (A/B/C).**
- Q3. What's on the CRM home itself? **DECIDED 2026-06-02:**
  Today's panchangam strip + Recent activity feed + Clients
  roster + "+ Add client" CTA. **Upcoming consultations DEFERRED**
  — needs its own design pass on how consultations are created,
  scheduled, edited, completed, etc. Will spec separately
  post-launch (or as a P1 enhancement once we have real astrologer
  feedback on workflow).

### Phase 3 (client portal pages) — needs (7 design Qs from spec)

These have recommendations in client-portal-spec.md. Need to
finalize:
1. What client SEES (recommended: simplified snapshot + notes)
2. Consult-back method (recommended: WhatsApp deep-link v1)
3. Notes organization (recommended: chronological timeline v1)
4. Per-URL permanence (recommended: permanent — doctor analogy)
5. Bilingual writing (recommended: manual in TE or EN v1)
6. URL privacy (recommended: plain UUID v1)
7. Astrologer vs DevAstroAI branding (recommended: astrologer-first)

### Phase 4 (Razorpay) — needs

- Final 3 pricing-spec confirmations (dad has PAN + savings + Aadhaar;
  dad comfortable as legal owner; pricing locked)
- Refund policy specifics
- Dunning email copy
- Cancellation flow UX

### Other pending (cross-phase)

- Email provider (Resend recommended — final confirm needed)
- OAuth v1 (email-only recommended — final confirm needed)
- Max clients per astrologer (unlimited recommended — final confirm)
- "Workspace features for Plus tier" — astrologer notes per client,
  prediction accuracy tracking, today's appointments view. **This is
  the next strategic conversation per HANDOFF.**

---

## 5. What's cancelled / paused / deferred (and why)

### Cancelled (do NOT revive without explicit user discussion)

- **v2 SaaS rewrite (`developv2@146a919`)** — cancelled 2026-04-17.
  Every infrastructure layer added a new failure mode (CORS,
  Supabase RLS, Railway↔Supabase IPv6, JWT alg mismatch, axios stall,
  missing same-origin proxy). Preserved in branch as visual
  reference; never deploy.
- **3 home-screen concepts (Almanac / Oracle / Compass)** — rejected
  by user 2026-05-28. Prototypes in `.claude/research/prototypes/`.
- **Quick Mode** (Sonnet→Haiku toggle for astrologer Analysis) —
  dropped 2026-05-06.
- **localStorage session auto-restore** — reverted in PR25.
- **30-day same-chart cache** — reverted (Phase 13 PR 32). Staleness
  on age/today's RPs/dasha references rejected.
- **Quick-insights auto-fire on Analysis tab open** — killed in
  Phase 13.1. ~40% Sonnet saving. Re-enable only as opt-in with
  rate limit.

### Paused (code exists, gated, do not touch)

- **General-user mode v1 (Phase G)** — paused 2026-05-28 after 8
  hotfix iterations. Code stays on develop behind `mode === "user"`
  toggle. DashboardTab.tsx (447 lines), DashboardTab content,
  CONSUMER_TABS array — all present but not the focus. **Don't
  surface in marketing. Don't iterate on it.** Reopens after Sept 9
  astrologer launch.

### Deferred (planned for later phases)

- **Cross-astrologer matching network (Phase M)** — Nov 2026 v1.5,
  Q1 2027 v2.0 public. Schema already in place
  (`clients.matching_opt_in`).
- **Phase A1.3 e/f/g/h/i/j/k/l/m/n/o** — Analysis tab polish queue.
  Streaming SSE, history compression, output budget, etc.
  Non-blocking for launch.
- **PR queue from BACKLOG.md "Hot small wins"** — 24h prompt-cache
  bump (need beta header), frontend rate-limit on Analysis,
  astrologer logo on PDF cover, Yogini Dasha in PDF, N/E chart
  variants in PDF, Noto Sans Telugu in ReportLab.
- **Transit (A1.4 + A1.5) + Match (A1.8 + A1.9) audits** — Track
  A.1 KP accuracy work. Not strictly launch-blocking.

---

## 6. The structural shift — what /app actually needs to be

**This is the heart of the plan. Everything else hangs off it.**

### Current /app (broken for authenticated astrologers)

```
URL: /app
Component: 5400-line page.tsx
State: 109 useState calls, all top-level
Flow:
  Not authenticated → onboarding form (Decode the cosmos / FULL NAME / ...)
  Authenticated     → SAME ONBOARDING FORM (the bug)

If user fills form:
  setupDone=true → workspace renders (chart, 8 tabs)
  "Saved sessions" sidebar = a personal multi-chart switcher
  Sidebar doesn't surface CRM metadata (last consult date, etc.)
```

### Target /app (per BACKLOG.md freemium UX rule + KundaliGPT inspiration)

```
URL: /app                          → CRM home for authenticated
                                     astrologer (today's view +
                                     client roster + quick actions)

URL: /app/clients/[id]             → that client's workspace
                                     (the existing 8 tabs: Chart,
                                     Houses, Dasha, Analysis,
                                     Panchang, Muhurtha, Match,
                                     Horary). Same components as
                                     today. Different framing.

URL: /app/clients/[id]/portal       → the per-client portal page
                                     PREVIEW for the astrologer
                                     (what their client will see at
                                     /c/<slug>)

URL: /app/tools                    → standalone tools that aren't
                                     client-scoped: Today's
                                     Panchang, Muhurtha-finder for
                                     arbitrary event time/place,
                                     Horary (astrologer asks
                                     question right now)

URL: /app/profile                  → astrologer's own profile
                                     (display name, bio, photo,
                                     default language, etc.)

URL: /app/billing                  → subscription state + top-up
                                     purchase + invoice history

URL: /c/[slug]                     → public client portal (no auth)

URL: /                             → landing (marketing)
URL: /auth/{login,signup,...}      → auth flows (Phase 1, shipped)
```

### The CRM home — what /app should look like

(Inspired by KundaliGPT dashboard, but CRM-first not chat-first.
Sketch — concrete design TBD with user. Three layout options below.)

**Option A: Notion-style sidebar + main content**

```
┌────────────┬───────────────────────────────────────────────┐
│  Logo      │  Today, Mon Jun 2, 2026                       │
│  ─────     │  Namaste, Manyue                              │
│  Home      │                                               │
│  Clients   │  [Today panchang strip — tithi/nakshatra/hora]│
│  Tools     │                                               │
│  Profile   │  ┌─ Upcoming consultations (today) ─────────┐ │
│  Billing   │  │ 10:00 AM · Harini Patel · Marriage check│ │
│            │  │  3:30 PM · Suresh Kumar · Career follow │ │
│            │  └─────────────────────────────────────────┘ │
│            │                                               │
│            │  ┌─ Your clients (47) ─────── + Add client ─┐│
│            │  │ Search clients...                         ││
│            │  │ ─────────────────────────────────────────││
│            │  │ ★ Harini Patel · 23F · Last: 12 days ago ││
│            │  │   Suresh Kumar · 31M · Last: 1 mo ago    ││
│            │  │   Vineetha Reddy · 25F · Last: 3 mo ago  ││
│            │  │   ... (44 more)                          ││
│            │  └───────────────────────────────────────────┘│
│            │                                               │
│            │  Recent activity: 3 portal opens · 1 follow-up│
└────────────┴───────────────────────────────────────────────┘
```

**Option B: Dashboard tiles (more like KundaliGPT, less CRM-y)**

Top: greeting + today panchang
4-tile grid: "Add client" / "Today's appointments" / "Recent clients"
/ "Tools"
Below: client roster (sortable, searchable)

**Option C: Pure list-first (most utilitarian)**

Single screen: client search + roster. Tools/profile/billing in a
top-right menu. Quick actions at top: "+ Add client", "Today",
"Quick Horary".

**Recommendation: Option A.** Mirrors Notion (which user already
trusts), gives clear left-nav for billing/tools/profile, lets the
client roster breathe. KundaliGPT's dashboard is too cluttered;
Option B is too consumer-y.

**User decision needed**: pick a layout direction so we can wireframe
+ build.

### The per-client workspace — same tabs, different framing

When astrologer clicks a client → routes to `/app/clients/[id]`.
This renders the EXISTING 8 tabs (Chart, Houses, Dasha, Analysis,
Panchang, Muhurtha, Match, Horary) — same components, same engines,
same AI prompts. **Zero engine changes; this is a route + state
refactor, not a redesign of the tabs themselves.**

The change is:
- Top bar shows client name + birth details + DASHA strip (same as
  today's PersonHeroBanner)
- Sidebar (Notion-style) shows "All clients" as the breadcrumb back
- Multi-chart pill strip becomes "Other clients" picker
- "+ New Chart" becomes "+ New client" → routes to home with modal
  open
- Edit Chart modal still works for fixing rectification

### The Add Client flow — reframes the dead onboarding form

The current onboarding form ("Your name / DOB / TOB / Place / Gender
/ I am a / Generate my KP chart") becomes the **"Add new client"
modal** opened from the CRM home. Same fields, same validation,
same chart engine call. Result: a new `clients` row + an initial
`chart_sessions` row tied to that client → route to
`/app/clients/[new-id]`.

**The "I am a / General user vs KP astrologer" toggle is removed
entirely from authenticated flow.** Authenticated users are always
astrologers. (Consumer mode comes back post-launch via a separate
`/u/[chart_slug]` flow tied to consumer-mode signups.)

---

## 7. The sequenced plan (Sept 9 + post-launch)

Each phase has:
- A concrete deliverable (what the user can do after)
- Files touched
- Sacred regions to AVOID
- Verification checklist
- Estimated effort (honest)

**Pace assumption**: 1-2 focused sessions per week with the user.
Quality > deadline rule applies.

### Phase 2 — CRM home redesign + route segments
**The big shift. Replaces /app entry and makes route segments real.**

**Deliverable:**
- /app (authenticated) renders a CRM home: today panchang strip,
  recent activity feed, "Your clients (N)" roster, search,
  + Add client button, "Tools" link
- (Upcoming consultations: deferred per 2026-06-02 decision)
- "+ Add client" opens a modal with the current onboarding fields
  → creates a `clients` row + initial `chart_sessions` row → routes
  to /app/clients/[id]
- /app/clients/[id] renders the existing 8-tab workspace using DB
  data for that specific client
- /app/clients/[id]/portal renders the client portal preview
- Sidebar nav: Home / Clients / Tools / Profile / Billing
- /app (unauthenticated) redirects to /auth/login (the auth gate)
- G2 pushState code in page.tsx removed entirely
- Tab-local state (~80 useState calls) moved into respective tab
  files
- page.tsx replaced by `app/app/layout.tsx` (CRM shell) + per-route
  page.tsx files

**Files touched:**
- DELETE most of page.tsx (the onboarding form, ~3000 lines)
- NEW: `app/app/layout.tsx` (CRM shell with sidebar, route
  outlet, auth gate)
- NEW: `app/app/page.tsx` (CRM home content)
- NEW: `app/app/clients/page.tsx` (full clients list view)
- NEW: `app/app/clients/[id]/layout.tsx` (workspace shell:
  PersonHeroBanner + 8 tabs + AI Companion)
- NEW: `app/app/clients/[id]/page.tsx` (redirects to /chart)
- NEW: `app/app/clients/[id]/(chart|houses|dasha|analysis|
  panchang|muhurtha|match|horary)/page.tsx`
- NEW: `app/app/tools/page.tsx`
- NEW: `app/app/profile/page.tsx`
- NEW: `app/app/billing/page.tsx` (stub for Phase 4)
- NEW: `app/c/[slug]/page.tsx` (public client portal — Phase 3)
- MOVE: tab-local state from page.tsx into tabs/*.tsx files

**Sacred to AVOID:**
- AnalysisTab.tsx SSE handler internals (wrap, don't open)
- Engine endpoints (`/astrologer/workspace`, `/astrologer/analyze`,
  `/horary/analyze`, `/muhurtha/find`, `/compatibility/match`,
  `/panchangam/location`, `/transit/analyze`)
- llm_service.py + KB files

**Verification:**
- npx tsc --noEmit EXIT 0
- npx next build EXIT 0 — all routes prerender
- Manual smoke test on Vercel:
  - Anonymous → /app → redirect /auth/login ✓
  - Login → /app shows CRM home ✓
  - Click "+ Add client" → modal opens, fill fields, submit ✓
  - New client appears in roster ✓
  - Click client → /app/clients/[id]/chart loads ✓
  - Switch between tabs — URL changes, browser back works ✓
  - Analysis tab: streams correctly for sample question ✓
  - Match verdict for known chart (Manyue or test): same as
    pre-refactor ✓
  - Mobile: CommandOrb + bottom nav still work ✓

**Effort: 5-8 focused work sessions over 1-2 weeks.** Big refactor
done in slices: layout shell first → per-tab route per commit →
state lift per tab per commit → onboarding-modal extraction last.

**Pending decisions before starting:**
- Q1. Layout option (A/B/C from §6 above)
- Q2. What lives on /app home (today's strip? upcoming
  consultations? activity feed? all of them?)
- Q3. /app/tools scope — just Today's Panchang + ad-hoc Muhurtha
  finder + ad-hoc Horary? Anything else?

---

### Phase 3 — Client portal pages (the killer differentiator)

**Deliverable:**
- /c/[slug] renders a public, mobile-first page for that client:
  greeting, birth details, simplified KP snapshot (Lagna / Moon /
  Sun / current MD-AD), notes timeline (newest first), "Consult
  back" WhatsApp deep-link, "Powered by DevAstroAI" footer
- /app/clients/[id]/portal renders the astrologer's preview of
  the same page + inline notes composer + "Copy URL" button
- Backend: GET /c/{slug} (public, no auth) returns
  client_snapshot + visible notes
- Backend: notes CRUD endpoints (auth-gated to client's
  astrologer):
  - POST /clients/{id}/notes
  - PATCH /clients/{id}/notes/{note_id}
  - DELETE /clients/{id}/notes/{note_id}
- Notes have: text, language (en/te), note_type (verdict/observation/qa),
  is_private (toggle), expected_resolution_date (if prediction)
- Rate limiting: 60 req/min per UUID, 600/min per IP on public route

**Files touched:**
- NEW: `app/c/[slug]/page.tsx` (server-rendered, public)
- NEW: `app/c/[slug]/_components/*` (NoteTimeline, KpSnapshot,
  ConsultBackCta, Footer)
- NEW: `app/app/clients/[id]/portal/page.tsx` (astrologer's
  preview side)
- NEW: `backend/app/routers/client_portal.py` (public GET endpoint)
- NEW: `backend/app/routers/client_notes.py` (auth-gated CRUD)
- NEW: `frontend/lib/api/hooks.ts` — add useClientPortal,
  useClientNotes, useCreateNote, etc.

**Sacred to AVOID:** chart engine, KB files, llm_service. Notes
are pure user-written text; no AI generation in v1.

**Verification:**
- Generate a test client portal URL on develop, open in private
  window, see notes
- Astrologer adds note → appears on portal page
- Astrologer toggles is_private → note disappears from portal
- "Consult back" deep-link opens WhatsApp with pre-filled message
  on iOS Safari + Android Chrome
- Telugu rendering: Noto Sans Telugu loads (NOT Helvetica fallback
  showing "sssss")
- Rate limit triggers after 60 requests in 1 minute on a single UUID
- 404 on invalid slug

**Effort: 3-5 focused sessions over 1-1.5 weeks.** Per the spec
this was estimated at 2 weeks; with the schema already in place
from Phase 1, slightly faster.

**Pending decisions before starting:**
- The 7 design questions in client-portal-spec.md (need final
  user answer; recommendations from Claude available)

---

### Phase 4 — Razorpay subscription + paywall

**Deliverable:**
- Free trial: every new astrologer gets 30 days of Plus tier
  automatically (Subscription row created at signup with
  status='trialing')
- Pricing page at `/pricing` (public) + in-app at `/app/billing`
- Razorpay checkout flow: trial → "Subscribe" → Razorpay-hosted
  checkout → UPI Autopay setup → subscription active
- Webhook handler: receives Razorpay events, updates
  subscriptions table state
- Top-up purchases: 1-tap from /app/billing
- AI quota enforcement: every Anthropic call decrements
  `ai_questions_used_this_period` or `topup_credits`. When both
  exhausted, AI features show "Quota exhausted" UI + "Buy top-up"
  CTA
- Email notifications on charge events (use Resend, integrate at
  this phase)

**Files touched:**
- NEW: `app/pricing/page.tsx` (public marketing pricing page)
- NEW: `app/app/billing/page.tsx` (subscription state UI)
- NEW: `app/app/billing/checkout/page.tsx` (Razorpay flow)
- NEW: `backend/app/routers/billing.py`
- NEW: `backend/app/routers/razorpay_webhook.py` (signed webhook)
- NEW: `backend/app/services/razorpay_client.py` (Razorpay SDK
  wrapper)
- NEW: `backend/app/services/quota.py` (decrement counter on
  AI call, enforce limits)
- NEW: `backend/app/services/email_service.py` (Resend wrapper)
- MODIFY: `backend/app/services/llm_service.py` to call
  `quota.decrement()` at call sites — **this is the sacred file,
  needs explicit user approval to modify**
- MODIFY: `app/app/clients/[id]/(analysis|muhurtha|...)` tabs to
  surface quota state + "Quota exhausted" UI

**Sacred regions touched (REQUIRES EXPLICIT APPROVAL):**
- llm_service.py — adding quota.decrement() call at each AI fire
  site. Done outside the prompt-construction code; pure side
  effect at the call boundary.
- Mandatory: regression pass on Analysis output for 4 golden charts
  before merge.

**Verification:**
- Sign up new astrologer → 30-day trial active in subscriptions
  table
- Trial period: 5 AI questions usable; 6th shows "Quota exhausted"
- Buy top-up pack ₹500 → quota balance updates; 15 more questions
  usable
- Razorpay test mode: subscribe with test card → subscription row
  status='active'
- Webhook delivers `subscription.charged` → period_end advanced
- Webhook delivers `subscription.payment_failed` →
  status='past_due'; 3-day retry, then paused
- Cancel subscription → status='canceled', accessible until
  period_end
- Refund a top-up: revert credits

**Effort: 6-10 focused sessions over 1.5-2 weeks.** Razorpay docs
+ webhook idempotency are nontrivial. Build careful, test thoroughly.

**Pending decisions before starting:**
- Final 3 spec confirmations (dad's PAN/Aadhaar/account ready;
  legal owner role confirmed; pricing locked)
- Refund policy specifics (24-hour money-back? Pro-rata? No
  refunds after first charge?)
- Dunning email copy (charge failed / payment retried / final
  warning / canceled)
- What "trial expired" looks like in UI

---

### Phase 5 — Pre-launch polish + soft launch

**Deliverable:**
- Sentry installed (frontend + backend) — `Sentry.init` with
  appropriate environments
- UptimeRobot pointing at /health
- DB backup verification — confirm Railway PITR works; test a
  restore on a sample DB
- SEO baseline: meta tags, OG tags, sitemap.xml, robots.txt,
  Schema.org JSON-LD on landing + /pricing pages
- 5-10 anchor content pages ("What is KP astrology?", "KP vs
  Vedic", "How to read a horary chart", etc.) — markdown-driven,
  for SEO
- Astrologer onboarding tour (5-step lightbox first time they
  hit /app: "Add your first client" → "Generate their chart"
  → "Send them their portal link" → "Take notes after consult"
  → "You're ready")
- Real-world testing with your father + 2-3 close astrologers
- Polish pass based on feedback

**Files touched:**
- NEW: `frontend/lib/sentry.ts` + Next.js Sentry config
- MODIFY: `backend/app/main.py` add Sentry middleware
- NEW: `frontend/app/sitemap.ts`, `app/robots.ts`
- NEW: `frontend/app/(content)/kp-astrology/page.tsx` etc. (5-10
  content pages)
- NEW: `frontend/app/app/_components/OnboardingTour.tsx`

**Effort: 1-2 weeks** depending on content writing pace.

---

### Phase 6 — Sept 9 launch

**Deliverable:**
- Final QA pass on all flows
- Soft-launch announcement to your father's network
- Public landing page tuned
- Direct outreach to 20-30 KP astrologers (WhatsApp, LinkedIn,
  word-of-mouth via dad)
- First paying astrologer milestone

**No code work — execution + outreach + monitoring.**

---

### Phase 7 (post-launch) — Phase M kickoff

Nov 2026 onwards. Cross-astrologer matching network. v1.5
release. Schema already prepped — `matching_opt_in` column on
clients. New work needed:
- Astrologer-to-astrologer chat
- Match scan algorithm + UI
- Audit log usage for match-related events
- Notification system (in-app + email)

See matching-network-spec.md for the full design.

---

### Phase 8 (post-Phase-M) — Consumer mode revival

Reopens Phase G general-user mode (currently paused). Different
product surface. Different signup flow. Different pricing model
(probably per-question pay-as-you-go). Outside Sept 9 scope.

---

## 8. The "what about all the queued PRs?" question

The BACKLOG.md has dozens of queued items across multiple tracks:
- Track A.1: Transit + Match audits (A1.4-A1.9 pending)
- Track A.1 Analysis polish: A1.3e/f/g/h/i/j/k/l/m/n/o (11
  queued items, most are AI polish)
- "Hot small wins" list: 7-8 items (24h cache TTL, frontend rate
  limit, astrologer logo on PDF, Yogini Dasha, etc.)
- "Cold" feature wishlist: 7-8 items

**Stance for the Sept 9 launch:** these are mostly NOT launch
blockers. They're quality-of-life improvements.

- The audit work (A1.4 + A1.5 + A1.8 + A1.9) IS valuable but can
  proceed in parallel with the structural shifts above. Each is a
  focused PR with a research doc + engine fix + tests. They don't
  conflict with Phase 2/3/4 work.
- The Analysis polish queue (A1.3e/f/g/h/i/j/k/l/m/n/o) is mostly
  user-visible AI UX. Cherry-pick the few highest-impact items:
  - **A1.3g (astrologer streaming)** — first tokens in <2s instead
    of 25-40s wait. Big UX win, ~1 day.
  - **A1.3e (UX polish for Analysis tab)** — visual polish on
    confidence bars, citations. Few hours.
  - Defer the rest until post-launch.
- The Hot small wins — pick **two** to ship as quick wins between
  bigger phases:
  - 24h prompt-cache TTL (~30 min, ~15% cost saving)
  - Astrologer logo on PDF cover (~2-3 hr, differentiates pro
    feature)

**Stance for everything else: defer to post-launch.** Resist scope
creep. The launch is about CRM + portal + payment, not feature
parity with KundaliGPT.

---

## 9. What we're keeping vs throwing away from current code

### Keeping wholesale (no changes)

**Backend:**
- All chart engines (chart, horary, muhurtha, panchangam, transit,
  match, compatibility, cross_chart, multi_chart)
- All KB files in `backend/knowledge/`
- All AI prompts in llm_service.py
- All routers EXCEPT auth-gating the engine endpoints (deferred —
  current public endpoints stay public until paywall ships in
  Phase 4)
- Phase 1 additions (auth, db, /me, /chart-sessions)

**Frontend tab components (engine-data-renderers):**
- `tabs/ChartTab.tsx`
- `tabs/HousesTab.tsx`
- `tabs/DashaTab.tsx`
- `tabs/AnalysisTab.tsx`
- `tabs/HoraryTab.tsx`
- `tabs/MatchTab.tsx`
- `tabs/MuhurthaTab.tsx`
- `tabs/PanchangTab.tsx`

These keep their internal logic. They get LIFTED into proper Next.js
route segments + their tab-local state moves INTO the tab files
(currently in page.tsx).

**Reusable components:**
- All workspace primitives (CSLChainView, PlanetList, TransitWheel,
  etc.)
- PersonHeroBanner (header bar — needs minor reframing as
  "client header" not "user header")
- AppToast, AnimatedScoreDonut, PageHero, etc.
- All motion tokens + primitives
- CommandOrb + mobile chrome
- The auth shell (`app/auth/_shell.tsx`)

### Keeping with reframe (same code, different presentation)

- Current onboarding form → becomes "Add new client" modal
- "Saved sessions" sidebar → becomes the CRM clients roster
- "Switch chart" dropdown → becomes "Other clients" picker
- Multi-chart pill strip → becomes "Switch client" pill strip

### Throwing away (deleted, replaced, or paused)

- The `mode === "user" | "astrologer"` toggle UI on the onboarding
  form (still in code; just removed from authenticated flow —
  the underlying mode variable can stay until consumer mode revival)
- G2 pushState code (replaced by Next.js Link / router.push)
- Auto-load logic in SessionsBridge for "most recent session"
  (replaced by route-segment-aware client switching)
- The 5400-line page.tsx itself (split across new route files)
- DashboardTab.tsx user-mode home (paused; stays in repo for
  Phase G revival)

### Sacred — NEVER throw away or modify

(see §3 above)

---

## 10. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Phase 2 refactor breaks Analysis tab streaming | Medium | High | Wrap, don't open. Golden chart regression pass mandatory before merge. Tag rollback point before refactor. |
| Phase 4 quota.decrement() in llm_service.py breaks AI quality | Low | Critical | Side effect only — never modify prompt construction. Regression pass on 4 golden charts. |
| Razorpay onboarding stalls (dad's KYC) | Medium | Medium | Start dad's Razorpay app in Week 1 of Phase 4. Have backup: defer paywall, keep free tier for early astrologers. |
| Sept 9 deadline slips due to Phase 2 size | Medium | Medium | Quality > deadline rule. Slip 2-4 weeks. Don't ship hacks. |
| User-mode chrome creeps back into authenticated flow | Low | Medium | Audit + grep for `mode === "user"` after Phase 2. Confirm consumer surfaces only render on consumer URL paths. |
| AI quota enforcement edge case (mid-stream API call) | Medium | Medium | Decrement quota BEFORE call fires. Refund on streaming failure. Test with deliberately-failed network requests. |
| Phase M schema decisions wrong (matching_opt_in column not enough) | Low | Low | Phase M is post-launch. Schema is additive — easy to extend with new columns. |
| Portal URL leak (UUID guessable) | Very Low | Medium | UUIDv4 = 2^128 entropy. Rate-limit guesses (60/min per UUID). Audit log every portal access. |

---

## 11. Pending decisions I need from you before starting Phase 2

These are the small batch of choices that block kicking off the
structural shift:

1. **Layout direction**: ✅ **DECIDED 2026-06-02** — Option A
   (Notion-style left sidebar + main content). Sidebar: Home /
   Clients / Tools / Profile / Billing.
2. **CRM home content**: ✅ **DECIDED 2026-06-02** — Today's
   panchangam strip + Recent activity feed + Clients roster
   + "+ Add client" CTA. Upcoming consultations DEFERRED
   (needs its own design pass).
3. **/app/tools scope**: ✅ **DECIDED 2026-06-02** — Tools exist
   in BOTH contexts. Per-client tabs (most common use) +
   standalone /app/tools/* for astrologer's own questions or
   quick walk-ins. Three standalone tools: Today's Panchang
   (astrologer's location), Muhurtha-finder (ad-hoc, no client
   needed), Horary (astrologer asks from current moment).
4. **Client portal Qs 1-7** (from client-portal-spec.md) —
   batch-decide before Phase 3 starts. Recommendations available.
   **PENDING (not blocking Phase 2).**
5. **Astrologer onboarding tour** — desired or skip? (lightweight
   5-step lightbox on first /app visit) **PENDING (Phase 5).**
6. **Today's appointments / consultations** — ✅ **DECIDED 2026-06-02:
   DEFERRED.** Not in launch. Needs separate design.
7. **Phase 2 starting cut**: ✅ **DECIDED 2026-06-02** — Slices
   over 4-6 weeks, each independently shippable to develop.
   You test each slice on Vercel before we move on. Lower risk
   than a big-bang push. See §7a below for the slice breakdown.

---

## 7a. Phase 2 — slice-by-slice plan (added 2026-06-02)

Each slice ships to develop independently. After each merge, you
test on Vercel; if green we proceed to the next. If any slice
breaks something, we rollback that slice and re-cut.

| # | Slice | What ships | Verify on Vercel |
|---|---|---|---|
| **S1** | Auth gate + sidebar shell | /app redirects to /auth/login when anonymous. New `app/app/layout.tsx` with Notion-style left sidebar (Home / Clients / Tools / Profile / Billing as placeholder links). Existing /app page content still renders via `{children}` — no functional change for logged-in users yet. | Anonymous: /app → /auth/login. Logged in: see sidebar + existing app. |
| **S2** | Backend clients CRUD | POST/GET/PATCH/DELETE `/clients` + `/clients/[id]`. TanStack Query hooks: useClients, useClient, useCreateClient, useUpdateClient, useDeleteClient. /health green. | curl tests of endpoints. /health all green. |
| **S3** | CRM home + Add client modal | New /app home shows today panchang strip + recent activity (stub) + clients roster (from DB) + "+ Add client" button. Modal opens current onboarding form. Submit creates `clients` + `chart_sessions` rows. Redirects to `/app/clients/[new-id]` (placeholder route in this slice — actual workspace lands in S4). | Click "+ Add client" → modal → submit → row appears in roster + browser navigates to a placeholder client page. |
| **S4** | Per-client workspace route | New `/app/clients/[id]` route. Renders existing 8-tab workspace scoped to that client. Loads client + chart_session via useClient hook. Tab switching still uses existing activeTab state + G2 pushState (not yet replaced). | Click client in roster → workspace loads with correct chart + tabs work. Analysis tab streams. Match verdict matches pre-refactor. |
| **S5a** | Per-tab routes — Chart | `/app/clients/[id]/chart` renders just ChartTab. Tab nav uses Next.js Link. Chart tab's local state moves into ChartTab.tsx (was already mostly there). | Navigate to /app/clients/[id]/chart directly. Browser back works. |
| **S5b** | Per-tab routes — Houses | Same pattern, HousesTab. | Same. |
| **S5c** | Per-tab routes — Dasha | Same pattern, DashaTab. | Same. |
| **S5d** | Per-tab routes — Analysis | Same pattern, AnalysisTab. **SACRED — wrap, don't open the SSE handler.** Move analysis-tab-local state (messages, activeTopic, chatQ, etc.) into the tab file. | Streaming still works. Multi-chart context still works. AI cost audit badge still works. |
| **S5e** | Per-tab routes — Panchang | Same pattern, PanchangTab. | Same. |
| **S5f** | Per-tab routes — Muhurtha | Same pattern, MuhurthaTab. Move all m* state (mStep, mResults, mAiMessages, etc.) into MuhurthaTab.tsx. | Muhurtha computation still works. AI Muhurtha analysis chips still work. |
| **S5g** | Per-tab routes — Match | Same pattern, MatchTab. Move matchResults, matchSubTab, matchHouseShared, etc. into MatchTab.tsx. | Match flow still works end-to-end. |
| **S5h** | Per-tab routes — Horary | Same pattern, HoraryTab. Move horaryNumber, horaryResult, horaryDiceSpin, etc. into HoraryTab.tsx. | Horary still computes verdict + RP timing. |
| **S6** | Standalone /app/tools | /app/tools (overview index) + /app/tools/panchang + /app/tools/muhurtha + /app/tools/horary. Reuse same tab components in client-less context. | Open each tool standalone — works without a client loaded. |
| **S7** | /app/profile + /app/billing | /app/profile reads + edits /me (display name, bio, photo, default language). /app/billing shows current subscription state (real billing UI lands in Phase 4). | Edit profile → PATCH /me → page reflects change. /app/billing renders "No active subscription" stub. |
| **S8** | Final cleanup | Delete old onboarding form from page.tsx. Remove "I am a / General user vs KP astrologer" toggle from authenticated flow. Remove G2 pushState code entirely (popstate listener, ?t= query param handling). Final tsc + next build + manual smoke verification. | All Phase 2 deliverables work. No regressions. |

**Total: 17 slices, but S5a-h are mechanically similar — once S5a
+ S5b prove the pattern, the rest are fast.**

**Branching strategy per slice:** create `claude/phase2-sN-<scope>`
off develop, push, you review on Vercel preview deploy or develop
deploy, merge fast-forward to develop. No long-lived branches.

**Sacred regions across all slices:** AnalysisTab.tsx SSE internals,
llm_service.py, all KB files, all KP engines. Wrap, never open.

---

## 12. The actual sequence for Sept 9

Putting it all together:

```
NOW (2026-06-02)
   ├─ Phase 2 — CRM home + route segments     [5-8 sessions]
   ├─ Phase 3 — Client portal pages           [3-5 sessions]
   ├─ Phase 4 — Razorpay subscription         [6-10 sessions]
   ├─ Phase 5 — Pre-launch polish + soft beta [1-2 weeks]
   └─ Phase 6 — Sept 9 public launch
       │
       └─ Post-launch:
          Phase 7 — Phase M (Nov 2026 v1.5)
          Phase 8 — Consumer mode revival (TBD)
```

Across these phases, **non-blocking parallel work** can also happen
on a separate branch in any spare cycles:
- Track A.1: Transit audit + fix (A1.4 + A1.5)
- Track A.1: Match audit + fix (A1.8 + A1.9)
- A1.3g: Astrologer Analysis streaming (~1 day)
- Hot small wins: 24h cache TTL bump, astrologer logo on PDF

But these never block the main path.

---

## 13. How to use this plan

**For you (the user):**
- This is the canonical plan. When I (Claude) propose anything
  outside it, push back and ask "why is this not in the plan?"
- Decisions in §11 above unblock Phase 2. Answer those when
  you're ready and we kick off.
- The "quality > deadline" rule is the standing principle —
  if anything in this plan needs more time, we slip Sept 9
  rather than ship a temporary hack.

**For future Claude sessions:**
- Read this plan first. THEN BACKLOG.md. THEN launch-tracker.md.
  THEN DAILY_LOG.md tail.
- Sacred regions still apply (§3). Re-confirm them before any
  PR.
- If the user pivots strategy, this plan needs to be updated
  explicitly, not silently superseded by conversation. Append
  a `## REVISION YYYY-MM-DD` block at the top of the file.

**For me (the orchestrating Claude, now):**
- I commit to NOT making sequencing decisions on the fly. If
  the user asks "what's next?", I point at this plan.
- If I find something missing from this plan during code work,
  I surface it before acting on it — not "by the way I also did X."

---

## 14. What this plan does NOT cover (intentional gaps)

- Detailed wireframes for the CRM home — needs visual design
  pass with user (Phase 2 kickoff)
- Specific Razorpay webhook event handlers (each event has subtle
  semantics — Phase 4 deep-dive)
- AI prompt changes for any new tab/feature — sacred regions; not
  in scope of structural refactors
- The exact 5-10 SEO content pages — content writing happens in
  Phase 5
- Phase M algorithm tuning — post-launch v1.5
- International payment processor (Stripe addition for NRI users)
  — explicitly deferred to v1.5+
- Mobile native apps — deferred (responsive web first)
- Multi-language beyond EN / TE_EN / TE — deferred

---

## 15. The single most important thing in this plan

The structural shift in §6 — reframing /app from "personal chart
form" to "CRM for managing clients". Everything else hangs off
this.

If we get §6 right:
- Phase 3 (client portal pages) plugs in naturally via
  /app/clients/[id]/portal
- Phase 4 (Razorpay) plugs in via /app/billing + paywall on AI
  endpoints
- Phase 5 (polish) is just typography + content + monitoring on
  top of a coherent product

If we DON'T get §6 right and keep patching the existing /app
onboarding flow, every subsequent phase fights against the
foundation.

**This is the most important deliverable. We get it right or we
slip the launch.**

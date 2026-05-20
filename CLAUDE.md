# DevAstroAI — Project notes for Claude Code

This file is loaded by Claude Code at every session start. It captures
the **stable architectural decisions** and **mobile UI patterns** shipped
on `develop` so future sessions can continue without re-discovering them.

For the *evolving* plan of record, read `.claude/BACKLOG.md` (Track A
queue, business model, Option A stance) and `.claude/DAILY_LOG.md`
(running journal, IST timestamps).

---

## 🔒 LOCKED v2 PLAN — read BEFORE planning any UX/architecture work

As of **2026-05-20**, the v2 roadmap is locked. The canonical doc is:

**`.claude/research/world-first-vision.md`** — read it fully before
proposing UX/architecture changes.

Headline architecture:
- **Astrologer mode**: 5 workspaces (Active Consult / My Practice / Quick Tools /
  Knowledge & Notes / Community)
- **Consumer mode**: 3 workspaces (Today / Ask / My Life)
- **Default landing per client**: Chart Briefing (7-zone home state) →
  astrologer clicks suggested chip OR types inquiry → Inquiry View loads
  composed cards
- **Inquiry-driven canvas** replaces 8-tab navigation. Tabs become "Classic
  View" toggle for users who prefer the old model.
- **Phased rollout**: A (Foundation) → B (Inquiry Bar MVP) → C (Workspaces) →
  D (Killer features) → E (Community + payments)

The earlier `.claude/research/v2-roadmap.md` is **SUPERSEDED** — do not use
it as reference. The world-first-vision.md doc replaces it.

---

## 🔒 AI ANALYSIS QUALITY PRESERVATION PROTOCOL — sacred regions

Per user direction on 2026-05-20: **the AI Analysis system is sacred.**
PRs A1.4 → A1.11 represent weeks of careful tuning. Regressions are
NOT acceptable.

**DO NOT modify without explicit user approval + regression suite pass:**
- `backend/app/services/llm_service.py` — `get_system_prompt()`, prompt blocks,
  `format_chart_for_llm`, `format_match_for_llm`, multi-model routing
- `backend/app/services/compatibility_engine.py` — `_five_signal_classification`,
  `_h7_sublord_promise`, `_planet_significations_tiered`, `_canonical_cross_match`
- `backend/knowledge/*` — all 29 KB files (esp. marriage.txt, general.txt,
  house_combinations_canonical.md, pattern_library.md, kp_csl_theory.txt,
  timing_confirmation.txt)
- `backend/app/services/chart_engine.py` — planet/cusp/sub-lord/dasha core

**Audit doc**: `.claude/research/analysis-deep-audit.md` (PR A1.9) — every
RULE 5/11/12/33 reading from this doc is canonical-locked.

**Mandatory before any AI-touching merge** (once pytest harness ships in
Phase A PR F1):
1. Golden chart fixtures (Manyue, Ramya, Vineetha, Sreeja) regression pass
2. Per-topic verdict snapshot compare (no surprise flips)
3. Output structure check (required sections present)
4. No internal label leakage (no "RULE N", "PR A1.X", "Pattern T1" in output)

**Hard rule**: any PR that breaks AI quality must be REVERTED, not patched
forward.

**For v2 work (Phases A-D)**:
- Phase A: zero AI impact (pure refactor + auth + monitoring)
- Phase B (Inquiry Bar): new Haiku call for inquiry detection — ADDITIVE,
  does not modify Analysis prompts
- Phase C (Workspaces): routing/layout only — does not touch AI engines
- Phase D: Prediction Ledger, AI Apprenticeship, Chart Briefing AI — these
  ADD new AI calls but must NOT modify existing Analysis prompts. Each
  needs its own isolated system prompt.

**The Analysis tab is the product. Everything else is scaffolding.**

---

## Repo layout (stable v1 track on `develop`)

- **Backend**: `backend/app/` — FastAPI + KP engines. `services/` contains
  the per-domain engines (`chart`, `transit_engine`, `muhurtha_engine`,
  `panchangam_engine`, `horary_engine`, `match_engine`, `telugu_terms`,
  `pdf_engine`, `llm_service`). Routers under `routers/`. **Do not touch
  the backend for Track A UI polish PRs** — the KP engines are production-
  stable.

- **Frontend**: `frontend/` — Next.js 16 App Router + React 18 + TypeScript.
  - `frontend/app/page.tsx` — polished landing page (PR2 era, stable)
  - `frontend/app/app/page.tsx` — **the main app (~6100 lines)**. All
    tabs live here.
  - `frontend/app/app/components/` — component library for the app page
  - `frontend/app/app/lib/` — small local helpers (e.g. `maskedInput.ts`)
  - `frontend/app/globals.css` — **single CSS file**, scoped per feature
    (`.horary-*`, `.muhurtha-*`, `.pc2-*`, `.match-*`, `.transit-*`,
    `.dasha-*`, `.command-orb`, `.house-panel-*`). Over 3300 lines.
  - `frontend/components/ui/` — shared primitives (logo, animated-logo-mark,
    place-picker, content-card, stat-card, dialog, badge, button, input,
    tabs, kbd, surface)
  - `frontend/hooks/` — shared hooks (`useIsMobile`, `useSheetDrag`)
  - `frontend/lib/` — `theme.ts` (design tokens + `styles` helpers),
    `i18n.tsx` (language context)

- **Preserved v2 reference**: `.claude/worktrees/v2-phase0-design/` — the
  paused SaaS rewrite (`developv2` branch @ `146a919`). **Visual
  reference only**. Don't cherry-pick functional code until Track B.

---

## Track A quality bar (PR14-PR22)

Every Track A "wow pass" PR must match this bar before it ships:

1. **Serif page hero** — gold eyebrow + DM Serif Display title + muted
   explainer subcopy, 30px title on desktop, 24px on mobile
2. **Step wizard or sub-tab bar** — `.match-subtab-bar`, `.transit-subtab-bar`
   style; horizontal pills with gold active state, active-count badges
   when useful, fade+translate entrance
3. **Breathing glow** — 4-5s gentle gold pulse on the "primary" element
   of each tab (MD card on Dasha, H7 CSL on Match, active hora on
   Panchang, verdict word on Horary)
4. **Fade+scale entrance animations** — staggered 40/80/120/160/200ms
   reveals on section cards
5. **Full i18n** — every user-facing string goes through `t(en, te)`.
   Zero hardcoded Telugu in EN mode. Language-aware lord/sign/nakshatra
   name picks via `lang === "en" ? foo_en : (foo_te || foo_en)`
6. **Premium hero cards** — gradient background
   (`rgba(201,169,110,0.06)` / `0.015`), gold top border, radial halo

## Design tokens (from `frontend/lib/theme.ts` + CSS vars)

- `--accent` = `#c9a96e` (gold)
- `--accent2` = `#e8c98a`
- `--bg` = `#09090f`, `--surface` = `#111118`, `--card` = `#16161f`,
  `--elevated` = `#1c1c28`
- `--text` = `#f0f0f0`, `--muted` = `#888899`
- `--success/green` = `#34d399`, `--warning` = `#fbbf24`, `--red` = `#f87171`
- Serif family: `'DM Serif Display', serif` (page titles, planet names,
  verdict words only — never body copy)
- Sans family: `'DM Sans', sans-serif` (everything else)
- Planet palette: `PLANET_COLORS` map in `frontend/app/app/components/constants.ts`

---

## Mobile architecture (PR20-PR24)

### Strategy — one codebase, responsive CSS

No separate mobile tree. One component, media queries handle layout.
Mobile overrides are **grep-able** via banner comments:

- `/* ═══ MOBILE LAYOUT SHELL ═══ */` — the top-level shell (sidebar hide,
  tab-bar hide, content padding)
- `/* ═══ MOBILE BREAKPOINTS ═══ */` — per-tab small fixes
- Per-feature `@media (max-width: N)` blocks colocated at the end of
  each `.feature-*` CSS section (e.g. `.dasha-*` has its own mobile
  block)

**Breakpoint**: `820px` is the shell break. Below it: hide sidebar/tab-bar,
show the CommandOrb.

### CommandOrb — the mobile nav

`frontend/app/app/components/CommandOrb.tsx` — a draggable, edge-tucking
floating orb inspired by iOS AssistiveTouch + Samsung Edge Panel.

**Shape**: 54px circle, floats `position: fixed`, uses `data-side="left|right"`
to flip orientation.

**Idle behavior**: shifts 50% into the edge via `transform: translateX(±50%)`
— orb looks like a half-moon peeking out. Inner `.command-orb-logo` is
nudged toward the visible half. Always-on gold breath
(`command-orb-idle-breath 3.8s`). Brand mark is the **Saturn LogoMark**
(from `@/components/ui/logo`), not a generic icon.

**Interactive**: `.is-dragging`, `.is-open`, `:hover`, `:focus-visible` all
bypass the tuck transform via `translateX(0) !important`. Opens on tap,
follows finger on drag (6px dead-zone distinguishes tap from drag).

**Position persistence**: `localStorage.devastroai:orb_position` stores
`{ side, yPct }`. Clamped 6%-94% to keep it on-screen.

**Sheet (`.command-sheet`)**: bottom-anchored, `max-height: 82vh`, slides
up with spring. Contains:
- Eyebrow "Jump to" + active tab serif title
- 4×2 grid of tab chips (`.command-chip`) with staggered entrance
- Quick actions: New chart, Language cycle (EN → TE+EN → TE)
- Switch chart list (only when `>1 savedSessions`)
- Swipe-down-to-dismiss on `.command-sheet-drag-zone` (PR21)

**First visit**: 6s coach pulse + tooltip, dismissed on first interaction,
persisted to `localStorage.devastroai:orb_coach_seen_v1`.

### useSheetDrag hook — swipe-to-dismiss pattern

`frontend/hooks/useSheetDrag.ts` — generic drag-to-dismiss for any bottom
sheet. Returns `{ dragProps, sheetStyle, dragging }`. Attach `dragProps`
to the handle/header element, apply `sheetStyle` to the sheet root.

- Closes at **90px distance** OR **velocity ≥ 0.6 px/ms** (natural flick)
- Elastic resistance on upward drags (can't yank above anchor)
- Animates off-screen before calling `onClose` — feels continuous

Used by CommandOrb sheet and HousePanel (mobile only).

### HousePanel mobile UX

On mobile (`isMobile` from `useIsMobile`):
- Renders `.house-panel-drag-zone` with handle bar at top
- Header becomes draggable (swipe-down closes)
- Close X upgraded from bare `×` to lucide `X` in 36×36 tap target

Desktop: handle zone hidden via CSS, header non-draggable.

### Session auto-restore — REMOVED in PR25

Previous attempts (PR22 snapshot + PR24 reload-only gate) were reverted.
The `navigationType === "reload"` detection wasn't reliable enough across
browsers to distinguish "user pulled to refresh" from "user navigated to
/app fresh", and the net result was stale charts opening when the user
intentionally wanted the onboarding flow.

**Do not re-introduce this feature without an explicit UX** — any future
session-resume should be an opt-in "Resume chart?" prompt, shipped as
part of Track B alongside auth.

**DO NOT re-add `overscroll-behavior-y: contain`** — we tried in PR22 and
it broke iOS touch scroll inside tab content. Removed in PR23. Pull-to-
refresh reload is currently accepted as a normal browser behavior.

The `localStorage` keys `devastroai:lastSnapshot`, `devastroai:savedSessions`,
and `devastroai:mode` are actively cleaned up in PR25 via a one-shot
removeItem effect, in case they linger in any user's browser from the
PR22/PR24 era.

### Masked date/time inputs

`frontend/app/app/lib/maskedInput.ts` — `formatMaskedDate` and
`formatMaskedTime` helpers. Used by `handleDateChange`, `handleTimeChange`,
`handleMNewPDateChange`, `handleMNewPTimeChange` in page.tsx.

**Key rules**:
1. **Shortening respects delete direction** — if `val.length < oldVal.length`
   we don't re-append the trailing separator. This lets backspace work
   across the separator boundary.
2. **Manual separator pads leading zero** — if user types `/` after one
   digit for date, or `:` after one digit for time, the helper expands
   to `0X/` or `0X:` and forces the separator. So `8:30` types as
   `8` → `08:` → `08:3` → `08:30`. **PR23 fix** — critical UX.

### Match tab — shared house state

`matchHouseShared` is a single state that drives both charts in the match
results grid. Tapping H5 on Person 1 expands H5 on Person 2 simultaneously.
Replaced the old `matchHouse1` / `matchHouse2` pair in PR22.

### Inline grid class (not inline styles)

The Person-1/Person-2 card grid uses `.match-people-grid` (extracted from
`gridTemplateColumns: "1fr 1fr"` inline). Mobile media query collapses to
1 column so cards get full width and participant forms fit.

---

## Shipped mobile PRs (PR20 → PR24)

| PR | Scope |
|---|---|
| PR20 | CommandOrb (draggable floating nav) + bottom sheet + mobile shell CSS |
| PR21 | Orb tucks into edge + Saturn LogoMark + always-on breath + swipe-to-dismiss (both sheets) + useSheetDrag hook |
| PR22 | Masked-input backspace fix + synced match house state + (reverted) localStorage auto-restore + match form mobile overflow |
| PR23 | Reverted overscroll-behavior (broke iOS scroll) + manual-separator-pads-zero for masked inputs |
| PR24 | (reverted) Restore-only-on-reload gate + this CLAUDE.md |
| PR25 | Reverted the localStorage session auto-restore entirely; kept masked-input helpers + CLAUDE.md + synced match houses + match mobile grid |
| PR26 | `/privacy` + `/terms` legal pages + LegalShell component + landing footer links. Closed Track A. |

---

## CURRENT TRACK — Track A.1 (backend accuracy audit)

Track A is **closed** as of 2026-04-20. The active track is **A.1 — KP engine accuracy**.

- Full scope + process + PR queue documented in `.claude/BACKLOG.md` under `## Track A.1 — Backend KP accuracy audit`.
- Research docs live in `.claude/research/{tool}-audit.md` (created per-tool; directory does not exist yet — create it with the first audit).
- Order: Horary → Panchang → Transit → Muhurtha → Match. No skipping.
- Every tool is TWO PRs: (1) research audit markdown only, user approves; (2) engine fixes with pytest golden + reference tests.
- **Analysis tab is still "don't touch directly" but backend changes CAN ripple into it** — user approved this trade-off. Every accuracy PR must include an Analysis regression note.
- **No backend tests exist.** First accuracy PR establishes the pytest harness.
- **Ayanamsa audit is the first check** on every tool. KP uses KP-Ayanamsa, NOT Lahiri.
- **Ruling Planets = current time + astrologer's current location** (not natal). May require client-side geolocation plumbing.
- **Pace is user-controlled.** No deadlines.

---

## Conventions for any new mobile PR

1. **One-codebase rule** — add `@media (max-width: N)` or `useIsMobile()`
   JSX branch. Don't fork components.
2. **Grep-able mobile tags** — if adding a new top-level block of mobile
   CSS, use a `/* ═══ MOBILE X ═══ */` banner comment.
3. **Use the existing hooks** — `useIsMobile()` for detection,
   `useSheetDrag()` for any bottom sheet.
4. **Tap targets ≥ 44px** — minimum touch target size. Check any new
   button/chip/control.
5. **Edge-tuck breathing pattern** — if adding another "always-present"
   floating element, echo `.command-orb`'s pattern: half-tuck +
   breathing glow + pop-out on interaction.
6. **Match bottom-sheet pattern** — handle bar + drag-zone + swipe to
   dismiss + elastic resistance on upward drag.
7. **Never break iOS touch scroll** — avoid `overscroll-behavior`,
   `touch-action: none` on scroll containers, fixed-height containers
   without `overflow: auto`.

---

## Onboarding flow (app/app/page.tsx)

- Entry: `setupDone = false` → show `OnboardingCard` inline in `<main>`.
- Birth details form: name / date (DD/MM/YYYY) / time (HH:MM) + AM/PM
  select / place picker (Nominatim autocomplete) / gender (Male/Female pills).
- On submit: `handleSetup()` validates, posts to `/chart/generate` and
  `/astrologer/workspace`, sets `setupDone = true`.
- "New chart" button in the sidebar (and orb sheet on mobile) opens a
  floating modal (`<NewChartModal />` — the `new-chart-modal` class).
  Modal keeps previous chart state in stash vars (`prevBirthDetailsStash`
  etc.) so cancel restores them.
- Astrologer mode: `setupDone` + `mode === "astrologer"` unlocks the
  chart-thumbs sidebar (`workspace-sidebar`) with `savedSessions` list.

## Analysis tab — DO NOT TOUCH

The Analysis tab (`activeTab === "analysis"`, line ~5716) is production-
stable AI chat. **The user has said "Analysis tab is perfect, don't touch".**
Any AI-chat work happens outside that tab.

## Language system (`frontend/lib/i18n.tsx`)

- Three modes: `"en"` (pure English) · `"te_en"` (Telugu with English
  sub-label) · `"te"` (pure Telugu, default)
- `useLanguage()` returns `{ lang, setLang, t, tField, backendLang }`
- `t(en, te)` — the only call you should ever need. Never hardcode
  Telugu strings.
- `tField(obj, base)` — picks `obj[base_en]` vs `obj[base_te]` based on lang
- `backendLang` — the language string sent to backend endpoints for AI
  generation (English backend prompts regardless, but display lang can
  be flipped)

Storage: `localStorage.devastroai:lang`.

---

## Build / verify checklist (every PR)

```bash
cd frontend
npx tsc --noEmit       # must be EXIT=0
npx next build         # must succeed, prerenders /, /app
```

Never push a PR without both passing. No tests yet (Track B adds Vitest).

---

## Phase 15 — Cosmic Craft UI revamp (2026-05-10, in develop)

Six PRs (15.1 → 15.6) added the motion-design layer. Future UI work
MUST use these primitives — never inline `@keyframes` or magic
cubic-bezier numbers in component code.

### Stack
- **motion@12** (formerly Framer Motion) — declarative React entrances,
  AnimatePresence, layout animations, gestures
- **lenis@1.3** — smooth momentum scroll (root provider)
- **Pure 2D canvas** for the cosmic backdrop (no Three.js — saved 80KB)

### Motion tokens (`frontend/lib/theme.ts` → `motion` export)
Single source of truth for every easing/duration/stagger/spring.
EVERY animation pulls from here:
- `motion.ease.reveal` — `[0.16, 1, 0.3, 1]` — default reveal/decelerate
- `motion.ease.overshoot` — `[0.34, 1.56, 0.64, 1]` — hover bounce
- `motion.ease.emphasized` — `[0.05, 0.7, 0.1, 1]` — hero entrances
- `motion.ease.breathing` — `[0.45, 0, 0.55, 1]` — continuous loops
- `motion.duration` — `instant` 120ms / `fast` 250ms / `base` 400ms /
  `slow` 600ms / `long` 1200ms / `breathing` 3800ms
- `motion.stagger` — `tight` 30ms / `base` 60ms / `relaxed` 100ms /
  `dramatic` 180ms
- `motion.spring` — `soft` / `crisp` / `elastic` / `weighty`
- `motion.distance` — `nudge` 6 / `small` 12 / `medium` 20 / `large` 32

### Primitives (`frontend/components/motion/`)
- `<MotionRoot>` — root provider (already mounted in `app/layout.tsx`).
  Wraps app in MotionConfig (reducedMotion="user") + Lenis smooth scroll.
- `<FadeIn>` — single-element entrance (fade + translateY). Props:
  `delay, distance, duration, ease, whileInView, as, inline, className, style`.
- `<StaggerChildren>` — cascade orchestrator. Children MUST be
  `<StaggerItem>` (or any motion.div with variants) for the cascade.
  Props: `gap, delay, whileInView, immediate, className, style, as`.
- `<StaggerItem>` — cascade child slot with per-item overrides.
- `<MaskReveal>` — gold sweep off content (used on every PageHero title).
  Props: `color, direction, duration, delay, ease, whileInView`.
- `<CountUp>` — animated numeric counter (0 → N tween).
  Props: `to, from, duration, delay, decimals, suffix, prefix, format,
  whileInView`.
- `<TiltCard>` — 3D-tilt on hover (subtle ~6deg perspective). Auto-disabled
  on touch devices. Props: `intensity, disableOnTouch, onClick, className, style`.

### Pattern primitives (`frontend/components/ui/`)
- `<PageHero>` — Track A serif header (eyebrow + DM Serif title with
  MaskReveal + muted subcopy). Use on EVERY app tab. Props:
  `eyebrow, title, subcopy, rightSlot, bottomGap, italic, maskColor`.
  Already deployed on Chart, Houses, Dasha, Muhurtha, Match, Horary, Analysis.
- `<AnimatedScoreDonut>` — circular score arc + count-up number
  (used in Match compatibility). Props: `score, max, color, size, duration`.
- `<CosmicBackdrop>` — pure-2D-canvas orbital scene + starfield + mouse
  parallax. Lives only on landing page hero. Auto-pauses when tab hidden.
  Props: `starCount, className, style`.

### Rules for new UI work
1. **Never inline `@keyframes` or magic cubic-bezier** in component code.
   Pull from `motion` tokens. If a new motion shape is needed, extend
   the token set in `theme.ts`.
2. **Every list of 3+ items gets `<StaggerChildren>`** unless there's a
   reason not to (e.g., user-typed messages shouldn't cascade).
3. **Every tab uses `<PageHero>`** for its top-of-page header. No more
   inline `<header className="dasha-hero">`.
4. **Reduced-motion is automatic** via MotionRoot's MotionConfig +
   global `prefers-reduced-motion` CSS block in `globals.css`. Don't
   write per-component branches.
5. **CSS hover effects use `cubic-bezier(0.16, 1, 0.3, 1)` (reveal)
   or `cubic-bezier(0.34, 1.56, 0.64, 1)` (overshoot)** — these match
   the motion tokens. Don't use `ease` or `ease-in-out` for new work.

### Per-tab signature moments (the "screenshot this" interactions)
- **Landing**: cosmic orbital backdrop (CosmicBackdrop), title mask-sweep, stats count-up
- **Chart/Houses/Dasha**: PageHero mask-sweep + house grid cascade + planet table cascade
- **Match**: AnimatedScoreDonut (arc draws + number counts up synchronously)
- **Muhurtha**: hover-lift result cards
- **All tabs**: tab-content 420ms decelerated entrance, MD card 3.6s heartbeat,
  workspace-tab active underline glow

Phase 15 docs:
- `.claude/DAILY_LOG.md` 2026-05-10 entry — full PR-by-PR breakdown
- Tag `2026-may-10-bestworkingversion` = pre-Phase-15 snapshot for rollback

---

## Phase 14 — Astrologer-grade PDF report (`pdf_engine_v2.py`)

Shipped 2026-05-07 on `claude/eager-elbakyan`. A 14-section deterministic
KP report at `backend/app/services/pdf_engine_v2.py` (~1071 lines).

**Cost: $0.** PDF is the **data layer** (chart, panchang, RPs, sigs, MD
tree, Tara Chakra, vargottama, borderline CSL, glossary). The astrologer
brings the narrative — exactly like a radiologist reads an MRI. No AI
output is ever embedded in the PDF, even in user mode (same v2 engine
serves all modes per user decision 2026-05-07).

**Excluded by design** (no strict-KP knowledge base for these — would
output wrong claims):
- Sade Sati, Kuja Dosha, Kaal Sarpa, other Parashari doshas
- Predictive narrative ("you will marry by 2027")
- Any AI-generated paragraphs

**Frontend contract** — the PDF export call MUST inject `place` into the
workspace payload (frontend reads `birthDetails.place` and adds it):
```ts
body: JSON.stringify({ ...workspaceData, place: birthDetails.place })
```
Without this the cover/birth-details section renders "—" for place.

### Workspace data shapes (gotchas)

These tripped Phase 14 three times — document them so future Claude
doesn't re-discover:

- **`workspace.dashas`** — full 9-MD list (NOT `current_dasha` alone).
  Read this for the MD tree section.
- **`workspace.csl_chains`** — keyed by **integer** `1..12` (NOT `"H1"`
  strings). Use a `_to_int_key()` tolerance helper. Field names are:
  `csl`, `csl_house`, `csl_rules`, `csl_star_lord`, `csl_star_lord_house`,
  `csl_star_lord_rules`, `csl_sub_lord`, `csl_sub_lord_house`,
  `all_significations`. NOT `sub_lord`/`star_lord`/etc.
- **`workspace.tara_chakra`** — a **dict** with `chakra.nakshatras` (a
  list of 27). Each nakshatra item has fields: `name`, `tara_name`,
  `nature`, `is_janma`. Iterating `tara_chakra` directly (as if it were
  a list) → `AttributeError`.

### ReportLab + Helvetica gotchas

- Helvetica **cannot** render Telugu glyphs — they show as "sssss".
  Render English topic labels in PDF; if Telugu is ever needed, register
  a Noto Sans Telugu TTF first.
- Helvetica **cannot** render unicode marks (✓ ★ ⚠ ℞). Replace with
  ASCII: "Yes" / "(janma)" / "!" / "R".

---

## Anthropic prompt cache TTL gotcha (Phase 13.1)

The default `cache_control: ephemeral` TTL is **5 minutes**. To use `1h`
the SDK accepts `{"type":"ephemeral","ttl":"1h"}` with no extra header.

To use **`24h`** you MUST send the beta header
`extended-cache-ttl-2025-04-11` on the request. Without it the SDK
returns a misleading error: `"Could not resolve authentication method"`
(it isn't auth — it's the missing beta flag).

PR 33 bumped all 6 `cache_control` sites to `"24h"` without the header
and broke `/astrologer/analyze-stream` (SSE failed at first chunk).
Reverted to `"1h"` in commit `1fe7c5c`. **Do not bump past 1h** until
the beta header is plumbed into `services/llm_service.py` (`anthropic.AsyncAnthropic`
client construction).

24h re-enable is on the Hot backlog — see `.claude/BACKLOG.md`.

---

## `/quick-insights` endpoint — HARD-DISABLED (Phase 13.1)

`POST /astrologer/quick-insights` raises **HTTP 410 Gone** at the top of
the function body. Defense-in-depth: even if a stale Vercel CDN bundle
still calls `loadQuickInsights()` (the frontend code was removed in
Phase 13), the backend refuses to bill. Original body kept verbatim
below the `raise` for easy re-enable behind a flag later.

Original sin: a `useEffect` fired `loadQuickInsights()` every time the
user opened the Analysis tab — burned Sonnet calls without the user
clicking anything. Visible on the Anthropic dashboard as ~$5/day.

**Do not re-enable** without:
1. Explicit user opt-in toggle ("Show quick insights on tab open?")
2. Per-chart cache hit logged to console (so user can see it's free)
3. Frontend rate limit (no fire on rapid tab toggles)

---

## Phases 1-14 polish arc (2026-05-07)

| Phase | Scope |
|---|---|
| 1-2 | Place picker UX, masked input separators, mobile shell tweaks |
| 3-4 | Chart tab content density, Panchang KP variant labels |
| 5-6 | Dasha tree polish, Match grid synced houses |
| 7 | Place picker dedup tightened to display-only (lat/lon collision OK) |
| 8-12 | Transit / Muhurtha / Horary verdict polish, RP card chrome, mobile pass |
| 13 | Cost fix arc — removed quick-insights auto-fire from frontend |
| 13.1 | Hard-disabled backend `/quick-insights` (HTTP 410) |
| 14 | PDF v2 engine (14 sections, $0, no AI, no Parashari doshas) |

PR 32 (30-day cache + dropped `today_ist`) was reverted — staleness
trade-off rejected by user. `answer_cache._TTL_SECONDS = 24 * 60 * 60`
and `make_key()` includes `_today_ist()` in current state.

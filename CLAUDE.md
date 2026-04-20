# DevAstroAI — Project notes for Claude Code

This file is loaded by Claude Code at every session start. It captures
the **stable architectural decisions** and **mobile UI patterns** shipped
on `develop` so future sessions can continue without re-discovering them.

For the *evolving* plan of record, read `.claude/BACKLOG.md` (Track A
queue, business model, Option A stance) and `.claude/DAILY_LOG.md`
(running journal, IST timestamps).

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

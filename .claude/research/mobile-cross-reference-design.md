# Mobile Cross-Reference Design Language — Phase 9 master doc

**Status**: Approved by user 2026-05-27. Implementation in progress.
**Branch**: `claude/multi-chart-analysis-fix` (push to develop per commit).
**Author**: Claude Sonnet 4.6 (1M context) — first draft this session;
extend in future sessions.
**Reading order**: read this doc FIRST before resuming Phase 9 work.

---

## 0. Why this work exists

User feedback verbatim:
> "the main problem why many ppl dont like to do it mobile is especially
> these astrology things, as you know they are detail and connection and
> combination, heavy, more interlinked. you say in our laptop we have 3
> pannels and one pannel has connections and do something in other panel
> too, and click on house it expains h4 chain or whatever. its very
> important how we will nicely and cleanly innovate in mobile. many ppl
> due to this complexity they skip mobile, but we took up the challenge"

The product is built laptop-first with a 3-panel desktop layout where
clicking an entity in one panel reveals related detail in another panel.
On mobile (single pane) that 3-panel cross-reference experience
collapses. This is why every existing KP/Vedic mobile app feels thin —
they preserve data density but lose the interlinking. Our opportunity:
ship a mobile cross-reference layer that no astrology app has built,
and that quietly enhances desktop too.

User direction:
- All 5 phases of mobile revamp NOT in scope (Phases 11 + 12 dropped —
  voice / PWA / etc. too risky for value).
- This work IS in scope (the cross-reference design language).
- Branch-wise commits. One primitive per commit. Push to develop. User
  tests on phone. Then next primitive.
- Maintainability is non-negotiable: composable primitives, single
  source of truth, no new dependencies, future Claude sessions must
  be able to extend without re-architecting.
- Future features (CRM, client appointments, notes) will slot into
  this system — design with that in mind.

---

## 1. The 8 primitives (the design language)

### ① Selection Atom — global focused-entity state

```ts
// frontend/app/app/lib/selection/types.ts
type SelectedEntity =
  | { type: "house",      value: number }                   // H7
  | { type: "planet",     value: string }                   // "Venus"
  | { type: "dasha_lord", value: string,
        layer: "MD" | "AD" | "PAD" | "SD" }
  | { type: "nakshatra",  value: string }
  | { type: "sub_lord",   value: string }
  | null;
```

ONE React Context (`SelectionContext`) holds this. Every component that
displays house/planet/dasha data subscribes via `useSelection()`. When
non-null, matching entities glow gold (extending the existing
`synced-hover-highlight` CSS class globally).

Persists across tab switches (primitive ④). Persists across the bottom
drawer states (primitive ②).

### ② Detail Drawer — draggable bottom sheet

Single persistent bottom sheet. Three snap states:
- **Peek**   (15% of viewport)
- **Default** (50%)
- **Full**    (90%)

Built on the existing `useSheetDrag` hook (frontend/hooks/useSheetDrag.ts).
Background content stays visible AND interactive — tapping a different
entity behind the drawer REPLACES drawer content (no stacking, ever).

State machine:
```
no selection             → drawer hidden
selection just made      → drawer slides up to "Default"
user drags down to peek  → drawer at "Peek" (entity name + 1-line summary)
user drags up to full    → drawer at "Full" (everything we'd show in HousePanel)
user swipes down hard    → drawer dismissed, selection cleared
new entity selected      → drawer content REPLACES, stays at current snap state
```

### ③ Long-press Peek — preview without committing

Hold any entity cell for ~400ms → small floating tooltip card appears
anchored to the touch point with key facts (sign, sub-lord, signifies,
etc.). Release finger → dismissed. While holding, drag finger UP →
upgrades to "open drawer" gesture.

**Validated in production**: Cosmic Insights (App Store, KP-aware
astrology app) uses identical pattern — *"long press on any house to
show popup information with aspects received from signs."*

Tap (no long press) = open drawer directly.

### ④ Cross-tab Persistence — selection survives navigation

Selecting Venus on Chart tab → switch to Dasha tab → Venus still
highlighted. Drawer stays at same snap state across tab switches.
Mental model preserved.

Implementation: `SelectionContext` lives at the root of the workspace
(above `activeTab` state), so tab switches don't unmount it.

### ⑤ Pin Tray — manual cross-reference holders

Small horizontal tray of 2-3 pinned entity chips, sitting just above
the bottom tab bar (or below the top context strip). User long-presses
an entity → "Pin" option appears in peek tooltip → pin added to tray.
Pins stay until cleared. Tap a pin → re-selects entity (drawer reopens,
glow updates). Long-press a pin → removes it.

Persisted to `localStorage["devastroai:pinTray"]` per chart so pins
survive page reload (but not across charts).

Tray hidden when empty. Cap: 3 pins (oldest drops when 4th added).

### ⑥ Inline Linked Chips — entity refs in AI answers become tappable

When AI Companion writes "Venus (H7 sub-lord) signifies H11", a
post-processor wraps each entity in `<EntityChip>`. Tap chip → entity
becomes global selection → all references glow → drawer opens at
Default.

Detection regex (English):
```
/\b(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\b/  → planet
/\bH(1[0-2]|[1-9])\b/                                          → house
/\b(MD|AD|PAD|SD)\b\s+([A-Za-z]+)/                             → dasha lord
```

Telugu equivalents:
```
/(సూర్యుడు|చంద్రుడు|కుజుడు|బుధుడు|గురువు|శుక్రుడు|శని|రాహువు|కేతువు)/
```

Post-processor runs once on each AI message after streaming completes.
Cached so it doesn't re-run on every render.

### ⑦ Anchor Breadcrumb — drill-down history

Top of drawer (default/full state) shows path:
```
Chart › H7 › Venus (sub lord)
```

Tap any crumb → jumps back to that selection state. Max 4 crumbs
(oldest drops). "Clear" button wipes the breadcrumb + selection.

Stack stored in `SelectionContext.history` (simple `SelectedEntity[]`
array, append on every new selection, pop on breadcrumb tap).

### ⑧ Connection Glow Strength — visual hierarchy

When entity selected, glow intensity varies by closeness:

| Relation | CSS class | Visual |
|---|---|---|
| Direct match (entity itself) | `.glow-direct`    | Strong gold border + bg highlight |
| Direct relation (lord, occupant, sub-lord) | `.glow-related` | Medium glow |
| Two-hop (lord's lord, etc.)  | `.glow-distant`   | Faint glow |
| No relation                  | `.glow-none` (default) | Normal |

Relation computation: a `useEntityRelation(entity)` hook that takes
the global selection + the entity being rendered, returns one of the
4 classes. Hook lives in `frontend/app/app/lib/selection/relation.ts`.

Glow logic uses chart_data the same way the existing significator
engine does: tap H7 → its sub-lord, occupants, lord, and their
star-lord chain are "direct relations". This data is already on
`workspaceData.significators` and `chart_summary.cusps[H_n]`.

---

## 2. The 3 research findings that validated this design

### Finding 1 — Brushing & Linking is the academic name

Multi-pane data viz pattern from bioinformatics + cybersecurity +
healthcare. Tap entity in one view, all visual references glow across
visible views. We already have local per-component hover sync
(`synced-hover-highlight` class in globals.css line 7199); making it
global is a small refactor with huge UX impact.

Sources researched:
- Tableau white paper "Enhancing Visual Analysis by Linking Multiple Views of Data"
- ArXiv 2403.15321 "Visual Highlighting for Situated Brushing and Linking"
- Dev3lop blog "Interactive Brushing and Linking in Multi-View Dashboards"

### Finding 2 — Google Maps draggable bottom sheet is proven for "detail without context loss"

Three snap states (peek / default / full). Background interactive. NN/G
explicitly calls out **stacking sheets as anti-pattern** (Walmart cited
as causing information overload). Our rule: ONE drawer, replace on new
selection.

Sources researched:
- NN/G "Bottom Sheets: Definition and UX Guidelines"
- Google Maps Android (sheet-based makeover 2024)
- Uber, Airbnb, Apple Maps (same pattern)

### Finding 3 — Long-press peek is validated for KP/astrology mobile UX

Cosmic Insights (Apple App Store, KP-aware) uses long-press for house
peek. KPNoX+ uses dasha-driven snapshot via click. Pattern is
familiar to existing astrology mobile users — no education cost.

Sources researched:
- App Store listing for Cosmic Insights Astrology
- KPNoX+ marketing page
- DashaClub mobile-optimized calculator

---

## 3. File layout (what gets added / changed)

**NEW files** (all under `frontend/app/app/lib/selection/`):
- `types.ts` — `SelectedEntity` union + related types
- `SelectionContext.tsx` — Context provider + `useSelection()` hook
- `relation.ts` — `useEntityRelation(entity)` hook for glow hierarchy
- `entityChipParser.ts` — regex-based entity detection in AI message text

**NEW components** (under `frontend/app/app/components/mobile/`):
- `BottomDrawer.tsx` — the draggable 3-state sheet (~150 lines)
- `EntityPeek.tsx` — long-press tooltip wrapper (~80 lines)
- `EntityChip.tsx` — inline tappable chip for AI answers (~50 lines)
- `PinTray.tsx` — pin tray with localStorage persistence (~120 lines)
- `BreadcrumbStrip.tsx` — drawer breadcrumb (~60 lines)
- `MobileBottomNav.tsx` — bottom tab bar (Phase 9.9) (~120 lines)
- `MobileAiOrb.tsx` — floating AI button (Phase 9.9) (~80 lines)

**CSS additions** (in `frontend/app/globals.css`):
- `.glow-direct` / `.glow-related` / `.glow-distant` classes
- BottomDrawer animations (slide up/down, snap-state transitions)
- Mobile bottom nav layout

**MODIFIED files** (minimal surgical changes):
- `frontend/app/app/page.tsx` — wrap `setupDone` content in
  `<SelectionProvider>`, add `<BottomDrawer>` mount, add bottom nav
- `frontend/app/app/tabs/ChartTab.tsx` — route existing `selectedHouse`
  through `useSelection()` instead of local prop
- `frontend/app/app/tabs/HousesTab.tsx` — same
- `frontend/app/app/components/workspace/PlanetList.tsx` — replace
  local `hoveredPlanet` with `useSelection()` for cross-component sync
- `frontend/app/app/components/SouthIndianChart.tsx` — same
- `frontend/app/app/components/HousePanel.tsx` — keep its content
  rendering but accept entity from SelectionContext instead of prop
- `frontend/app/app/tabs/AnalysisTab.tsx` — wrap AI message text in
  EntityChip parser

**DELETED**:
- The current CommandOrb's tab-switching behavior gets DEMOTED to
  power-user shortcut, OR replaced entirely by MobileBottomNav +
  MobileAiOrb. Decision deferred to Phase 9.9.

**Backend**: No changes. Pure frontend work.

---

## 4. Phased commit plan (push to develop per commit)

Each phase is one focused commit. User tests on phone after each.

| # | Commit | What ships | Files touched | Visible behavior change |
|---|---|---|---|---|
| 9.0 | `SelectionContext foundation` | `types.ts` + `SelectionContext.tsx` + `useSelection()` hook + tests | 2-3 new files | NONE — pure plumbing |
| 9.1 | `Route selectedHouse through SelectionContext` | ChartTab / HousesTab / HousePanel refactored to consume context | ~4 modified | NONE — behavior identical, state path different |
| 9.2 | `BottomDrawer component` | `BottomDrawer.tsx` + CSS animations + mount in page.tsx | 2 new, 1 modified | Drawer appears when something is selected (mobile only) |
| 9.3 | `Cross-tab persistence + global glow primitive` | `.glow-*` CSS classes + provider survives tab switches + verify in PlanetList + SouthIndianChart | 1 CSS + 2 components | Glow class works globally; selection survives nav |
| 9.4 | `EntityPeek long-press tooltip` | `EntityPeek.tsx` + wrap planet/house cells | 1 new, ~3 modified | Long-press any entity → peek tooltip |
| 9.5 | `EntityChip inline links in AI answers` | `EntityChip.tsx` + `entityChipParser.ts` + AnalysisTab integration | 2 new, 1 modified | "Venus" in AI answer → tappable chip |
| 9.6 | `PinTray with localStorage` | `PinTray.tsx` + integration with EntityPeek | 1 new, 1 modified | Long-press → Pin option → tray |
| 9.7 | `BreadcrumbStrip in drawer header` | `BreadcrumbStrip.tsx` + history in SelectionContext | 1 new, 1 modified | Drill-down trail visible in drawer |
| 9.8 | `Glow hierarchy (direct/related/distant)` | `relation.ts` hook + apply across components | 1 new, ~5 modified | Tapped entity has strongest glow, relations fade out |
| 9.9 | `Bottom tab nav + MobileAiOrb` | `MobileBottomNav.tsx` + `MobileAiOrb.tsx` + page.tsx integration + retire old CommandOrb | 2 new, 1 modified | Mobile primary navigation matches user-proposed [Chart][Dasha][Muhurtha][Horary][+More] + floating AI button |

Total estimate: ~10 commits, ~2200 lines net added across ~25 file
touches. Distributed across ~5-8 days of work with user testing in
between each commit.

---

## 5. Maintainability rules (per user directive)

1. **Single source of truth**: ONE Context (`SelectionContext`). To add
   a new entity type (e.g., "Yogini lord"), edit one union type — every
   downstream consumer picks it up automatically.

2. **Composable primitives**: All 8 primitives are standalone components
   in `components/mobile/`. Any future tab inherits the cross-reference
   layer for free by wrapping entities in `<EntityPeek>` and showing
   `useSelection()` glow classes.

3. **No new dependencies**: All built from React Context + existing
   `useSheetDrag` hook + existing CSS. No styled-components, no animation
   library, no state-management framework.

4. **Inline comment discipline**: every primitive component gets a
   block comment at the top explaining:
   - What problem it solves
   - When NOT to use it
   - Where it's currently used (grep-anchor list)

5. **Tests**: every new component gets at least a render test +
   interaction test (e.g., long-press fires after 400ms). Run via the
   existing pytest+vitest pipeline; never push if anything goes red.

6. **Future-proof for CRM/Appointments**: when those features ship,
   they get the cross-reference layer for free. A `client` entity, a
   `note` entity, an `appointment` entity can all become valid
   `SelectedEntity` types — one union edit.

7. **Desktop parity baked in**: SelectionContext provider is mounted
   for BOTH desktop and mobile. Glow classes work on both. Desktop
   benefits from global brushing & linking too (currently has only
   per-component hover sync).

---

## 6. Open decisions (locked, don't re-negotiate)

User-approved during design phase:

| Decision | Choice |
|---|---|
| Selection Atom global Context | YES |
| Drawer behavior | Appear only when something selected; dismiss via swipe-down |
| Long-press vs single-tap | Long-press = peek; single tap = open drawer |
| Mobile primary 4 tabs | Chart · Dasha · Muhurtha · Horary (Houses / Panchang / Match in +More) |
| AI as floating button | YES (Notion-style pattern), not as primary tab |
| Phases 11 + 12 (voice/PWA) | DROPPED — risk > value |
| Push-per-commit to develop | YES — user tests between commits |

---

## 7. Future Claude session — how to resume

If context compacts and a future session needs to pick up:

1. **Read this doc end-to-end first.** It's the source of truth.
2. **Check `git log --oneline origin/develop -20`** to see how many of
   the 10 phases have shipped. Each commit message starts with
   `PR Phase 9.X — [primitive name]`.
3. **Run `grep -rn "useSelection\|SelectionContext" frontend/app/`**
   to see which components have been migrated.
4. **Look at the most recent `Phase 9.X` commit's diff** to understand
   the current style/pattern in use; match that style for the next
   commit.
5. **DO NOT propose alternative architectures.** The 8 primitives are
   locked. If something doesn't fit, ask the user before deviating.
6. **DO NOT remove `useSheetDrag`** or any other existing hook —
   we built on top.
7. **DO NOT touch backend.** Pure frontend work for all of Phase 9.
8. **DO test on mobile breakpoint** (≤819px via DevTools or real device)
   before pushing. The whole point is mobile excellence.

---

## 8. Related docs (reading list for context)

- `CLAUDE.md` — project-wide architectural decisions, mobile shell
  patterns (PR20, PR21), useSheetDrag hook documentation
- `.claude/research/multi-chart-phase-5-design.md` — preceding work
  on multi-chart (Phase 5-8) — different problem, same maintainability
  discipline
- `frontend/hooks/useSheetDrag.ts` — proven swipe-to-dismiss + snap
  states; we extend this for BottomDrawer
- `frontend/hooks/useIsMobile.ts` — 820px breakpoint constant
- `frontend/app/globals.css` line 7199 — `.synced-hover-highlight`
  (the local-only precursor to our global glow primitive)

---

## 9. Change log

- **2026-05-27 v1 (Claude Sonnet 4.6 1M)** — Initial design doc.
  Captures 8 primitives + 3 findings + file plan + commit plan.
  Approved by user. Implementation starts with Phase 9.0.

Future Claude: append entries to this section after each commit lands.
Note: WHO committed (which Claude model), WHAT shipped, WHICH commit
hash, ANY deviation from the plan (and why).

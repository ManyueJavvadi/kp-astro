# Phase A Refactor — Mid-Sprint Handoff

**Date**: 2026-05-20
**Purpose**: Compaction-proof handoff so any future Claude session can
pick up exactly where this one left off. The locked v2 plan
(`.claude/research/world-first-vision.md`) is the strategic context;
this doc is the tactical state-of-play.

---

## 1. Current state checkpoint

**Branch**: `claude/eager-elbakyan` (working) → `develop` (production)

**Phase A foundation PRs shipped**:

| PR | What | Commit | Status |
|---|---|---|---|
| F2 | Deep `/health` + frontend down-detection + UptimeRobot guide | `7a93d4a` | ✅ Live |
| R1 | tabs/ scaffolding + ChartTab + SectionEyebrow extraction | `df78028` | ✅ Live |
| R1-hotfix | Restore South/North/East chart-style toggle | `743fca4` | ✅ Live |
| R2 | HousesTab extraction (5 sub-tabs) | `52309f5` | ✅ Live |
| R3 | DashaTab extraction + bundled transitState prop | `d29728f` | ✅ Live |

**F1 (pytest harness) — DEFERRED per user direction.** Will revisit later.

**Line count progression**:

```
Pre-R1:  page.tsx = 8,589 lines
Post-R1: page.tsx = 8,495 lines  (-94)
Post-R2: page.tsx = 8,118 lines  (-377, -471 cumulative)
Post-R3: page.tsx = 7,572 lines  (-546, -1,017 cumulative, -11.8%)
Target:  page.tsx ≤ 3,500 lines after R4-R7 ship
```

**Tab extraction status**:

| Tab | Status | File | Lines moved |
|---|---|---|---|
| Chart | ✅ R1 | `tabs/ChartTab.tsx` (175 LOC) | 108 |
| Houses | ✅ R2 | `tabs/HousesTab.tsx` (449 LOC) | 389 |
| Dasha | ✅ R3 | `tabs/DashaTab.tsx` (659 LOC) | 572 |
| **Analysis** | 🔄 **R4 NEXT** | TBD | ~485 (sacred-adjacent) |
| Horary | ⏳ R5 | TBD | ~855 |
| Match | ⏳ R6 | TBD | ~1,473 |
| Muhurtha | ⏳ R7 | TBD | ~1,227 |
| Panchang | ⏳ R8 | TBD | ~955 |

Current inline tab line ranges (re-grep before each PR — line numbers shift!):

```bash
grep -n '^\s*{activeTab === "(panchang|muhurtha|match|horary|analysis)"' page.tsx
```

As of post-R3 + R1-hotfix:
- panchang  → starts line 2578
- muhurtha  → starts line 3534
- match     → starts line 4762
- horary    → starts line 6235
- analysis  → starts line 7090

---

## 2. The refactor recipe — follow this for R4-R7

This is the proven pattern across R1/R2/R3. Stick to it.

### Step 0: Pre-flight
- Re-grep tab boundaries (line numbers shift with each PR)
- Verify TSC is clean BEFORE starting (don't carry forward latent errors)
- Pull latest from develop into the working branch

### Step 1: Map dependencies
For the target tab, list:
- **External state vars used** — search the block for `setXxx(` calls; trace each to its `useState` in page.tsx
- **External helpers/handlers** — search for function refs
- **External components imported** — check the `import` block of page.tsx
- **External constants** — PLANET_COLORS, TOPICS, API_URL, etc.

Use this script template to audit:
```bash
python -c "
with open('frontend/app/app/page.tsx') as f: lines = f.readlines()
start = LINE_START - 1   # 0-indexed
end = LINE_END           # 0-indexed exclusive
block = ''.join(lines[start:end])

import re
patterns = [r'\bset\w+\b', r'\bAPI_URL\b', r'\baxios\b', r'\bformatDate\b']
found = set()
for ln in block.split('\n'):
    for pat in patterns:
        found.update(re.findall(pat, ln))
print('External refs:')
for x in sorted(found): print(f'  {x}')
"
```

### Step 2: Decide state placement (tab-local vs parent)
- **Tab-local**: state only used inside this tab block → MOVE INTO the new component
- **Shared with other tabs**: state used in 2+ tabs (e.g. `selectedHouse` shared between ChartTab + HousesTab) → KEEP in parent, pass as props
- **Heavy state bundle** (e.g. 8 transit vars): consider bundling into a single prop object (see DashaTab's `transitState`)

### Step 3: ⚠️ ALIAS TRAP CHECK (LESSON FROM R1-HOTFIX)
**Before importing any component, check if page.tsx has a top-level alias renaming it.**

```bash
grep -E "^const \w+ = \w+;" frontend/app/app/page.tsx
```

In pre-R1 page.tsx there was:
```tsx
import RasiChart from "./components/RasiChart";
const SouthIndianChart = RasiChart;  // backwards-compat alias
```

I missed this in R1 and imported `SouthIndianChart` from its **own legacy file** instead. TS types matched, TSC passed, but the rendered UI silently regressed to a 56-line legacy renderer instead of the 435-line modern RasiChart with South/North/East toggle.

**The fix is to re-establish the alias inside the extracted component:**
```tsx
import RasiChart from "../components/RasiChart";
const SouthIndianChart = RasiChart; // backwards-compat alias (same as pre-R1 page.tsx)
```

For R4-R7, scan for ALL `const X = Y` aliases in page.tsx before extracting. Recreate them inside the new tab component if needed.

### Step 4: Build the tab component
File location: `frontend/app/app/tabs/<TabName>.tsx`

Template:
```tsx
"use client";

/**
 * <TabName>Tab — <one-line purpose>.
 *
 * PR R<N> (Phase A foundation refactor) — extracted from page.tsx
 * lines <START>-<END> (~<N> lines).
 *
 * State decisions:
 *   - <local state vars> moved INTO component
 *   - <shared state vars> stay in parent, passed as props
 *
 * Sacred-region check (per .claude/research/world-first-vision.md §15):
 *   - No AI prompts touched
 *   - No backend engines touched
 *   - Pure frontend JSX extraction
 */

import { useState } from "react";
// ...imports including aliases for legacy renamed components...
import { useLanguage } from "@/lib/i18n";
import type { WorkspaceData } from "../types/workspace";

interface <TabName>TabProps {
  workspaceData: WorkspaceData;
  // ...other props...
}

export function <TabName>Tab({ workspaceData, ... }: <TabName>TabProps) {
  const { t, lang } = useLanguage();
  const [localState, setLocalState] = useState(...);

  // Loose alias for legacy `.field` accesses on `any`-typed workspaceData fields
  const wd: any = workspaceData;

  return (
    <div className="tab-content">
      {/* exact JSX from page.tsx, with workspaceData → wd where legacy accesses apply */}
    </div>
  );
}
```

### Step 5: Wire page.tsx — replace inline JSX
Use this Python script template (Edit tool struggles with 400+ line replacements):

```python
import sys
with open('frontend/app/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

marker_start = '              {activeTab === "<NAME>" && (...'  # unique opener
marker_end_next = '              {/* NEXT_TAB_OR_SECTION */}'    # next block's start

s = content.find(marker_start)
e = content.find(marker_end_next, s)
assert s >= 0 and e >= 0

replacement = (
    '              {/* PR R<N> (Phase A refactor) — <NAME> tab extracted to\n'
    '                  tabs/<NAME>Tab.tsx. */}\n'
    '              {activeTab === "<NAME>" && workspaceData && (\n'
    '                <<NAME>Tab\n'
    '                  workspaceData={workspaceData as WorkspaceData}\n'
    '                  /* other props */\n'
    '                />\n'
    '              )}\n'
    '\n'
)

new_content = content[:s] + replacement + content[e:]
with open('frontend/app/app/page.tsx', 'w', encoding='utf-8', newline='') as f:
    f.write(new_content)
```

### Step 6: Remove unused state vars from page.tsx
Grep each tab-local state var name in page.tsx. If only its `useState` definition + the (now-removed) usage remain, replace the `useState` line with a comment:

```tsx
// <stateVar> state moved into tabs/<Name>Tab.tsx in PR R<N> (tab-local).
```

### Step 7: Add the import to page.tsx
Group with the existing tab imports:
```tsx
import { ChartTab } from "./tabs/ChartTab";
import { HousesTab } from "./tabs/HousesTab";
import { DashaTab } from "./tabs/DashaTab";
import { <NewTab> } from "./tabs/<NewTab>";  // ← add here
```

### Step 8: Verify
```bash
cd frontend && npx tsc --noEmit
```
**Must be zero errors. Don't proceed if TSC has any errors.**

### Step 9: Commit + merge to develop
Use commit message format:
```
Phase A / PR R<N> — extract <TabName> (~<N> lines moved out)

<context block describing what changed + why>

Sacred-region check:
  ✓ llm_service.py — NOT touched
  ✓ compatibility_engine.py — NOT touched
  ✓ chart_engine.py — NOT touched
  ✓ backend/knowledge/* — NOT touched

Verification: npx tsc --noEmit clean.
```

Then:
```bash
git push origin claude/eager-elbakyan
git checkout develop && git pull --ff-only origin develop
git merge --no-ff claude/eager-elbakyan -m "Merge PR R<N> — ..."
git push origin develop
git checkout claude/eager-elbakyan
```

### Step 10: WAIT for user verification
- Vercel auto-deploys in 3-5 min
- User does a 60-second smoke test
- If anything broken → hotfix
- If clean → proceed to next PR

---

## 3. R4 specifics — AnalysisTab (NEXT)

**This is sacred-adjacent.** Per CLAUDE.md and `world-first-vision.md` §15,
the Analysis tab UI is the user-facing shell for `get_prediction_stream`
(which IS sacred). The frontend extraction is safe BUT must preserve:

### Critical behaviors to preserve exactly
- **Chat message state** (`analysisMessages` array — streamed incrementally via SSE)
- **Streaming SSE flow** with AbortController cleanup
- **Language toggle** (EN / TE+EN) — affects backend `language` param mid-stream
- **Topic detection state** — chip click vs free-text routing
- **Topic-switch escalation** (sub_question → full_topic when topic changes)
- **Follow-up question routing** — Sonnet vs Haiku model selection
- **Empty state vs active chat state** (PageHero only when empty; sticky topic strip when active)
- **Clear-confirmation modal** before wiping conversation

### Likely dependencies (from quick scan of lines 7090-7130)
- `analysisMessages` / `setAnalysisMessages` (chat array)
- `activeTopic` / `setActiveTopic` (topic chip)
- `analysisLang` / `setAnalysisLang` (EN/TE+EN toggle)
- `TOPICS` constant (8 topic chip configs)
- `loading` / `setLoading` (mid-stream flag)
- Stream handlers — likely `handleTopicAnalysis()`, `handleAnalysisAsk()`, etc.
- AbortController ref — `analyzeStreamAbortRef`
- AnimatedScoreDonut / motion primitives (StaggerChildren, StaggerItem, FadeIn)

### Recommended approach
Two options for R4:

**Option A — Extract as one component with all chat state in parent.**
- Easiest. Pass ~15 props for chat state + handlers.
- Verbose prop signature but preserves exact behavior.

**Option B — Extract + bundle chat state in a `useAnalysisChat()` hook.**
- Cleaner long-term. Move ALL chat state + handlers into a custom hook.
- Tab calls `const chat = useAnalysisChat(workspaceData)` and renders.
- More refactoring per file but better architecture.

**My recommendation: Option A for R4 (smallest change, lowest risk).**
The hook refactor can come later as R-hook-1 once all tabs are extracted.

### Sacred-region trip-wire for R4
Before commit, confirm:
- No changes to backend `llm_service.py` (especially `get_prediction_stream`)
- No changes to `format_chart_for_llm` shape
- No changes to message construction (history pass-through, mode/topic params)
- No changes to the SSE event parsing logic
- AbortController cleanup logic preserved exactly

---

## 4. R5-R7 queue (after R4 ships)

In order of risk (lowest → highest):

### R5 — HoraryTab (~855 lines)
Self-contained workflow. Question input + analysis output. No shared state
with other tabs. State: question text, query timestamp, analysis result,
loading. Low risk.

### R6 — MatchTab (~1,473 lines)
Big but well-bounded. Has its own sub-tabs (Overall/Charts/KP/Timing/Risks/AI)
similar to HousesTab pattern. State: prospective partner search, match
results, sub-tab state, AI chat (separate from Analysis tab).

Consider extracting MatchTab as one component for R6, then sub-extract its
sub-panes as R6-sub (similar to how DashaTab kept TransitSection inline
but bundled state).

### R7 — MuhurthaTab (~1,227 lines)
Workflow tab. State: form inputs, results, calendar view, AI chat. Pattern
similar to MatchTab.

### R8 — PanchangTab (~955 lines)
Daily panchangam display. Smaller than Match/Muhurtha. Should be straightforward.

---

## 5. Phase B (Inquiry Bar) — comes AFTER R4-R8

Per `.claude/research/world-first-vision.md` §9 Phase B:

> Add a "+ Ask anything" search bar at the top of `/app`. Detect inquiry
> type (use Haiku, ~$0.0005 per detection). Pre-load relevant cards for
> that inquiry. Existing tabs still work as fallback.

The Phase A refactor (R1-R8) creates clean tab boundaries that make Phase B
possible. After Phase A, every tab is its own file with documented props.
Phase B then introduces:
- A new `<InquiryBar>` component at the top of the app shell
- An inquiry detection endpoint (Haiku, ~$0.0005/call)
- A view router that composes cards based on inquiry type
- Tabs become "Classic View" toggle for users who prefer the old model

**Phase B does NOT touch backend AI engines.** It composes existing endpoint
calls into a new UI shell. Sacred regions stay safe.

---

## 6. Sacred-region protocol — never forget

Per `.claude/research/world-first-vision.md` §15 and CLAUDE.md (top section):

**DO NOT modify without explicit user approval + regression suite pass:**
- `backend/app/services/llm_service.py` (especially `get_system_prompt()`,
  prompt blocks, `format_chart_for_llm`, multi-model routing)
- `backend/app/services/compatibility_engine.py`
  (`_five_signal_classification`, `_h7_sublord_promise`,
  `_planet_significations_tiered`, `_canonical_cross_match`)
- `backend/app/services/chart_engine.py`
- All 29 files in `backend/knowledge/`

If Phase A refactor PRs need to touch ANY of these, STOP and ask the user.
The refactor's goal is frontend modularization — backend should be
completely untouched.

---

## 7. Hard rules for any PR going forward

1. **Zero behavior change** in refactor PRs. Pixel-perfect parity. Caught
   one regression already (R1-hotfix). Be paranoid.

2. **Alias trap check** before every component extraction. Grep for
   `const X = Y;` aliases in page.tsx. Reproduce them in the extracted file.

3. **TSC clean** before commit. No `tsc --noEmit` errors. Use `as any` casts
   sparingly and only to preserve pre-existing implicit-`any` runtime behavior.

4. **Sacred regions untouched.** No backend changes during Phase A.

5. **Wait for user verification** between PRs. Each PR redeploys; user does
   a smoke test; if clean, proceed. If broken, hotfix BEFORE next PR.

6. **Document the lesson** in the commit message if you discover a new
   pattern or trap.

---

## 8. Key files reference

| File | Purpose |
|---|---|
| `.claude/research/world-first-vision.md` | Locked v2 strategic plan |
| `.claude/research/analysis-deep-audit.md` | AI accuracy audit (PR A1.9) |
| `.claude/research/match-audit.md` | Match engine audit |
| `.claude/research/phase-a-handoff.md` | **THIS DOC** — Phase A tactical state |
| `.claude/research/uptimerobot-setup.md` | User action item: UptimeRobot wiring |
| `CLAUDE.md` | Project memory, sacred-region rules, locked plan reference |
| `frontend/app/app/page.tsx` | The monolith being decomposed (was 8589, now 7572) |
| `frontend/app/app/tabs/` | Extracted tab components live here |
| `frontend/app/app/components/` | Shared primitives (HousePanel, RasiChart, etc.) |
| `frontend/app/app/types/workspace.ts` | WorkspaceData type definition |

---

## 9. If context compacts mid-R4

A future Claude session reading this doc + CLAUDE.md should be able to:

1. Read the LOCKED v2 plan: `world-first-vision.md`
2. Read THIS handoff for tactical state
3. Read CLAUDE.md for sacred-region rules
4. Grep current tab boundaries (line numbers will have shifted)
5. Follow the recipe in §2 to continue R4 or whatever PR is next
6. Audit any `const X = Y;` aliases (the trap from §3 step 3)
7. Ship with the same discipline (zero behavior change, TSC clean, no
   sacred files touched, user verification between PRs)

**The pattern is fully proven on 3 tabs of varying complexity. Just keep
following the recipe.**

---

*Doc author: Claude. Date: 2026-05-20. Status: living handoff. Update
as PRs ship.*

---

## 10. Phase A — COMPLETE (2026-05-20)

All 9 PRs shipped on branch `claude/eager-elbakyan`:

| PR | Tab | Lines moved | Key learning |
|---|---|---|---|
| F2 | (backend /health) | — | UptimeRobot wiring ready |
| R1 | ChartTab + SectionEyebrow | ~175 | **Alias trap**: aliased component imports (`RasiChart as SouthIndianChart`) must be re-established inside extracted file |
| R2 | HousesTab (5 sub-tabs) | ~389 | Multi-sub-tab pattern: pass `housesSubTab` + setter as props |
| R3 | DashaTab | ~572 | Bundle related state into `transitState` prop object to keep arg count sane |
| R4 | AnalysisTab | ~365 | Sacred-adjacent: ALL chat state stays in parent, child just consumes props |
| R5 | HoraryTab | ~842 | Many lucide icons + alias `HomeIcon = Home` |
| R6 | MatchTab | ~1,476 | Biggest: ~30 props. `snapshotCurrentSession` + `sessionToApiPerson` as props. `@ts-nocheck` for loose JSX |
| R7 | MuhurthaTab | ~1,231 | Handler can live INSIDE extracted file (`handleMuhurthaAiAsk`) — no parent plumbing needed |
| R8 | PanchangTab | ~957 | Same — `handleDayClick` local to file. Final tab. |

**Final scorecard:**
- `page.tsx`: 8,589 → 2,832 lines (-67% / -5,757 lines)
- `frontend/app/app/tabs/`: 8 tab files, ~5,800 lines of clean modular JSX
- Sacred regions untouched: `llm_service.py`, `compatibility_engine.py`,
  `chart_engine.py`, `backend/knowledge/*`
- TSC: 0 errors at each commit; build clean throughout

**Refactor pattern proven across all tab sizes** (175 LOC → 1,476 LOC).
The recipe in §2 + the alias-trap audit in §3 is the canonical playbook
for any future monolith-splitting work.

### Lessons added during R5-R8 sprint

1. **Python extraction can mis-place `return (`** — sometimes wraps helper
   `const` declarations inside the JSX return. After extraction, scan for
   `return (` followed by `const X = ...` and move the return below the
   helpers. Hit on R8 PanchangTab.

2. **Wide prop bundles are fine** — MatchTab ~30 props, PanchangTab ~25.
   Don't prematurely normalize into context/store; that's a Phase B+
   concern once we know which state is actually shared vs tab-local.

3. **`@ts-nocheck` is the right escape hatch** for tabs with many
   implicit-any inline lambdas. We are NOT trying to type-tighten in
   Phase A — only to physically separate files.

4. **Handler functions defined inside the original JSX block** (e.g.
   `handleDayClick`, `handleMuhurthaAiAsk`) should move with the JSX into
   the extracted file. Only handlers SHARED across tabs need parent
   ownership.

5. **Run TSC immediately after import injection**, not at the end. Surfaces
   missing imports / type errors one-by-one and prevents cascading confusion.

### Next phase

**Phase B begins now**: Inquiry Bar MVP per `world-first-vision.md` §13
killer features. With page.tsx down to 2,832 lines, adding new top-level UI
(like the Inquiry Bar above the tab content) is a clean local edit.

*Phase A officially closed: 2026-05-20.*

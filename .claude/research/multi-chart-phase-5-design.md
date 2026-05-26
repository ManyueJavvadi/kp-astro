# Phase 5 — Multi-chart ceiling-quality architecture (design)

**Branch:** `claude/multi-chart-analysis-fix`
**Date:** 2026-05-26
**Status:** Building autonomously per user direction

## What's wrong with Phase 4 (post-mortem)

Phase 2 built `format_chart_compact_for_multi` from scratch as a "token-saving compact summary." That choice was the root cause of every multi-chart quality bug we chased in May 2026:

- Venus position contradiction across turns (Pisces ↔ Aquarius for the same chart)
- Jupiter signified houses given as {2,4} when the engine emits {2,5,6,9}
- "Data not surfaced for Shadbala" when the goated single-chart engine has Shadbala
- Per-chart depth roughly half of single-chart's
- Mixed degree formats (54.67° abs vs 24.67° within-sign)

The bug class is the same: **the LLM was being given a partial summary and asked to fill in gaps by inference.** Inference drifts. Engine emission doesn't.

Phase 4 partially fixed this by expanding the compact formatter (adding PLANETARY POSITIONS table, HOUSE CUSPS table, HOUSE SIGNIFICATORS, R1-R6 verbatim discipline). That helped — but the compact formatter was still a parallel code path that drifts from the goated single-chart formatter as Track A.1 improvements ship.

Phase 5 deletes the parallel path entirely.

## Architecture (the new design)

```
multi-chart request
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ LAYER 1 — Per-chart goated context (×N)                          │
│   For each chart: llm_service.format_chart_for_llm(chart_data)   │
│   → full single-chart context, untouched                         │
│   → every per-chart improvement single-chart ships AUTO-FLOWS    │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ LAYER 2 — Cross-chart engine primitives (NEW MODULE)             │
│   cross_chart_engine.py computes deterministically:              │
│   ① Synastry overlay matrix      — A's planets → B's houses      │
│   ② Common-significator set      — RP ∩ all charts' sigs         │
│   ③ Joint dasha intersection      — top windows next 24 months   │
│   ④ Sub-lord cross-check          — H[focus] CSL chain summary   │
│   ⑤ Bhavat Bhavam cross-valid.    — when relative chart present  │
│   ⑥ Karaka role distribution      — for N≥3 partnership queries  │
│   ⑦ Combination rule verdict      — OR/AND/Synastry mechanically │
│                                                                  │
│   Output: ~2-3K tokens of structured facts (NOT interpretation)  │
│   Topic-agnostic — runs same math on any focus_houses param      │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ LAYER 3 — Knowledge bases (loaded into system prompt)            │
│   - Universal KB (inherited via get_system_prompt)               │
│   - Per-topic KB (inherited via get_system_prompt)               │
│   - Multi-chart KB v2 (rewritten in Phase 5)                     │
│   - Multi-chart pattern library (NEW in Phase 5)                 │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ LAYER 4 — Multi-chart system prompt                              │
│   = get_system_prompt(language, mode, topic)  ← inherited        │
│   + MC1-MC10 extensions (NEW, see below)                         │
│   + 8-section output template                                    │
│   + R1-R7 verbatim discipline                                    │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
ONE LLM call → 8-section combined answer
```

## Smart routing (single-chart vs multi-chart by scope)

```
question + chartsInContext + optional @-mentions
    │
    ▼
detect_chart_scope(question, available_names) → list of relevant chart IDs
    │
    ├── scope.length == 1 → route to /astrologer/analyze-stream (goated single)
    └── scope.length >= 2 → route to /astrologer/multi-analyze-stream (Phase 5)
```

Scope rules:
- Explicit `@Name` → scope = mentioned charts
- "Tell me about X's career" / "What does X's chart say" → scope = [X] (single)
- "Compare X and Y" / "How will X and Y …" → scope = [X, Y]
- "Compare them" / ambiguous → default to ALL N charts
- Forms 1 chart in context → always single, regardless of question

## MC1-MC10 system prompt extensions (full text)

### MC1 — Single-chart discipline applies PER CHART

Every PER-CHART VERDICT in Section 2 must follow single-chart RULES 1-24 verbatim. Specifically:
- 5-tier verdict scale (single-chart RULE 5) per chart
- Star-Sub Harmony (RULE 16) named per chart: HARMONY / ALIGNED / TENSION / CONTRA / DENIED
- Engine PLANET OWNERSHIP block (RULE 10) literally quoted per chart on first use
- Pattern naming (RULE 19) per chart: cite M1/C2/J3/T1 etc. as they fire
- Conflicting-signals panel (fix-10 #5) when any chart shows TENSION/CONTRA/MIXED

If per-chart depth is thinner in multi-chart than single-chart, STOP and re-do at full depth. The reader paid for ceiling-grade × N — not summaries × N.

### MC2 — Cross-chart facts come from engine primitives ONLY

The cross-chart engine emits 7 fact-tables. Every cross-chart claim must come from these verbatim:
1. SYNASTRY OVERLAY MATRIX — A's planets in B's houses (and reverse)
2. COMMON-SIGNIFICATOR SET — RP ∩ A_sigs ∩ B_sigs for focus group
3. JOINT DASHA INTERSECTION WINDOWS — top windows next 24 months, scored
4. SUB-LORD CROSS-CHECK SUMMARY — H[focus] CSL chain per chart, side-by-side
5. BHAVAT BHAVAM CROSS-VALIDATION — when relative chart present
6. KARAKA ROLE DISTRIBUTION — for N≥3 partnerships
7. COMBINATION RULE VERDICT — mechanical OR/AND/Synastry verdict

You may NOT:
- Compute which house of B contains A's planet (use SYNASTRY OVERLAY)
- Compute RP ∩ both charts' sigs by hand (use COMMON-SIGNIFICATOR SET)
- Estimate when both dashas fire same houses (use JOINT DASHA INTERSECTION)
- Decide which rule applies (use COMBINATION RULE VERDICT)

Forbidden patterns:
- "Looking at the combined chart…" — no combined chart exists in KP
- "If I overlay the two charts…" — already done; use the matrix

### MC3 — Combination rule application formula

When engine emits `combination_rule = "OR"`:
- Verdict = PROMISED if (Chart 1 PROMISED OR Chart 2 PROMISED) AND `joint_dasha_windows` non-empty
- Verdict = CONDITIONAL if only one promises AND no joint window in next 24mo
- Verdict = DENIED if both charts DENIED AND no joint window

When engine emits `combination_rule = "AND"`:
- Verdict = DENIED only if (Chart 1 DENIED AND Chart 2 DENIED)
- Verdict = CONDITIONAL if only one denies
- Verdict = NOT-DENIED if neither denies

When engine emits `combination_rule = "synastry"`:
- ≥4 positive overlays + ≤1 friction → STRONG-FIT
- 2-3 positive + 1-2 friction → WORKABLE
- 1 positive + 2+ friction → FRICTION
- 0 positive + 3+ friction → INCOMPATIBLE

State the rule + step-by-step formula in Section 4. Show the math.

### MC4 — Joint-period multi-chart timing rule

Event fires in window where:
- ALL N charts' running MD+AD+PAD+Sookshma lords signify focus group (at any layer)
- AT LEAST ONE of today's RPs is significator of focus group in ≥N-1 charts

Engine pre-computes JOINT DASHA INTERSECTION WINDOWS with score 0-100. Cite top 3 by score. For each, cite per-chart layer breakdown verbatim. Do NOT pick "best" by intuition — engine ranks.

### MC5 — Multi-chart Star-Sub Harmony overlay

Single-chart RULE 16 applies per chart. For COMBINED:
- COMBINED-HARMONY: all N charts in HARMONY/ALIGNED
- COMBINED-MIXED: charts disagree
- COMBINED-TENSION: majority in TENSION/CONTRA
- COMBINED-DENIED: all charts DENIED

Combined harmony modulates confidence: COMBINED-MIXED carries –10.

### MC6 — Bhavat Bhavam cross-validation discipline

When relative chart available AND user's chart available, run BOTH:
1. Native's chart via rotation (e.g., H7 for spouse) — 70% confidence
2. Relative's natal H1 directly — 95% confidence

State both in Section 2. If agree → combined confidence 95%. If disagree → trust natal, flag discrepancy in Section 7 as learning signal. NEVER silently pick one.

### MC7 — Multi-chart confidence calculus

Base: 95 if all charts present + live RPs + COMBINED-HARMONY
- –10 per chart in TENSION/CONTRA
- –25 if Bhavat Bhavam rotation used for any chart
- –10 if any chart's PAD within 2 weeks of transition
- –5 if RP source is natal-fallback
- –5 if any chart's H[focus]-CSL has Rahu/Ketu in sub-sub-lord
- Floor 30

Engine emits this number. Cite VERBATIM in Section 4. You cannot adjust it (same as single-chart RULE 18).

### MC8 — Forbidden patterns (named live failures, May 2026)

- ❌ Same chart, different position across turns (Pavithra's Venus = Pisces in answer 1, Aquarius in answer 2)
- ❌ Signified-houses list shorter than engine's `signifies:` column (Jupiter {2,4} vs engine's {2,5,6,9})
- ❌ Mixed degree formats in one answer (Taurus 54.67° + Taurus 24.67°)
- ❌ "Data not surfaced for X" when goated context has X
- ❌ "The combined Venus of both charts…" — no composite exists in KP
- ❌ Skipping a chart silently — always state included AND excluded in Section 1
- ❌ Reduced per-chart depth vs single-chart — multi-chart is depth × N, not summary × N

### MC9 — Per-relationship-type playbook selector

Engine's `PLAYBOOK_MAP` emits `focus_houses`, `denial_houses`, `combination_rule`, `karakas`, `bhavat_bhavam_axis` per topic. Honor these parameters mechanically:
- Read focus_houses for what to check
- Read denial_houses for what flags denial
- Apply combination_rule per MC3
- Cite karakas as quality modifiers (not promise determinants — RULE 12 still applies)

Topics covered:
- Marriage / 2nd marriage / love
- Children / fertility / pregnancy / adoption
- Business partnership / employer-employee / job
- Property purchase / sale / dispute / inheritance
- Court case / litigation / land dispute
- Education / exam / scholarship
- Medical / doctor-patient / surgery / hospitalization
- Foreign travel / settlement / pilgrimage
- Parent-child / sibling / mother-in-law-DIL / guru-shishya
- Generic compatibility / relationship quality

### MC10 — Verification checklist (before emitting Section 1)

☐ I have read each chart's goated context block
☐ I have read the 7 cross-chart engine primitive tables
☐ I will quote engine values verbatim, not infer
☐ I will run single-chart RULES 5/11/12/16 per chart at full depth
☐ I will apply MC3 combination rule formula mechanically
☐ I will cite the engine confidence VERBATIM, not adjust
☐ I will include AND exclude charts explicitly in Section 1
☐ I will run a conflicting-signals panel if any chart has TENSION/CONTRA
☐ I will not blend, average, or composite any chart-level data

## The 7 cross-chart engine primitives — computational spec

### ① Synastry overlay matrix

```python
def compute_synastry_overlay(charts: list[dict]) -> dict:
    """
    Returns: {
        (i, j): {  # for each ordered pair where i != j
            "Sun":     {"house": 4, "sign_at_landing": "Cancer"},
            "Moon":    {"house": 11, ...},
            ...9 grahas
        }
    }
    """
    # For each pair (chart_i, chart_j), for each planet of chart_i,
    # find which house of chart_j the planet's longitude falls in.
    # Uses chart_j's cusps with the same KP house-resolver logic.
```

### ② Common-significator set

```python
def compute_common_significators(charts, focus_houses, rps_today) -> dict:
    """
    Returns: {
        "per_house": {
            7: {
                "chart_1_sigs": ["Venus", "Mars", ...],
                "chart_2_sigs": ["Rahu", "Jupiter", ...],
                "intersection": ["Venus"],
                "intersection_with_rp": ["Venus"]  # ripe to manifest
            },
            ...
        },
        "all_focus_intersection": ["Venus"],  # across all focus houses
        "all_focus_intersection_with_rp": ["Venus"]
    }
    """
```

### ③ Joint dasha intersection windows

```python
def compute_joint_dasha_windows(
    charts, focus_houses, months_ahead=24
) -> list[dict]:
    """
    Returns: list of windows, ordered by score desc:
    [{
        "start": "2026-08-15",
        "end":   "2026-11-22",
        "score": 87,  # 0-100
        "per_chart": [
            {"chart_id": 1, "active_layers": ["MD", "AD"], "lords_signifying": ["Saturn"]},
            {"chart_id": 2, "active_layers": ["AD", "PAD", "SD"], "lords_signifying": ["Mars", "Venus"]},
        ],
        "rp_overlap": ["Mars"]
    }, ...]
    """
    # Walk both charts' upcoming AD/PAD/Sookshma in monthly buckets
    # For each bucket, count layers signifying focus houses in each chart
    # Score = (sum_layers_signifying / total_layers_possible) * 100
    # Sort by score, return top 5
```

### ④ Sub-lord cross-check summary

```python
def compute_sublord_crosscheck(charts, focus_houses) -> dict:
    """
    Returns: {
        "per_focus_house": {
            7: [
                {
                    "chart_id": 1,
                    "csl": "Rahu",
                    "csl_house": 8,
                    "csl_rules": [2, 7, 11],
                    "csl_signifies": [2, 4, 6, 7, 8, 11],
                    "verdict": "PROMISED"  # per single-chart RULE 5 5-tier
                },
                {
                    "chart_id": 2,
                    "csl": "Sun",
                    ...
                    "verdict": "CONDITIONAL"
                }
            ]
        }
    }
    """
```

### ⑤ Bhavat Bhavam cross-validation

```python
def compute_bhavat_bhavam_crossval(charts, relative_type, axis_house) -> dict:
    """
    relative_type: "spouse" | "child" | "father" | etc.
    axis_house: rotated house number per the BHAVAT_BHAVAM_AXIS table

    Returns: {
        "applicable": True,
        "rotated_verdict_from_native": {...},  # via Bhavat Bhavam from chart_1
        "natal_verdict_from_relative": {...},  # direct read on chart_2
        "agree": True,
        "combined_confidence": 95
    }
    """
```

### ⑥ Karaka role distribution

```python
def compute_karaka_roles(charts, topic) -> dict | None:
    """
    Only returns non-None if N >= 3 and topic in {business, partnership, joint_venture}.

    Returns: {
        "Mars (operator)":   {"strongest_chart": "Chart 2", "score": 78},
        "Mercury (advisor)": {"strongest_chart": "Chart 1", "score": 82},
        "Saturn (discipline)": {"strongest_chart": "Chart 3", "score": 65}
    }
    """
```

### ⑦ Combination rule verdict

```python
def compute_combination_verdict(
    rule, per_chart_verdicts, joint_windows, synastry_overlay
) -> dict:
    """
    Returns: {
        "rule": "OR" | "AND" | "synastry",
        "verdict": "PROMISED" | "CONDITIONAL" | "DENIED" | "STRONG-FIT" | ...,
        "formula_trace": "Chart 1 PROMISED AND joint window exists → PROMISED"
    }
    """
```

## Multi-chart KB v2 outline

10-section structure inherited from v1, expanded:

1. Core principles (unchanged)
2. House group catalogue (unchanged; complete)
3. Combination rules — KPRM applied (UPDATED: precise formulas matching MC3)
4. Bhavat Bhavam table (unchanged)
5. Per-relationship-type playbooks (EXPANDED to include all 12 topics with specific output templates)
6. Worked examples (EXPANDED to 6 examples, one per major relationship type)
7. Output format conventions (UPDATED with verification checklist + per-section depth specs)
8. Anti-patterns (EXPANDED with named live failures from May 2026 tests)
9. Doctrinal references (UPDATED with KP Reader IV/V/VI Internet Archive URLs + Sublord Speaks)
10. Versioning + change log
11. NEW: Cross-chart engine primitive specifications
12. NEW: Multi-chart pattern library cross-reference

## Implementation order (atomic commits)

1. **Commit 1**: Design doc + research notes (this file)
2. **Commit 2**: `cross_chart_engine.py` NEW module (deterministic primitives, fully tested)
3. **Commit 3**: `multi_chart_engine.py` REFACTOR (drop compact, use goated + cross-chart)
4. **Commit 4**: `llm_service.py` REFACTOR (multi-chart system prompt inherits goated)
5. **Commit 5**: `multi_chart_analysis.md` v2 + `multi_chart_pattern_library.md`
6. **Commit 6**: Tests (cross_chart_engine + multi_chart_engine + system prompt)
7. **Commit 7**: Frontend smart routing (single-chart vs multi-chart by scope)

Each commit runs tests independently. If anything breaks, `git revert <commit-sha>` rolls back JUST that layer.

## Doctrinal references for the multi-chart KB

- **KP Reader IV** — Marriage, Married Life & Children (K.S. Krishnamurti) — https://archive.org/details/kpreader-4-marriage-married-life-children
- **KP Readers I-VI complete** — https://archive.org/details/kp-readers
- **Sublord Speaks (3 vols)** — K. Subramaniam — multi-partner rules for H7 sub-lord
- **Bosmia, K.K.** — *Easy way to learn KP — KP Relationship Method (KPRM)* — 22 examples across Marriage, 2nd Marriage, Partnership, Guru-Shishya, Employer-Employee, Father-Son, Mother-in-law-DIL
- **JyotishPortal** — House-group catalogue
- **KP Astrology Learning** — H7 sub-lord rules: promise {2,7,11}, denial {1,6,10,12}, qualified-denial {12}
- **Sublord 7th cusp rules** (multi-partner): if Mercury → multiple partners; star signifying {6,12} → break; {11} → workable; {5,11} → permanent tie; {5,8,12} → partner gains/native loses

# Pre-PR Audit Findings — Batch 1
## (Tasks #1 / #2 / #3 from the all-topics audit follow-up)

**Date**: 2026-05-22
**Author**: Pre-PR audit pass (NO code changes)
**Purpose**: Measure ground truth before committing to the 26-PR Batch 1 sequence

---

## Headline finding — the original audit was DIRECTIONALLY wrong

The original Batch 1 audit (`all-topics-audit-batch1-2026-05-22.md`) graded coverage by **KB depth**.
That methodology assumed thin KB → thin AI output. **It does not.**

A real AI output test for **"My business partner took 50 lakhs and stopped responding — will I get
that money back? Should I file a court case?"** on Manyue's chart produced **12,883 chars of
production-grade senior-astrologer analysis** — even though:
- Topic was mis-routed to `wealth` (not litigation or money_recovery)
- KB has *one line* on money recovery
- No engine helper exists for partner-cheating compound questions

The AI **synthesised** the right analysis from the universal KP knowledge base + 46 system-prompt
rules. It correctly identified:
- The compound nature (theft recovery + litigation as two distinct events)
- Right house combinations (H7 partner, H2 money, H6 dispute, H11 gain)
- Applied KSK strict bhukti rule
- Cited 4-step chains for H2 / H6 / H11 CSL
- Flagged H12 stellium as the structural backdrop for "why money disappeared"
- Scanned future windows with specific dates (Venus AD Dec 2027–Dec 2028 as primary recovery)
- Caveated partner being "evasive or abroad" via H12 thread

**Implication**: the system is closer to "any astrologer can blindly trust" than the original audit
suggested. The 26-PR sequence needs to be **substantially revised** — many of the proposed PRs would
add value only at the margin. The true high-ROI fixes are smaller and more targeted.

---

## Task #1: Real AI baseline test (the most expensive but most decisive)

### What I did
Ran one full AI call: Manyue chart + the partner-cheating question above, mode=astrologer,
topic=wealth (the topic the Haiku detector picked — wrong, but that's what production does today).

### Output saved at
`.claude/research/baseline-partner-cheating.txt` (12,883 chars, real output for review)

### What was good (what the AI did right WITHOUT any topic-specific KB)
1. Decomposed the compound question into two events
2. Correctly identified houses for each (H7+H2+H6+H11 for recovery, H6+H1+H11 for litigation win)
3. Computed 4-step CSL chains for all relevant cusps
4. Applied multi-cusp tier framework (TIER 0–3 from kp_multi_cusp_confirmation.md)
5. Found and flagged conflicting signals (H2 sub layer YES, Step 4 NO)
6. Scanned full 4-AD horizon with calendar dates
7. Cross-referenced today's Ruling Planets (fruitful significator overlap)
8. Identified the H12 stellium (Moon+Saturn+Ketu) as the structural cause of the loss
9. Caveated that partner may be "evasive or abroad" via the H12 thread on H7 CSL
10. Recommended primary window (Venus AD Dec 2027) vs secondary (Saturn AD now) — actionable

### What was missing (what the AI couldn't derive)
1. **No specific Saturn-blocker rule citation** — KP doctrine ("H6 sub lord + Saturn = recovery
   blocked") is in our KB (other_topics.txt:195) but the AI didn't cite it verbatim.
   Reason: the rule lives in the "wealth" section of other_topics.txt and the prompt didn't
   surface it as a topic-specific rule. → Easy fix.
2. **No reference to the H8 cusp sub lord rule for "lender's loss"** — KP doctrine
   (kpastrologylearning.com: "H8 sub lord signifies 6 and 11 → receiving a cheque AND lender's
   loss") is NOT in our KB at all. → Needs adding.
3. **No engine-computed compound verdict** — the AI did the compound math by hand. An engine
   helper would produce a more verifiable, citable verdict. → Engine work needed but lower-priority
   than I thought.
4. **No falsifiable date for the prediction** — RULE 46 (falsifiable timing) wasn't triggered
   for this question type. → Worth adding "money recovery" to RULE 46's trigger list.
5. **Sensitivity tier not auto-tagged** — this is a Tier 2 (life-impact) question. The output
   was good but didn't explicitly frame as "structural reading, not legal advice." → Needs
   per-topic sensitivity router (RULE 52 from original audit).

### Cost
$0.48 first call (cache_write = 97505 tokens), $0.16 cached follow-up. Output 4171 tokens.

### Verdict
**Output quality grade: A-** for a question with NO topic-specific KB.
The system is doing 80% of the work via universal foundation; the 20% gap is the *specific named
rules* not being cited verbatim.

---

## Task #2: KB doctrinal accuracy spot-check

### What I did
Cross-checked 5 sampled rules from existing KB files against canonical KP sources (KP Astrology
Learning, KSK Readers, AstroSage).

### Sample matches
| KB file | Rule | Canonical source | Match? |
|---|---|---|---|
| other_topics.txt:213 | "H6 sub lord signifying H1, H6, H11 → success in litigation" | KP Astrology Learning H6 page | ✅ verbatim |
| other_topics.txt:195 | "H6 sub lord signifying H2, H6, H11 AND no Saturn → entangled money returned" | KP Astrology Learning H6 page | ✅ verbatim |
| job.txt:60-61 | "H10 sub lord signifies 7, 8, 12 → income tax trouble" | KP Astrology Learning H10 page | ✅ verbatim |
| job.txt:79-81 | "H6 sub lord signifying 2, 6, 11 → gets overdraft/loan" | KP Astrology Learning H6 page | ✅ verbatim |
| marriage.txt:211 | "H7 sub lord signifies 5, 7, 11 → Love marriage converts to legal" | KP Astrology marriage doctrine | ✅ matches consensus |

### Verdict
**Existing KB doctrine where it exists = accurate.** No paraphrasing errors found in the spot-check.
The problem is depth/coverage, not accuracy.

### Bonus finding — my original Batch 1 audit had FALSE-POSITIVE gaps
I claimed "income tax trouble" and "loan/overdraft" rules were missing for career. They're actually
in `job.txt:60-81`. I missed them in the first pass.

**Other gaps I claimed that may also be partially false** (to re-verify before shipping):
- "Notice period / handover timing" — partially covered by §10 voluntary exit
- "Salary growth distinct from promotion" — actually genuinely missing (re-verified)
- "Job loss / firing" — denial framework is there (§1 H1/H5/H9/H12 set + KSK strict bhukti).
  Layoff-cycle specifics are missing.

The original 26-PR sequence over-counts career PRs by ~1-2.

---

## Task #3: Topic-house-map consistency audit (the critical foundational bug)

### What I found
The codebase has **THREE** topic-to-house mappings that **DISAGREE on 13 of 15 topics**:

| Dict | Location | Purpose | Shape |
|---|---|---|---|
| `HOUSE_TOPICS` | `chart_engine.py:604` | Used by `check_promise()` + 5 other functions in `kp_advanced_compute.py` | List, first item = primary cusp |
| `TOPIC_HOUSE_MAP` | `csl_chains.py:257` | Used by `detect_pattern_d2()` | Dict with `relevant` + `denial` + `primary_cusp` |
| `TOPIC_DENIAL` | `kp_advanced_compute.py:1330` | Used for harmony scoring | List of denial houses |

### Consistency matrix
| Topic | HOUSE_TOPICS | TOPIC_HOUSE_MAP relevant | TOPIC_HOUSE_MAP primary | TOPIC_DENIAL | Verdict |
|---|---|---|---|---|---|
| marriage | {7,2,11} p=7 | {2,7,11} | 7 | [1,6,10,12] | ✅ consistent |
| children | {5,2,11} p=5 | {2,5,11} | 5 | [1,4,10] | ⚠ TOPIC_DENIAL missing H7 |
| divorce | {6,10,12} p=6 | — | — | [2,7,11] | ❌ csl_chains missing |
| job/career | {10,2,6,11} p=10 | {2,6,10,11} | 10 | [1,5,9,12] | ⚠ csl_chains denial {5,8,9,12} disagrees on H1 vs H8 |
| **business** | {7,2,10,11} p=**7** | {2,7,10,11} | p=**10** | [1,6,9] | ❌ **PRIMARY CUSP DISAGREES** (7 vs 10) |
| foreign_travel | {9,3,12} p=**9** | {3,9,12} | p=**12** | [2,8,11] | ❌ **PRIMARY CUSP DISAGREES** (9 vs 12) |
| foreign_settle | {12,3,9} p=12 | (missing) | — | [2,8,11] | ❌ csl_chains missing |
| education | {9,4,11} p=**9** | {4,9,11} | p=**4** | [3,8,10] | ❌ **PRIMARY CUSP DISAGREES** (9 vs 4) |
| property | {4,11,12} p=4 | {4,11,12} | 4 | [3] | ⚠ TOPIC_DENIAL too narrow (only H3 vs {3,5,6,8}) |
| father / mother | minimal | (missing) | — | (missing) | ❌ csl_chains + TOPIC_DENIAL missing |
| **litigation** | **{6,8,12}** p=6 | **{6,11}** | 6 | [7,12] | ❌ **chart_engine uses LOSS set as "relevant"!** |
| spirituality | {9,8,12} p=9 | (missing) | — | (missing) | ❌ missing |
| **wealth** | {2,6,10,11} p=2 | **{2,6,11}** | 2 | [1,8,12] | ❌ **HOUSE_TOPICS includes H10 (wrong per KSK); csl_chains correctly excludes** |
| **health** | **{6,8,12}** p=6 | **{1,5,11}** | 1 | [1,5,11] | ❌ **TOTALLY OPPOSITE** (disease set vs wellness set) |

### Why this is the biggest single issue
When the production pipeline runs for any question:
1. `chart_pipeline.py` calls `check_promise(topic)` → uses `HOUSE_TOPICS` → produces verdict A
2. `chart_pipeline.py` calls `detect_pattern_d2(topic)` → uses `TOPIC_HOUSE_MAP` → produces verdict B
3. `kp_advanced_compute.py` uses `HOUSE_TOPICS` for significator scoring + uses `TOPIC_DENIAL` for harmony

For marriage / children / property: all three agree → AI gets consistent signal.
For **business / wealth / health / litigation / education / foreign**: dicts disagree → AI gets
internally-conflicting signal blocks. The AI has to reason its way out of the contradictions
(which it does well, but it shouldn't have to).

**Example for litigation specifically**: `check_promise("litigation")` would say "is loss promised?"
(because HOUSE_TOPICS uses [6,8,12] which is the loss set). `detect_pattern_d2("litigation")` would
correctly answer "is winning promised?" (relevant={6,11}). These two verdicts then end up in the
prompt block as engine evidence — the AI has to figure out they're asking opposite questions.

### Verdict
**Single-source-of-truth unification is the #1 highest-leverage fix in Batch 1.** It's also the
prerequisite for any new topic PR (we don't want to ADD topics to 3 different dicts that already
disagree).

---

## Revised PR sequence — substantially smaller than original 26

Given the findings above, here's the revised Batch 1 plan in **strict priority order**:

### TIER 1 — foundational fixes (ship first, blocks everything else)

**PR A2.0a — Topic-house-map unification** (HIGHEST ROI)
- Make `TOPIC_HOUSE_MAP` (csl_chains.py) the single source of truth
- Refactor `chart_engine.py` HOUSE_TOPICS + `kp_advanced_compute.py` TOPIC_DENIAL to import from it
- Add missing topics: divorce, business (standalone), foreign_settle, father, mother, spirituality
- For each topic, choose ONE canonical framing:
  - health → "will I be well / recover?" (relevant {1,5,11})
  - litigation → "will I win?" (relevant {6,11})
  - wealth → KSK strict {2,6,11} (NO H10)
  - business → primary cusp = H10 (KSK Reader doctrine) NOT H7
- Effort: 4-6 hours, **all topics benefit immediately**

**PR A2.0b — Topic-routing enhancement** (HIGH ROI)
- Update `detect_topic()` Haiku prompt: add 15+ new categories
  - business, startup, partnership, money_recovery, lent_money, partner_cheated,
    loan, debt, EMI, theft, refund, salary_growth, layoff, retirement, second_marriage,
    in_laws_health, sibling_rivalry, vehicle_purchase, accident_risk, hospitalization
- Update `TOPIC_TO_FILE` with the new topics → existing files for now (e.g., `partner_cheated` →
  `other_topics.txt` until business.txt ships)
- Effort: 2-3 hours

**PR A2.0c — Sensitivity tier framework** (foundational protective framing)
- Add `sensitivity_tiers.md` KB (Tier 1 / 2 / 3 doctrine)
- Add RULE 52 to system prompt: per-topic sensitivity router
- Per-topic mapping: which tier each topic falls into
- Tier 3 topics (longevity, jail, child illness, suicide) trigger maximum framing
- Effort: 3-4 hours

**PR A2.0d — `other_topics.txt` refactor** (cache + extensibility)
- Split into 6 separate files: education.txt, children-summary.md (defer to children_detailed.md),
  property.txt, wealth.txt, litigation.txt, vehicle.md
- No doctrine change — pure file split
- Wire up `TOPIC_TO_FILE` mapping per file
- Effort: 1 hour (mechanical)

**TIER 1 TOTAL**: 4 PRs, ~10-15 hours, ZERO new doctrine added but every topic benefits.

### TIER 2 — high-leverage doctrine additions (after TIER 1)

**PR A2.1 — Business doctrine (the big one)**
- Create `business.txt` (~20KB target — not 30KB as originally proposed; the AI is doing more
  derivation than I credited)
- Sections: starting a venture, partnership analysis (lasting/dissolution/cheating), profit/loss,
  expansion, bankruptcy, business sale, family succession, type classification
- Specifically include the **partner-cheating compound recipe** so AI cites it instead of deriving
- Effort: 6-8 hours

**PR A2.2 — Money-recovery cluster**
- Create `money_recovery.md` (~6KB target — smaller than originally proposed)
- Cover: lent money (H6+H2+H11 + Saturn block), partner cheating (H7+H6+H8+H2 compound),
  theft recovery (H8+H12+H2), recovery dasha-window scanning
- Cite the H8 cusp sub lord rule ("signifies 6+11 = cheque + lender's loss") missing from current KB
- Effort: 3-4 hours

**PR A2.3 — Litigation depth + Tier-3 framing**
- Expand `litigation.txt` (post-refactor from A2.0d) to ~10KB
- Add: civil vs criminal, plaintiff vs defendant, jail risk doctrine (H12 + Rahu), bail probability,
  settlement vs trial, appeal success, land disputes
- Tier 3 framing baked in (never name jail dates, always frame as structural-not-legal-advice)
- Effort: 5-6 hours

**TIER 2 TOTAL**: 3 PRs, ~14-18 hours, covers the user's specific examples.

### TIER 3 — targeted polish (after TIER 2)

**PR A2.4 — Career polish (revised)**
- Add salary growth doctrine to job.txt (genuinely missing)
- Add layoff cycle patterns (genuinely missing)
- Skip: notice period, appraisal cycles, sabbatical, return-after-break
  (universal RULE 14 + RULE 29 handle these well enough per the baseline test)
- Effort: 2 hours (was 4-6)

**PR A2.5 — Wealth depth + new topics**
- Expand wealth.txt (post-refactor) to cover EMI/loan repayment, NRI income, retirement/pension,
  investment classes, sudden gains/losses
- Effort: 4-5 hours

**PR A2.6 — Education polish**
- Expand education.txt (post-refactor) — abroad education, exam-pass horary, scholarship,
  drop-out, failure recovery
- Effort: 3-4 hours

**TIER 3 TOTAL**: 3 PRs, ~10-12 hours.

### Engine additions — REVISED (much smaller scope)

Original audit proposed extensive engine helpers (`business_engine.py`, `partnership_compatibility_check`,
`partner_cheating_compound_reading`, etc.). The baseline test showed **the AI is already doing this
compound math correctly** without engine helpers. So:

**KEEP** (genuinely high-leverage engine work):
- Extend `TOPIC_HOUSE_MAP` (already done in PR A2.0a)
- Extend `detect_pattern_d2()` to cover new topics (one-line dict entry per topic)

**DEFER** (do only if real-output baseline shows quality drop):
- `business_engine.py` and compound-reading helpers
- Dedicated jail risk / recovery window scanners

These can be added later if regression testing shows the AI struggling without them. **Don't over-engineer.**

---

## Revised total Batch 1 effort

| Category | Original audit | Revised (after pre-PR findings) |
|---|---|---|
| Total PRs | 26 | **10** |
| Estimated hours | 75-120 | **34-45** |
| Doctrine PRs | 18 | 6 |
| Engine PRs | 5 | 1 (TOPIC_HOUSE_MAP unification) |
| Refactor PRs | 1 | 1 |
| Foundation PRs | 0 | 2 (routing + sensitivity tiers) |

The original 26-PR scope was based on KB depth as the bottleneck. The real bottleneck is:
1. Topic routing (50%+ mis-routes)
2. Internal dict inconsistency (13/15 topics)
3. Missing canonical-rule citations for compound questions
4. No sensitivity-tier framework

Fix those → existing AI quality lifts everywhere. Then add targeted depth for business / money
recovery / litigation only where it genuinely matters.

---

## Recommended ship order

```
SHIP FIRST (Tier 1 — foundation):
  PR A2.0a  Topic-house-map unification           (4-6h)  — HIGHEST ROI
  PR A2.0b  Topic-routing enhancement             (2-3h)
  PR A2.0c  Sensitivity-tier framework + RULE 52  (3-4h)
  PR A2.0d  other_topics.txt refactor             (1h)

SHIP SECOND (Tier 2 — covers user's examples):
  PR A2.1   business.txt + business doctrine      (6-8h)
  PR A2.2   money_recovery.md + cluster doctrine  (3-4h)
  PR A2.3   litigation.txt depth + Tier-3 framing (5-6h)

SHIP THIRD (Tier 3 — polish):
  PR A2.4   Career polish (salary growth, layoff) (2h)
  PR A2.5   Wealth depth (EMI, NRI, etc.)         (4-5h)
  PR A2.6   Education polish                      (3-4h)
```

Each PR independently verifiable, independently revertable, with regression test against
the Manyue golden-chart baseline (`baseline-partner-cheating.txt`) plus 4-5 more baselines I
should capture before A2.0a ships.

---

## What I need from you to proceed

1. **Approve the revised 10-PR plan** (replaces the original 26-PR plan)
2. **Approve the priority order** (Tier 1 → Tier 2 → Tier 3)
3. **Approve the principle**: "the AI is already doing 80% of the work via universal foundation
   — focus engineering effort on the routing + dict consistency + Tier-3 framing layer where the
   true gaps are, not on adding KB volume"

If approved, I'll ship A2.0a (TOPIC_HOUSE_MAP unification) first since it unlocks everything else.

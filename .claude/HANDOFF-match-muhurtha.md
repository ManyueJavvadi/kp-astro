# Handoff — Match M1-M15 + Muhurtha Tab Audit

**Created**: 2026-05-24 (post-compaction safety net)
**Purpose**: If the session compacts mid-way through shipping these PRs, the
next Claude session can pick up exactly where this one left off — without
re-doing the deep audit work.

**Read order on resume**:
1. This file
2. `.claude/DAILY_LOG.md` last entry (for shipped status)
3. `git log --oneline origin/develop -25` (to see what's already shipped)
4. `CLAUDE.md` for sacred regions
5. Then resume execution per §2 / §3 below

---

## 1. Current state (post-Horary H1-H12 + this hotfix)

### What's shipped to develop
- All Horary H1–H12 (commits `12d457c` → `07831f1`) — covered in DAILY_LOG
- Horary test-shape relax (`132df11`)
- User's `eb662e2` (Vedic sunrise day lord + premium client editing modal)
- Hotfix `c5a46a8` — restored horary endpoint (CORS was 500 NameError + JD epoch off-by-one)

### Tests
- 88/88 backend tests pass
- tsc + next build clean
- Horary endpoint smoke-tested via `python -c "from app.routers.horary import horary_analyze, HoraryRequest; ..."`

### Known follow-ups documented but NOT shipped (not blocking)
- **JD epoch off-by-one** also lives in 4 other places: `astrologer.py:201,210` + `panchangam.py:275,283`.
  - Those convert JD → local-time HH:MM strings for sunrise/sunset display.
  - Self-cancelling math (same offset on input + output) → no visible bug.
  - Leave alone unless we add a feature that crosses the boundary again.
- **MatchTab.tsx is 1,592 lines** with all 6 sub-tabs inline. Extracting to `/components/match/*.tsx` is M15 (low priority polish).

---

## 2. Match Tab — M1-M15 plan to execute next

### Architecture context
- Backend entry: `backend/app/services/compatibility_engine.py` (~3,361 lines, ~50 functions)
- Router: `backend/app/routers/compatibility.py` (~89 lines)
- Frontend: `frontend/app/app/tabs/MatchTab.tsx` (~1,592 lines, 6 sub-tabs)
- KB: `marriage.txt` (49KB), `marriage_matching.txt`, `second_marriage.md`, `divorce.txt`, `adoption.md`, `children_detailed.md`, `pregnancy.md`
- 9 prior PRs already shipped: A1.4-A1.7 + M1.1-M1.7

### The 12 backend/UI PRs + 3 polish PRs (priority-ranked)

For each PR below: scope, key file(s), test/verify, commit message template.

#### M1 — Numeric couple confidence 0-100 + audit trail
- **Scope**: Like Horary H3. Add `couple_confidence_score: 0-100` + `confidence_breakdown` to `compute_compatibility()` return dict.
- **Weighting** (max 100):
  - Both partners' promise_tier: Full = +30 each, Strong = +20 each, Conditional = +10 each, None = 0
  - Joint dasha overlap: overlap_windows count ≥ 1 = +10
  - Ashtakoota: ≥27 = +10, 18-26 = +5, ≤14 = 0
  - Pattern D2 fire on either side = −10
  - Rajju dosha = −15
  - Separation-risk High on either = −10
  - Sublord friendship RED = −5
  - Clamp [0, 100]
- **Files**: `compatibility_engine.py` (new `_compute_couple_confidence()` helper), `MatchTab.tsx` (display 78/100 badge on verdict hero next to AnimatedScoreDonut)
- **Verify**: smoke `compute_compatibility(p1, p2)["couple_confidence_score"]` returns int 0-100 + non-empty breakdown.

#### M2 — Multi-cusp TIER 0/1/2/3 ladder per partner
- **Scope**: Per `kp_multi_cusp_confirmation.md`, surface explicit TIER label per partner alongside existing promise_tier.
- **Logic**: H7 CSL signifies {2,7,11} AND H2 CSL signifies {2,7,11} AND H11 CSL signifies {2,7,11} → TIER 3. Two cusps agree → TIER 2. Only primary → TIER 1. Conflict → TIER 0. Primary fails + supporting OK → TIER -1.
- **Files**: `compatibility_engine.py` (extend `_h7_sublord_promise` or add `_multi_cusp_tier()`), `MatchTab.tsx` (badge near 5-tier verdict in KP pane).
- **Verify**: tier values for Manyue's chart should report sensibly (TIER 1-3 typically).

#### M3 — Pattern detection (M1/M2/M3/M5/M6/T1/T2) per couple
- **Scope**: Same shape as Horary H4. Detect named patterns from `pattern_library.md`.
- **Patterns**:
  - **M1** Venus + Jupiter joint period trigger (when either AD is Venus or Jupiter AND signifies H2/H7/H11)
  - **M2** Saturn delay-not-denial (Saturn is significator of relevant houses)
  - **M3** H7 in fixed sign + strong fruitful CSL (Taurus/Leo/Scorpio/Aquarius)
  - **M5** AD-lord = supporting-cusp-sub-lord (KSK PRIMARY timing trigger — already partially in engine, just needs explicit pattern emission)
  - **M6** Jupiter Gocharya through H11 (transit-based, requires transit window scan)
  - **T1** Joint Period (per-couple version: both partners simultaneously have MD+AD+PAD signifying)
  - **T2** RP amplifier (significator that's also RP)
- **Files**: `compatibility_engine.py` (new `_detect_match_patterns()`), `MatchTab.tsx` (gold/amber chips on verdict hero — port `HoraryPatternChips.tsx` shape).
- **Reuse**: copy `HoraryPatternChips.tsx` → `MatchPatternChips.tsx` (rename only, same component).

#### M4 — Star-Sub Harmony explicit reading per partner
- **Scope**: Port `_compute_star_sub_harmony()` from `horary_engine.py` and apply to EACH partner's H7 CSL.
- **Output**: `star_sub_harmony_chart1` + `star_sub_harmony_chart2` with HARMONY/ALIGNED/TENSION/CONTRA/DENIED verdict + star_relevant + star_denial + sub_relevant + sub_denial.
- **Files**: `compatibility_engine.py` (import or duplicate the helper), `MatchTab.tsx` (two-column STAR vs SUB strip per partner in KP pane).
- **Note**: the function already exists in horary_engine — easiest is to import via `from app.services.horary_engine import _compute_star_sub_harmony`. Check if it has external deps that complicate this.

#### M5 — Multiple-marriages KSK detection
- **Scope**: Per KSK: "If 7th sub-lord is Mercury OR planet in dual sign (Gemini/Virgo/Sagittarius/Pisces) OR in nakshatra of planet in dual sign → multiple marriages."
- **Files**: `compatibility_engine.py` (new `_multiple_marriages_check(chart)` per partner).
- **Output**: `{signature_present: bool, basis: str, note: str}`.
- **UI**: amber chip on partner card "Multi-marriage signature" in Risks pane.

#### M6 — Nadi dosha directional cancellation precision
- **Scope**: Current engine cancels Nadi if same nakshatra OR same rashi. The classical refinement: same-rashi cancellation only when boy's nakshatra index < girl's nakshatra index within that rashi.
- **Files**: `compatibility_engine.py` — modify Nadi cancellation block around line 3281-3297 in `compute_compatibility`.
- **Source**: https://aaps.space/blog/5-ways-to-nadi-dosha-cancellation-and-nadi-matching/

#### M7 — Combust H7 CSL clinical flag per partner
- **Scope**: Check if H7 CSL planet is combust (within standard orb of Sun). If yes, flag "hidden romance / secret marriage / delayed materialization."
- **Files**: `compatibility_engine.py` (add to `_h7_sublord_promise()` or new helper), `MatchTab.tsx` (yellow row in partner card).
- **Note**: Engine already has `detect_combustion()` in `kp_advanced_compute.py` — reuse it.

#### M8 — Borderline H7 CSL caveat per partner
- **Scope**: Use existing `is_borderline_csl()` from `chart_engine.py`. If H7 cusp within 0.3° of sub boundary, flag "verify birth time within 2 minutes."
- **Files**: `compatibility_engine.py` (add to `_h7_sublord_promise()`), `MatchTab.tsx` (yellow row).

#### M9 — Sensitivity tier framing + auto-escalators
- **Scope**: Port Horary H8 pattern. Default Tier 2 (marriage). Escalate to Tier 3 if: question contains "divorce" / "death" / "kill myself after" / "suicide" / "lose spouse" / etc.
- **Files**: `compatibility_engine.py` (new `_resolve_match_sensitivity()`), `MatchTab.tsx` (port `HorarySensitivityCard.tsx` → `MatchSensitivityCard.tsx`).

#### M10 — Joint Sookshma days-precision window
- **Scope**: Within each AD overlap in `_shared_marriage_windows`, drop to sookshma-level to find days where BOTH partners' sookshma lord signifies marriage houses.
- **Files**: `compatibility_engine.py` (extend `_shared_marriage_windows()` or add `_joint_sookshma_windows()`), `MatchTab.tsx` (drilldown under existing overlap_windows).
- **Reuse**: `calculate_sookshma_dashas` from `chart_engine.py`.

#### M11 — Bhavat Bhavam for relative-marriage questions
- **Scope**: Port Horary H7 pattern. Detect "my mother's marriage" / "my sister's marriage" / "my son's marriage" → rotate H7 via Bhavat Bhavam.
- **Files**: `compatibility_engine.py` (reuse `_detect_relative` from horary_engine), `MatchTab.tsx` (port `HoraryBhavatBhavamCard.tsx`).
- **Note**: This is for when a native runs a match for someone ELSE's wedding (typical astrologer use case).

#### M12 — Reasoning trace + astrologer notes + JSON export
- **Scope**: Port Horary H10 pattern. Collapsible "Full reasoning trace" + copy-paste notes block + JSON export button.
- **Files**: NEW component `MatchReasoningTrace.tsx` (copy from `HoraryReasoningTrace.tsx`, adapt fields), wire into MatchTab Overall sub-tab bottom.

#### M13 (polish) — Partner profile card
- **Scope**: Surface what backend already computes (direction, profession lean, age band, appearance). Build a "Spouse Profile" card per partner.
- **Files**: New `MatchPartnerProfileCard.tsx`, wire into KP sub-tab.

#### M14 (polish) — "Best marriage window" hero card promotion
- **Scope**: Promote `shared_marriage_windows.overlap_windows[0]` from Timing sub-tab to top of Overall sub-tab as a green "PEAK WINDOW" callout.
- **Files**: MatchTab.tsx (move/copy the existing block, larger styling).

#### M15 (polish, defer) — Refactor MatchTab to /components/match/
- **Scope**: Extract MatchTab.tsx (1592 lines) into 6-8 sub-components matching Horary's structure.
- **Defer until** all M1-M14 stable in production.

### Suggested commit order
Same H1→H12 sequence rhythm: ship M1 then M2 then M3 … each as separate commit on `claude/eager-elbakyan` branch. After all done, run `pytest tests/ + npx tsc --noEmit + npx next build`, push to develop.

### Sacred boundaries during M-series
- **DO NOT touch**: `llm_service.py` prompts, KB files in `knowledge/` (other than NEW marriage_compatibility.md if creating one for M-series), `chart_engine.py` core, `kp_advanced_compute.py`.
- **DO touch**: `compatibility_engine.py` (additive only), `MatchTab.tsx`, new `/components/Match*.tsx` files.
- **Backward compat**: every new field added MUST be additive — existing readers of compute_compatibility output must keep working.

---

## 3. Muhurtha Tab — what to audit + plan after Match

### Architecture context (briefly inventory before deep dive)
- Backend: `backend/app/services/muhurtha_engine.py` + `muhurtha_findings.py`
- Router: `backend/app/routers/muhurtha.py`
- Frontend: `frontend/app/app/tabs/MuhurthaTab.tsx`
- KB: `muhurtha.txt` (9KB)
- Research doc: `.claude/research/muhurtha-audit.md` (exists per earlier audit)

### Steps to execute (same pattern as Horary + Match audits)

**Wave 1 — Inventory**: read muhurtha_engine.py + muhurtha_findings.py + MuhurthaTab.tsx + muhurtha.txt + the existing muhurtha-audit.md research doc.

**Wave 2 — Deep doctrine read**: web search canonical KP muhurtha for:
- Marriage muhurtha (Vivah)
- House warming (Griha Pravesh)
- Business inauguration
- Surgery muhurtha
- Travel muhurtha
- Vehicle purchase muhurtha
- Education / first-class
- Auspicious Yogas (Siddha, Amrita)
- Inauspicious yogas (Bhadra, Vyatipata)
- Tithi/Nakshatra/Yoga/Karana/Vara — panchanga elements for muhurtha
- Tara Bala / Chandra Bala
- Rahu Kalam / Yamagandam / Gulika Kalam
- Abhijit Muhurta
- Choghadiya
- Hora system

**Wave 3 — Gap analysis**: compare what engine computes vs canonical KP muhurtha checks. Document gaps as Mu1-MuN.

**Wave 4 — Deliver report** in same shape as Horary + Match reports: strengths first, then ranked PR plan, then sacred boundaries.

**Wave 5 — Ship Mu1-MuN one by one**, same rhythm.

### Anticipated muhurtha-specific topics to cover (for sensitivity tier mapping)
- Vivah (marriage) — Tier 2
- Griha Pravesh (house warming) — Tier 1
- Vyaapaar (business start) — Tier 2
- Surgery — Tier 3
- Travel — Tier 1
- Vehicle — Tier 1
- Pregnancy / childbirth muhurtha — Tier 2-3
- Funeral / antima sanskara — Tier 3 (very sensitive)
- Stock-market trade timing — Tier 1-2

### Sensitivity-tier framework
Same as Match M9 — reuse `_resolve_match_sensitivity()` pattern.

---

## 4. Methodology I'm following (so future Claude doesn't drift)

The pattern that worked for Horary H1-H12 + Match audit:

### Audit phase (per tab)
1. **Inventory backend**: list every function + KB file + frontend component
2. **Deep-read foundational doctrine**: 4-5 most important KB files for the tab's topic
3. **Web research**: 3-5 focused queries on canonical KP doctrine for any gaps suspected
4. **Synthesize**: write a comprehensive report with:
   - Strength inventory FIRST (so user sees what's good, doesn't worry about regression)
   - Backend M-series (priority-ranked, with KP doctrine grounding)
   - Frontend content gaps (trust-building + verify-yourself)
   - PR sequence (small shippable units, ~1-3h each)
   - Sacred boundaries to preserve
   - Sources list (real KP authority links)

### Execution phase (per PR)
1. Make backend change in `compatibility_engine.py` (or relevant engine)
2. Surface in frontend (existing tab file OR new component in `/components/`)
3. Smoke test: 1-2 line python script to call the function + assert output shape
4. Commit with detailed multi-line message explaining: doctrine source, what was missing, what was added, smoke test verification
5. Move to next PR

### After all PRs in series
1. Run full test suite (`pytest tests/`)
2. `npx tsc --noEmit` + `npx next build`
3. End-to-end smoke test across all new fields
4. Single commit + push to develop (or push each PR commit individually)
5. Update DAILY_LOG.md with shipped status
6. Hand back to user for live testing

### Sacred rules (NEVER violate)
- llm_service.py prompts: don't touch
- KB files (knowledge/*.md, *.txt): don't touch existing; can ADD new
- chart_engine.py core math (planet/cusp/sub-lord/dasha): don't touch
- compatibility_engine.py: additive only
- Always add bilingual fields (label_en/label_te) when adding new clinical flags

### Anti-patterns to avoid
- ❌ Skipping smoke tests "because the change is obvious"
- ❌ Bundling multiple PRs into one commit
- ❌ Changing existing field names (always add new, never rename)
- ❌ Pushing to develop without local verification
- ❌ "Quick fixes" to llm_service.py prompts
- ❌ Strict-equality assertions on dict shape (use `issubset()` so new fields don't break tests — H11 lesson)

---

## 5. If session compacts mid-PR

If compaction happens after some M-PRs are done but before all 15:

1. **Don't redo audit** — read this doc + DAILY_LOG.md last entry
2. **Check shipped status**: `git log --oneline origin/develop -25` — every "PR Mn" commit means that PR is done
3. **Resume from the next un-shipped M number**
4. **Same commit message format**: "PR M[N] — [Title]\n\n[Body explaining doctrine source + what was missing + what was added + verification]\n\nCo-Authored-By: Claude..."

---

## 6. Resources

### KP marriage doctrine sources (verified Oct 2026)
- KSK Reader I-VI: https://archive.org/details/kp-readers
- KP marriage compatibility — Astrowala: https://astrowala.com/arranged-marriage-in-kp-astrology-how-to-predict/
- Love marriage KP — RVA: https://www.rahasyavedicastrology.com/kp-love-marriage-prediction/
- Multi-marriage signature — LinkedIn: https://www.linkedin.com/pulse/marriage-per-kp-astrology-subir-pal-astrologer-aqfxf
- 5-8-12 formula — Jagannatha Hora: https://jagannathhora.com/marriage-or-breakup-kp-astrology-5-8-12-formula/
- Nadi dosha cancellation — Aaps.space: https://aaps.space/blog/5-ways-to-nadi-dosha-cancellation-and-nadi-matching/
- Spouse death — Astroshastra: https://www.astroshastra.com/articles/deathofspouse.php
- Partner physical desc — Astrogle: https://www.astrogle.com/astrology/sublord-7th-cusp-placement-results.html
- Marriage timing exact date — Jyotishtek: https://jyotishtek.com/blog/predicting-exact-date-of-marriage/

### Internal cross-references
- Pattern library: `backend/knowledge/pattern_library.md` (M1-M6, T1-T4, D1-D2 patterns)
- CSL theory: `backend/knowledge/kp_csl_theory.txt` (4-step UNION, Star-Sub Harmony)
- Multi-cusp confirmation: `backend/knowledge/kp_multi_cusp_confirmation.md` (TIER 0/1/2/3)
- Sensitivity tiers: `backend/knowledge/sensitivity_tiers.md` (Tier 1/2/3 + escalators)
- Bhavat Bhavam: `backend/knowledge/bhavat_bhavam.md` (relative-question rotation)
- Horary canonical: `backend/knowledge/horary.md` (just shipped H12)

### Horary components to PORT for Match
- `frontend/app/app/components/HoraryValidityCard.tsx` → conceptually similar to a per-partner-cusp validity (not directly portable, build fresh)
- `frontend/app/app/components/HoraryPatternChips.tsx` → directly portable as `MatchPatternChips.tsx`
- `frontend/app/app/components/HoraryBhavatBhavamCard.tsx` → directly portable as `MatchBhavatBhavamCard.tsx`
- `frontend/app/app/components/HorarySensitivityCard.tsx` → directly portable as `MatchSensitivityCard.tsx`
- `frontend/app/app/components/HoraryReasoningTrace.tsx` → conceptually portable but the reasoning fields differ (build adapted version)
- `frontend/app/app/components/HoraryTimingWindowCard.tsx` → conceptually similar to "best marriage window" card

### Horary engine helpers to REUSE for Match
- `_compute_star_sub_harmony()` — directly reusable
- `_detect_patterns()` — adapt for marriage patterns
- `_resolve_sensitivity_tier()` — directly reusable
- `_detect_relative()` — directly reusable
- `_translate_via_bhavat_bhavam()` — directly reusable

---

*Document end. Read CLAUDE.md if any sacred-region question arises.*

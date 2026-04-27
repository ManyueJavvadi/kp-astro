# DevAstroAI — Analysis Tab Handoff

> **Purpose**: capture the accumulated wisdom from the Analysis-tab arc (Apr 2026 sessions, 11 PRs, ~6,500 lines) so the next Claude session resumes with full context AND so the user has a single readable reference.
>
> **READ ORDER on session start**: `CLAUDE.md` (repo root) → `.claude/BACKLOG.md` → tail `.claude/DAILY_LOG.md` → **THIS FILE** if you're touching anything in `backend/app/services/llm_service.py`, `kp_advanced_compute.py`, `kp_transit_compute.py`, `kp_yogini_dasha.py`, `backend/knowledge/*`, or `backend/app/routers/astrologer.py`.
>
> Times = local IST. Audience = future Claude + the user. Append-only-ish — only update §Status block + §Pending after a PR ships.

---

## TL;DR — what to know in 60 seconds

The Analysis tab has been through **11 PRs (`76368a2` → `aa31528`)** that took it from "AI hallucinates planet placements + zero KB content + Parashari-leaking rules" to **structurally complete KSK-strict KP analysis** with:
- 34 system-prompt rules (1, 1B, 2-21, 21B, 22-31)
- 6 KB files added (pattern library, gold standards, confidence methodology, personality, remedies, transit rules)
- 5 compute modules (advanced compute, transit compute, Yogini dasha, plus chart engine extensions)
- 3 rounds of audit using a **Web-V vs Engine-V debate format** (the user's own invention) that surfaced 72 gaps total — all addressed except 4 deferred for DB infrastructure

**Status as of fix-10 push**: structurally complete. Diminishing returns on further audits. **Next PR (fix-11) is OUTPUT STRUCTURE refactor** to Option B (5 sections instead of 7) — design hashed out with user, not yet implemented. See §Pending.

**Universality is sacrosanct**: every fix in every PR was checked against "universal vs chart-specific bias." The engine emits neutral structural signals; the LLM interprets. **Never inject rules that pre-decide outcomes for any chart.**

---

## Why this track exists (context)

User opened Track A.1 on 2026-04-20: backend KP accuracy audit. Original scope (per `BACKLOG.md`): Horary first, then Panchang, Transit, Muhurtha, Match. **Analysis tab was supposed to be untouched** ("Analysis tab is perfect, don't touch") — but partway through the user reopened it after testing the AI's output and finding:

1. AI hallucinated PCOD on a male chart (gender wasn't reaching the LLM)
2. AI hedged with "if you are 30+" (age wasn't reaching the LLM either)
3. AI's predictions felt thin compared to a real KP astrologer's reading
4. The `KNOWLEDGE_DIR` path was bugged so **the LLM had been receiving ZERO KB content for months** (fixed in `76368a2`)

That triggered the analysis-tab arc, which became its own multi-PR track parallel to the rest of A.1.

---

## The principle stack (NEVER undo without explicit user approval)

These are the design commitments that emerged through the arc. They survived testing + audit + user pushback. Keep them.

### P1 — KSK strict over Parashari
- Cuspal Sub Lord (CSL) is THE primary gate. No exception.
- Karaka strength is **CONTEXT only** (RULE 12), never overrides CSL. *"Venus debilitated → marriage denied"* is a Parashari leak, not KP.
- Significator hierarchy is **A > B > C > D** per KSK Reader V (planets in star of occupant > occupants > planets in star of sign-lord > sign-lord). Codified in compute + KB.
- 5-tier verdict scale (STRONGLY PROMISED / PROMISED / CONDITIONAL / WEAKLY PROMISED / DENIED), never binary.

### P2 — Star-Sub Harmony is the single biggest accuracy lever
- KP is **NOT a 4-step UNION** operation. It's a TENSION between layers: Star Lord = WHAT, Sub Lord = WHETHER.
- Engine emits 3-layer split (SELF / STAR / SUB) for every primary CSL with Rahu/Ketu proxy applied via `get_rahu_ketu_significations()`.
- Verdicts: HARMONY (++) / ALIGNED (+) / MIXED / TENSION (-) / CONTRA (-) / DENIED (--).

### P3 — KSK strict bhukti rule (RULE 11)
- When CSL signifies BOTH relevant + denial houses, the event FIRES in bhuktis of relevant-house significators and is BLOCKED in bhuktis of denial-house significators. Never "soft delay."

### P4 — KSK strict timing trigger (RULE 21)
- Event AD = AD lord that IS the sub-lord of one of the topic's relevant cusps AND signifies the other relevant houses.
- This generalises across topics. **It does NOT default to the karaka's AD** (e.g., it's not "wait for Venus AD for marriage"). The chart determines the AD.

### P5 — PAD vs Sookshma neutrality (RULE 21B, the calibration commitment)
- Different KP texts emphasize different dasha levels for "fructification." **Both are valid; they answer DIFFERENT questions.**
  - PAD = month-level decision crystallization
  - Sookshma = day-level moment events
- **Never pivot the engine's reading because another astrologer (Vedic / Lahari / etc.) said something different.** This was added after the user explicitly called out a sycophantic shift in one of the convos. RULE 4 + RULE 21B encode the commitment.

### P6 — Universality
- Every fix is universal. No chart-specific rules. No injected outcomes. No biasing toward Manyue's specific situation (the calibration chart).
- The engine emits neutral structural signals; the LLM interprets.
- Topic-scoping (e.g., barren-sign tag only for fertility-relevant topics) is universal, not chart-specific.

### P7 — Native profile (gender + age + birth_date) reaches the LLM as structured data
- Frontend 4 POST sites send gender; backend Pydantic models accept it; `format_chart_for_llm` emits a NATIVE PROFILE block at top of every prompt.
- LLM never guesses gender from name, never hedges age.

### P8 — Anti-Parashari guardrails (`ksk_rejections.md`)
- 17 explicit "do NOT use" rules: sign-aspects, rashi-level analysis, exalt/debility-as-verdict, yoga names, friendship/enmity tables, Lahiri ayanamsa, whole-sign houses, D9-as-primary, death-timing.
- RULE 15 in system prompt cross-links to this file.

### P9 — Honest confidence calibration
- Engine confidence scores follow `confidence_methodology.md` with explicit weight breakdown.
- Expected distribution: 90+ rare (≤10%), 75-89 common (~30%), 60-74 most common (~40%), 45-59 mixed (~15%), <45 rare (≤5%).
- LLM self-checks 90+ scores against friction signals (Pattern D2, TENSION, 0 fruitful, etc.) and adjusts ceiling -5 to -10 if any present.
- Calibration caveat is mandatory in client-facing summary.

### P10 — Sensitive prediction protocol
- Death timing: **NEVER** predict (RULE 15 taboo'd). Speak in "challenging health window — extra medical care advised."
- Mental health / addiction / fertility loss / divorce / severe career failure: state pattern factually + tendency framing + harm-reduction + recommend appropriate professional consultation FIRST, astrology second.

---

## The Web-V vs Engine-V audit methodology (USER'S INVENTION — preserve this)

The user invented an adversarial debate format that surfaced gaps systematically. Use it again whenever you're auditing a tab.

**Format**:
- 🌐 **Web-V** = "I have full literature access, all KP texts, general reasoning. Here's what I'd say about this chart on this topic."
- 🤖 **Engine-V** = "I only have what's in our KB files + system prompt rules + compute output. Here's what I can produce."
- Compare both. Where Engine-V can't reach Web-V's depth = a gap.

**Rounds run so far** (3 total):
1. Round 1 (during fix-5 → fix-6): 24 gaps surfaced. 15 closed in fix-6 (CRITICAL + HIGH), 8 closed in fix-7 (MEDIUM + LOW).
2. Round 2 (during fix-7 → fix-8): 18 new gaps. 17 closed in fix-8 (1 deferred for DB infra).
3. Round 3 (during fix-9 → fix-10): 12 new gaps. 10 closed in fix-10 (2 deferred).

**Total: 72 gaps surfaced + addressed across 3 rounds.** Diminishing returns hit at ~70 — round 3's "real fixes" were only 5; the rest were upgrades, not fixes.

**Calibration chart used in every round**: Manyue, 09/09/2000, 12:31 PM, Tenali AP (16.24°N, 80.64°E), male. See §Calibration findings below for the structural facts of his chart that come up repeatedly.

---

## What was shipped (11 PRs, develop branch)

| PR | Commit | Date (rough) | Scope |
|---|---|---|---|
| A1.3 (foundation) | `76368a2` | early-arc | KNOWLEDGE_DIR path fix (engine had been getting ZERO KB content) + 7 new deep-dive .md files (bhavat_bhavam, parents_family, profession_detailed, children_detailed, health_detailed, multi_factor_queries, ksk_rejections) |
| A1.3a + A1.3b | `11219b2` | mid-arc | Gender/age wiring frontend→backend→LLM (NATIVE PROFILE block) + Star-Sub Harmony as RULE 16 + KSK verbatim per-topic rewrites + RULE 17 NATIVE PROFILE |
| A1.3c + A1.3d + Sookshma | `7599948` | mid-arc | `kp_advanced_compute.py` (8 functions: A/B/C/D, fruitful, harmony, RP overlap, confidence) + Sookshma 4th-level dasha + pattern_library.md (14 patterns) + gold_standard_examples.md (3 master analyses) + confidence_methodology.md + RULES 18/19 |
| A1.3-fix | `d15df10` | post-test | 11 audit fixes — `detect_topic` bypass when topic provided (kills ~5-10s latency), Rahu/Ketu proxy in harmony compute, TOPIC_DENIAL corrections per RULE 5 + KB, health relevant/denial overlap fix, RULE 11 duplicate renumbered → RULE 20, parents/mother/father topic routing, barren-sign 5-sign list standardised, promise hint defanged, self-strength bonus, Sookshma extended to 2 ADs, harmony 3-layer split (SELF/STAR/SUB) |
| A1.3-fix-5 | `eb4fd4c` | calibration | KSK strict timing trigger (`compute_supporting_cusp_activations`) — fixed karaka-AD bias. Now correctly identifies Mercury AD as marriage trigger when Mercury is H2+H11 sub-lord, even though Venus is the karaka. RULE 21 added. Pattern M5 + M6 added. |
| A1.3-fix-6 | `879dd8e` | audit-1-CRITICAL+HIGH | 15 features: planetary aspects (Saturn 3/7/10, Mars 4/7/8, Jupiter 5/7/9, RK 5/9), combustion detection, conjunction orbs (8°), pada (1/2/3/4) + navamsa, 8th lord disposition, partner profile (direction, body, age hint), Ashtakavarga BAV+SAV, sign-by-sign industry mapping, planet+star sector matrix, dasha-specific health triggers, reproductive function rules, age-watch metabolic matrix, Sade Sati detection, current transits all 9 planets, key-cusp transit flags, upcoming-48-month transit windows. RULES 22/23/24/25 added. |
| A1.3-fix-7 | `fe1c309` | audit-1-MEDIUM+LOW | 8 features: gandanta detection, full 27-nakshatra classification (Mridu/Tikshna/Sthira/Chara/Ugra/Laghu/Mishra), classical exalt/debil/own dignity tags, D9 navamsa sign per planet, vargottama detection, Yogini Dasha (parallel 36-yr cycle) + cross-check with Vimsottari, planetary returns (Saturn ~28-30, Jupiter ~12y), reproductive deep-dive in health.txt. RULES 26/27 added. |
| A1.3-fix-8 | `4abe6ce` | audit-2 | 17 features: intercepted signs detection (Placidus quirk — Manyue has Leo in H9 + Aquarius in H3), stellium detection, lagna lord disposition with per-house notes, divisional charts D7/D9/D10/D12 + vargottama-D10, decision_support_score with verdict + ledger, flag_dasha_conflicts (Vimsottari↔Yogini convergence/conflict), Sookshma fire-score ranking, **personality_psychology.md** (4-pillar framework + 27-nakshatra archetypes + free-form topic routing + intent classification), **remedies.md** (KP parihara framework — behavioural-first, per-planet, topic-specific, KP gemstone guard rule), 9 new free-form topics added to TOPIC_TO_FILE. RULES 28/29/30/31 added. |
| A1.3-fix-9 | `4235ced` | audit-3-fixes | 15 items: transit_rules.txt added to ADVANCED_FILES (was orphaned 156-line KB), `_TOPIC_CACHE` wired into load_knowledge (200KB I/O killed per query), bare except cleanup with logging, `/quick-insights` brought to feature parity with `/analyze`, silent fallback exception logging, RULES 20+21 reordered to numeric position, dead functions removed, `pratyantardashas_current_ad` redundancy dropped, **Anthropic prompt caching for follow-ups (~90% input-token reduction within 5-min cache TTL)**, RULE 10 strengthened with PLACEMENT VERIFICATION (kills "Sun in H6 vs H9" hallucinations), RULE 28 mandates intercepted-sign call-out in Section 2, RULE 31 remedies auto-trigger criteria explicit, `get_cusp_sign_type` topic-scoped (no "Virgo barren" in career), RULE 17 age-consistency clause, **RULE 21B PAD-vs-Sookshma neutral framing** (the calibration commitment) |
| A1.3-fix-10 | `aa31528` | audit-3 | 10 items: Tenali leak removed from general.txt, `detect_topic` 11→30 topics synced with TOPIC_TO_FILE, decision_support penalties (Step 4 D2, TENSION sub-denial, low SAV — score now realistic 86 not 100), confidence_methodology.md gains Expected Distribution benchmark, combustion borderline ±2°→±1°, RULE 19 de-duplication discipline, RULE 19 conflicting-signals panel mandatory on TENSION/MIXED/CONTRA, sookshma fire-score ranking emitted in formatter, `verify_past_event(date, topic)` helper, session memory anchor in conversation history, transit_rules.txt RP integration |

**Cumulative**: 34 system-prompt rules, 6 new KB files, 5 compute modules, ~6,500 lines added.

---

## Calibration findings (Manyue's chart, used as ground-truth across all PRs)

These are the structural facts that come up in every test. Useful to know when validating future work.

**Birth**: 09 Sep 2000, 12:31 PM, Tenali AP (16.2398°N, 80.6403°E), male, currently age 25y 7m.

**Lagna**: Scorpio 24°40' Jyeshtha (Mercury star, Rahu sub).

**Planets**:
- Sun: Leo H9 (Purva Phalguni / Venus star)
- Moon: Capricorn H2 (Uttara Ashadha / Sun star)
- Mars: Leo H9 (Magha / Ketu star)
- Mercury: Virgo H10 own sign (Uttara Phalguni / Sun star, **borderline-combust 15.3° from Sun**)
- Jupiter: Taurus H6 (Rohini / Moon star)
- Venus: Virgo H10 **debilitated** (Hasta / Moon star)
- Saturn: Taurus H6 (Krittika / Sun star)
- Rahu: Gemini H8 (Punarvasu / Jupiter star) — vargottama
- Ketu: Sagittarius H2 (Uttara Ashadha / Sun star) — vargottama

**Intercepted signs** (Placidus): **Leo in H9** (lord Sun), **Aquarius in H3** (lord Saturn). The Aquarius interception is the chart's biggest career insight — explains why interview rejections felt "buried" until Saturn AD started.

**Vargottama**: Moon, Ketu, Rahu (D9 = D1). Moon is also D10-vargottama.

**Current dasha stack (Apr 2026)**: Rahu MD (Feb 2021 → Feb 2039) → **Saturn AD (Mar 17, 2026 → Jan 21, 2029)** [just begun] → Saturn-Saturn PAD (Mar 17 → Aug 28, 2026) → Mercury Sookshma (Apr 11 → May 5, 2026).

**Critical KSK timing for marriage**: H7 sub Rahu, H2 sub Mercury, H11 sub Mercury. Mercury is H2+H11 sub-lord, so **Mercury AD (Jan 2029 → Aug 2031) = primary KSK marriage-trigger AD** (NOT Venus AD 2032+ as karaka-bias would suggest). Pattern M5 fires.

**Critical KSK timing for career**: H10 sub Rahu, H6 sub Rahu, H2 sub Mercury, H11 sub Mercury. Saturn AD with Saturn occupying H6 (employment) = primary career-launch AD. Pattern J1 fires (service + business hybrid because H10 CSL signifies both H6 and H7).

**Step 4 partial denier (Pattern D2)**: Sun in H9 sits at the deepest layer of H10 CSL chain. Explains why interviews succeeded structurally but "slipped at the last minute" (user's reported lived experience).

**Saturn return**: Aug 2029 + Apr 2030 (overlaps Mercury AD start = doubly significant pivot).

**Yogini Dasha cross-check**: Currently Pingala (Sun lord). Mercury AD ↔ Yogini Jupiter = SHARED-LORD CONVERGENCE flagged for marriage.

**Decision support score**: 86/100 STRONG GO for career (was 100 before fix-10 added penalties).

**Engine confidence**: marriage 75-78, career 86, children 55 (post-fix-10).

---

## Pending — fix-11: Output structure refactor (DESIGNED, NOT YET IMPLEMENTED)

User and Claude hashed out an output-structure refactor at end of arc. Plan locked, code not yet shipped. **This is the next PR.**

### Decision: Option B (5 sections, astrologer mode) + Option C (3 sections, user mode)

**Astrologer-mode 5-section structure**:

1. **VERDICT** (~3-4 short lines): tier + confidence + 1-line primary reason + patterns fired (compact list)
2. **STRUCTURAL EVIDENCE** (merged former 2+3, table-first):
   - Primary cusp + CSL chain
   - Star-Sub Harmony 3-layer table (SELF/STAR/SUB rows × 4 cols)
   - A/B/C/D Significators table (per relevant house)
   - Fruitful significators (sig ∩ RP) inline 1-2 lines
   - Supporting cusp activations table
   - 4-step chain summary line
   - **CONFLICTING SIGNALS panel** (only when TENSION/MIXED/CONTRA — already RULE 19)
3. **TIMING** (merged former 4+5, table-first):
   - AD-level scan (table)
   - PAD-shifts within current AD (text + sub-tables)
   - **Sookshma fire-score ranking table** (already computed in fix-10, formatter emits)
   - Transit convergence (only if Jupiter/Saturn aligns with key cusp)
   - Saturn/Jupiter return waypoints (one-line callouts)
4. **PATTERNS + REMEDIES** (new consolidated):
   - Patterns fired (M5, T4, D2, etc. — one line each with date/window)
   - Remedies (only if RULE 31 trigger criteria met — friction signal present)
5. **CLIENT-FACING** (kept Q/A + summary as user explicitly requested):
   - **5a. Pre-answered follow-ups** (Q/A format, max 3, no rephrasing of earlier sections — already RULE 19 de-dup discipline)
   - **5b. Client summary** (continuous prose paragraph, 2-3 paragraphs, calibration caveat at end)

**User-mode 3-section structure** (deferred — implement only if user confirms scope):
1. WHAT THE CHART SAYS (plain-English verdict, no jargon)
2. WHEN (timing window, no jargon)
3. WHAT TO DO (actionable + grounding insight)

### Implementation rules

- **Tables, not ASCII art** (decided — tables win on token density + Claude generation reliability + scanability + frontend rendering + 6 other axes).
- **No information loss** — every signal currently emitted should still appear, just denser.
- **Pattern names always cited explicitly** (M5, T4, D2 etc.).
- **Calibration caveat mandatory** in 5b summary.
- **Q/A format kept** in 5a (user request — do NOT fold into prose).

### Where the design discussion lived

The Option B refinement was the last substantive design conversation in this arc. Search the conversation transcript for "Option B" or "5 sections" if you need the full reasoning. Key points already encoded above.

### Token economics

Current astrologer-mode output: ~12-14k tokens.
Option B target: ~8-9k tokens (35% reduction).
At 1000 queries/month: $210 → $135 = $75/month saved on output cost.

### Engine impact

Sookshma fire-score ranking is ALREADY computed (fix-10) — fix-11 just changes how the formatter renders it. Decision support penalties are ALREADY active. Conflicting signals panel logic is ALREADY in RULE 19. **Fix-11 is mostly system prompt + formatter changes, not new compute.**

---

## What NOT to do (lessons learned)

1. **Don't pivot the engine when the user mentions another astrologer's reading.** RULE 4 + RULE 21B encode this. Both readings can be valid at different precision levels.
2. **Don't inject chart-specific bias.** Every fix audited against universal-vs-chart-specific. Tenali got hardcoded once in fix-6 (general.txt example) and was caught in audit-3.
3. **Don't re-introduce session auto-restore** (PR22 / PR24 era — see CLAUDE.md). User reverted twice.
4. **Don't use `overscroll-behavior: contain`** — breaks iOS scroll. Permanently blacklisted.
5. **Don't predict death timing** (RULE 15 taboo'd). Speak in "challenging health window."
6. **Don't use Lahiri ayanamsa** — KP requires KP New (SIDM_KRISHNAMURTI_VP291).
7. **Don't use D9 / divisional as primary verdict** — KP is D1 sub-lord based.
8. **Don't add Parashari yoga names** — Raja Yoga / Gajakesari / etc. unreliable per KSK.
9. **Don't recompute** signals the engine already emits (RULE 18). LLM cites pre-computed values.
10. **Don't smooth over contradictions** in the LLM output (RULE 19). Conflicting signals must be cited explicitly.

---

## Open questions for fix-11 (locked-in answers in §Pending; pasted here for completeness)

1. ~~Section 4 (Patterns + Remedies) is new~~ → **YES, consolidate.**
2. ~~5a Q&A format~~ → **YES, keep as Q/A pairs, capped at 3.**
3. ~~5b summary~~ → **2-3 paragraphs, continuous prose, calibration caveat at end.**
4. ~~Tables in Section 2 + 3~~ → **YES, markdown tables (frontend supports markdown rendering).**
5. ~~User mode (3 sections)~~ → **Defer to a separate UX-polish PR (A1.3e).**

---

## Pending tracks (after fix-11)

### A1.3e — UX polish (frontend)

The backend Analysis tab is structurally complete. UX layer pending:
- Confidence bar in answer header (visual progress bar showing engine confidence)
- "Show KSK source" expandable per verdict
- Caveats section collapsible by default
- Per-verdict pattern-name links to pattern_library entries
- Conflicting-signals panel rendered with proper formatting (warning icon etc.)
- Saturn return / Jupiter return waypoints rendered as life-arc timeline visualization
- Frontend support for the new 5-section structure (sections may be expandable vs collapsed-by-default)

### A1.4-A1.10 (rest of Track A.1, deferred)

Still in the original Track A.1 queue per BACKLOG.md:
- A1.4 / A1.5: Transit research audit + accuracy fixes (transit_engine.py)
- A1.6 / A1.7: Muhurtha research audit + fixes (muhurtha_engine.py — already partially done in PR A2.2 series)
- A1.8 / A1.9: Match research audit + fixes (match_engine.py)
- A1.10: Cross-tab regression sweep (verify Analysis output unchanged across all natal charts in test harness)

### Real-world calibration

The single biggest test for the engine is: **do its predictions match outcomes?** No prediction-outcome database exists yet. Long-term plan:
- When user's contract signs (predicted Mercury sookshma Apr-May, Venus sookshma May-Jun, OR Saturn-Mercury PAD Aug 28+), record actual date + diff against engine prediction.
- Same for any future life events the user shares (marriage, job switches, PR, etc.).
- Build prediction-outcome tracking table once auth+DB lands (Track B).

### Track B (auth, CRM, billing — DEFERRED)

Per BACKLOG.md. Stripe billing requires its own pricing-research session before any code is written. Auth could land standalone but no pressure.

---

## Quick reference — file map

```
backend/
  app/
    routers/
      astrologer.py              # /workspace, /analyze, /quick-insights endpoints
                                 # Wires advanced compute + transit + Yogini + decision support into chart_data
    services/
      llm_service.py             # ~2300 lines — system prompt (34 rules), KB cache, format_chart_for_llm,
                                 # get_prediction with Anthropic prompt caching, get_quick_insights
      kp_advanced_compute.py     # ~1800 lines — A/B/C/D, harmony, supporting cusps, aspects, combustion,
                                 # conjunctions, pada, dignity, vargottama, gandanta, intercepted signs,
                                 # stelliums, lagna lord, divisional charts, ashtakavarga, decision support,
                                 # past-event verification, sookshma ranking, partner profile
      kp_transit_compute.py      # ~350 lines — current transits, Sade Sati, key cusp transits,
                                 # upcoming 48-month windows, planetary returns
      kp_yogini_dasha.py         # ~150 lines — 36-year parallel cycle, cross-check with Vimsottari
      chart_engine.py            # natal chart, Vimsottari MD/AD/PAD/Sookshma, RPs (7-slot)
  knowledge/                     # All loaded by load_knowledge (cached)
    general.txt                  # Core KP principles, 34 rules
    marriage.txt, job.txt, foreign.txt, other_topics.txt, etc.  # Topic KBs
    bhavat_bhavam.md, parents_family.md, profession_detailed.md, etc.  # Deep dives
    pattern_library.md           # 14 named patterns (M1-M6, C1-C3, J1-J3, W1-W3, T1-T4, D1-D2)
    gold_standard_examples.md    # 3 master-format complete analyses
    confidence_methodology.md    # Score formula + Expected Distribution benchmark
    personality_psychology.md    # 4-pillar framework + 27 nakshatra archetypes + free-form routing
    remedies.md                  # KP parihara — behavioural-first
    transit_rules.txt            # Gocharya rules + RP integration
    ksk_rejections.md            # 17 anti-Parashari guardrails
    timing_confirmation.txt, kp_csl_theory.txt, planet_natures.txt  # Foundational

frontend/
  app/app/page.tsx               # Main app page — 4 axios POSTs to astrologer/* endpoints
                                 # All 4 send gender field
  components/                    # UI components

.claude/
  CLAUDE.md                      # Repo-root project notes (read first)
  BACKLOG.md                     # Track plans (read on session start)
  DAILY_LOG.md                   # Append-only session log
  HANDOFF-analysis-tab.md        # THIS FILE
  research/
    analysis-accuracy.md         # Earlier analysis accuracy research
    horary-audit.md              # Track A.1 horary audit
    panchang-audit.md            # Track A.1 panchang audit
    muhurtha-audit.md            # Track A.1 muhurtha audit
```

---

## Status block

- **Last PR pushed to develop**: `aa31528` (PR A1.3-fix-10) on third-audit cleanup day.
- **Branch**: `develop`. Worktree: `claude/eager-elbakyan` at `C:\Users\manyu\kp-astro\.claude\worktrees\eager-elbakyan`.
- **Tests**: backend has only `test_muhurtha_engine.py` so far. Analysis-tab compute is verified via manual smoke tests at end of each PR (smoke-test code logged in commit messages).
- **In flight**: nothing committed-but-unpushed. Working directory has only `.claude/settings.local.json` modifications (irrelevant).
- **Next PR**: A1.3-fix-11 — output structure refactor to Option B (5 sections + tables). Design locked; code not yet started.

---

*Append entries below this line as the arc continues. Don't rewrite history above.*

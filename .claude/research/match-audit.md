# Marriage Match Engine Audit — Track A.1 / PR A1.4

**Status:** Research-only doc. No engine code changed in this PR. Awaiting user
sign-off before implementing fixes.

**Trigger:** User tested 3 different prospective partners against own chart on
2026-05-15. All 3 returned a positive verdict ("Compatible" or higher). User
flagged: "is it really compatible or is it a bug?"

**Tl;dr — it is a bug-cluster, not a one-liner.** The engine has at least
one verifiable scoring inversion (Tara kuta), three structural rules that
silently inflate the verdict (Venus override, has-promise looseness, default
Compatible bias), and several missing KP techniques that a 20-year astrologer
would consider non-negotiable (UNION method, 7-slot RP, type classification
via 5-signal framework, longevity-band match, D9 feedback into verdict).

**Files in scope:**
- `backend/app/services/compatibility_engine.py` (1150 LOC — the engine)
- `backend/app/routers/compatibility.py` (55 LOC — endpoints)
- `backend/app/services/llm_service.py:3491-3653` (`format_match_for_llm`,
  `get_match_prediction` — AI path)
- `backend/knowledge/marriage_matching.txt` (compatibility-specific KB)
- `backend/knowledge/marriage.txt` (single-chart KB, depth + 5-signal type
  framework)

---

## 1. What a 20-year KP astrologer actually does

Sourced from: KSK KP Reader IV (Marriage and Married Life), KSK Reader I
chapters on RPs and timing, our internal `marriage.txt` Sections 1-13,
`kp_csl_theory.txt` UNION method, `kp_ruling_planets_deep.md` 7-slot system,
and our `marriage_matching.txt` cross-chart procedure.

The 20-year astrologer's mental checklist, in execution order:

### Stage A — Individual promise (one chart at a time)
1. **H7 CSL signification** via 4-step UNION method:
   - Step 1: occupied house of H7 CSL planet
   - Step 2: houses owned by H7 CSL planet
   - Step 3: houses signified by H7 CSL's **star lord** (occupation + ownership)
   - Step 4: houses signified by H7 CSL's **sub lord** (occupation + ownership)
   - **Promise** = chain hits {2, 7, 11} cleanly.
   - **Denial** = chain hits {1, 6, 10, 12}.
   - **Mixed** = both — verdict requires deeper inspection.
2. **H7 CSL is in retrograde star?** → delay / denial signal.
3. **Venus position and dignity** — context only (not override). Strong
   Venus = quality of marriage. Weak Venus = friction even if promise present.
4. **H2 CSL** — does it signify {7, 11}? This is the *timing/arrangement* gate.
5. **H11 CSL** — does it signify {2, 7}? This is the *fulfillment* gate.
6. **7th lord sign placement** — H6/8/12 = obstacles.
7. **Saturn affliction to H7** — occupation OR 3rd/7th/10th aspect = delay.
8. **Mars/Kuja** — H1/2/4/7/8/12 occupation with severity by house.
9. **Rahu/Ketu on H1-H7 axis** — unconventional / karmic delay signal.

### Stage B — Type classification (per `marriage.txt` Section 12)
Five signals to identify love vs arranged vs love-cum-arranged vs love-affair-
that-fails-then-arranged:
1. H5 presence in H7 CSL chain
2. 5L placement quality (H6/8/12 = love path negated — **the critical override**)
3. H4 + H9 parental-mediation check
4. Moon house position (family-driven indicator)
5. 5L-7L relationship (the binder — same planet, conjunction, parivartana, aspect)

### Stage C — Cross-chart compatibility
1. **Both promise individually** — if one chart denies marriage, this match
   may never reach the registrar even if Ashtakoota = 36/36.
2. **Cross-resonance** — Chart A's marriage significators in Chart B's
   *7-slot Ruling Planets* (not Chart B's significators — that's redundant
   with A's own analysis).
3. **Tara kuta** — Janma-to-Janma nakshatra counting; auspicious vs
   inauspicious tara categorization.
4. **Bhakoota** — Moon-sign distance; treat 2-12, 6-8, 5-9 axes as friction.
5. **Nadi** — same nadi = serious health/progeny dosha; with classical
   exceptions (different Janma rashi, different pada, friendly Graha Maitri).
6. **Manglik mutual cancellation** — reduces severity, doesn't fully cancel.
7. **Yoni / Gana / Vasya / Graha Maitri / Varna** — Ashtakoota traditional;
   KSK explicitly rejected these as primary criteria but most South-Indian
   practitioners still glance at them for client comfort.

### Stage D — Timing alignment
1. **Current MD/AD/PAD** of each person — are they running marriage-favorable
   periods?
2. **Time-window overlap** — when does Person A enter a Venus/Jupiter/H7-sig AD
   AND Person B enter the same? That's the wedding window.
3. **Jupiter transit** through H1/H2/H7/H11 of both natal charts in the next
   12-24 months — strongest transit confirmation.
4. **Saturn transit** through H7 of either chart → delay during that ~2.5y.

### Stage E — Quality / friction analysis
1. **Separation/divorce risk** — H7 CSL touching {6, 8, 12}, Mars-Saturn
   afflictions to H7.
2. **Children prospects** — H5 CSL of both compared; both promising H5
   significations = harmony for progeny.
3. **Longevity-band match** — both should be in similar Ayushya bands.
   Severe mismatch (one short, one long) = serious red flag a senior
   astrologer raises gently.
4. **D9 Navamsa** — H7 sign and H7 lord in D9 of each chart. If D1 promises
   but D9 negates → "promise without bliss." Affects quality, not yes/no.
5. **Sustained-happiness check** — H2-from-H7 of native chart (i.e., H8),
   Venus dignity, Moon affliction.

### Stage F — Spouse-profile match
1. What does each chart predict for spouse type? (profession, age band,
   nature — per `marriage.txt` Section 13)
2. Does the actual partner FIT that predicted spouse profile?
3. If charts predict opposite types — friction signal even if compatible
   scores.

### Stage G — Astrologer's discretion
1. Day-Hora compatibility (Sun-Moon hora — practitioner-dependent)
2. Specific yogas: Vivah Sukha, Vipreet Raj, Daridra Yoga affecting H7
3. Sookshma compatibility within the current AD (rare; expert-tier)

---

## 2. What our engine actually computes

Comparing the checklist above to `compatibility_engine.py`:

| Astrologer step | Engine status | Where |
|---|---|---|
| H7 CSL → houses signified | ✅ Computed | `_h7_sublord_promise` |
| H7 CSL UNION method (Step 3+4: star lord + sub lord chain) | ❌ **MISSING** | only star lord, no sub lord chain; only 1-deep, not 2-deep |
| H7 CSL in retrograde star | ❌ **MISSING** | no check |
| Venus position + dignity | ✅ Computed | `_venus_analysis` |
| H2 / H11 CSL gates | ✅ Computed | `_supporting_cusps` |
| 7th lord sign placement | ⚠️ Partial | `h7_sign_lord` extracted but its house occupation never used |
| Saturn affliction to H7 (aspect) | ❌ **MISSING** | only Saturn IN H7 (occupation) checked in `_separation_risk` |
| Mars/Kuja by house | ✅ Computed | `_check_kuja_dosha` |
| Rahu/Ketu on H1-H7 axis | ❌ **MISSING** | no check |
| 5-signal type classification | ❌ **MISSING** | engine uses a 4-line heuristic, KB Section 12 framework not wired |
| H5 in H7 CSL chain | ❌ **MISSING** | only H5 CSL itself analyzed, not H5 presence in H7 chain |
| 5L placement (H6/8/12 override) | ❌ **MISSING** | nowhere computed |
| H4 + H9 parental check | ❌ **MISSING** | nowhere computed |
| 5L-7L relationship | ❌ **MISSING** | nowhere computed |
| Both promise check | ⚠️ Loose | uses raw `has_promise` not `has_promise AND NOT has_denial` |
| 7-slot Ruling Planets | ❌ **MISSING** | `_ruling_planets` returns 4 slots only (no Moon Sub Lord, no Lagna Sub Lord, no Day Lord) |
| Cross-resonance | ⚠️ Statistical noise | counts intersection of all-significators × 4-slot RPs; almost always ≥ 3 |
| Tara kuta | 🐛 **INVERTED** | auspicious set is `{1,3,5,7}` but the actual inauspicious taras ARE Vipat-3, Pratyak-5, Vadha-7. **Smoking gun #1.** |
| Bhakoota | ✅ Computed | `_calc_bhakoota` |
| Nadi | ⚠️ No exceptions | classical pada/rashi exceptions not implemented |
| Manglik mutual cancellation | ⚠️ Too aggressive | sets `has_dosha=False` entirely; should reduce severity |
| Yoni / Gana / Vasya / Graha Maitri / Varna | ⚠️ Mixed quality | Vasya map missing 5 of 12 signs; Varna patriarchal default; Gana cancellations not implemented |
| Current MD/AD/PAD | ✅ Computed | `_current_dba` |
| Time-window overlap (dasha intersection) | ❌ **MISLABELED** | `_dasha_overlap_check` only compares shared significators in shared RPs — not actual time overlap of marriage-favorable periods |
| Jupiter transit window | ❌ **MISSING** | nowhere computed |
| Saturn-on-H7 transit | ❌ **MISSING** | nowhere computed |
| Separation risk → verdict | ⚠️ Computed, not used | `_separation_risk` runs but doesn't feed `overall_verdict` |
| H5 cross-comparison for children | ❌ **MISSING** | H5 CSL computed per chart but not compared |
| Longevity-band match | ❌ **MISSING** | nowhere computed |
| D9 H7 in verdict | ⚠️ Computed, not used | `_compute_d9` runs but D9 signs never feed `overall_verdict` |
| Spouse-profile match | ⚠️ Computed, not compared | each chart's H7 traits returned but not compared between partners |

**Bottom line:** out of ~30 astrologer-level checks, we **compute ~12 correctly,
compute ~6 but never use them in the verdict, and miss ~12 entirely.** The
verdict scoreboard runs almost entirely off 3 inputs (H7 CSL has_promise,
Ashtakoota total, Kuja dosha) — which is roughly the depth a junior astrologer
brings, not 20 years.

---

## 3. The "everyone is Compatible" bug — root cause analysis

Let's trace the verdict math for the user's reported 3-of-3 false positive.

### Bug cluster 1 — Tara kuta inversion (the smoking gun)

```python
# compatibility_engine.py:810
auspicious_gb = r_gb in {1, 3, 5, 7}
auspicious_bg = r_bg in {1, 3, 5, 7}
```

The standard Tara ladder, counting from Janma nakshatra (inclusive) and
taking `count % 9`:

| Remainder | Name      | Nature        |
|-----------|-----------|---------------|
| 1         | Janma     | Mixed/borderline |
| 2         | Sampat    | **Excellent** |
| 3         | Vipat     | **Inauspicious** |
| 4         | Kshema    | **Good** |
| 5         | Pratyak   | **Inauspicious** |
| 6         | Sadhaka   | **Good** |
| 7         | Vadha     | **Inauspicious** |
| 8         | Mitra     | **Excellent** |
| 0 (=9)    | Ati-Mitra | **Excellent** |

**Auspicious taras = {2, 4, 6, 8, 0}.** Janma (1) is borderline.
**Inauspicious taras = {3, 5, 7}.**

The engine's check `r_gb in {1, 3, 5, 7}` calls the **three worst taras
auspicious** AND inverts every "good" tara to inauspicious. This is a
straight-up scoring inversion.

**Impact on the user's tests:** Tara contributes up to 3 points out of 36.
Statistically, 3/9 ≈ 33% of random nakshatra pairs hit a "bad" tara by the
inverted rule (which is actually a good tara) — so a random match gets +3
Tara points that should be 0, and conversely a real bad tara silently
scores 3. Effectively the Tara score is **detached from reality** — it's
contributing 1.5-3 points of noise that tilts most marginal cases over the
"Compatible" threshold.

### Bug cluster 2 — `has_promise` is too loose

```python
# compatibility_engine.py:324
has_promise = bool(sigs & MARRIAGE_PROMISE_HOUSES)
```

KSK strict rule: "If the sub lord of the 7th cusp signifies 2 **AND** 7
**AND** 11..." (marriage.txt:24-25). The engine treats signifying *any*
one of {2, 7, 11} as promise. With our 4-level significator collection
yielding 5-8 planets touching {2, 7, 11} per chart, *almost every chart*
returns `has_promise = True`.

Then in `_kp_compatibility`:
```python
p1_effective = promise1["has_promise"]  # raw, not the cleaner "Promised" verdict
```

The local `verdict` field correctly resolves to "Promised" only when
`has_promise AND NOT has_denial`. But the cross-chart compatibility path
reads `has_promise` raw — so a chart with H7 CSL signifying {2, 6} (mixed)
is treated as effectively promising. **This is the engine choosing the
looser of two readings of its own data.**

### Bug cluster 3 — Venus override violates strict KP rule

```python
# compatibility_engine.py:716-725
if promise1["has_denial"] and venus1["enhances_promise"]:
    p1_effective = True  # Venus karaka overrides denial → Conditional
```

`marriage.txt:153-154` states explicitly:
> "DO NOT use Venus strength to 'rescue' a weak H7 CSL verdict from DENIED
> to CONDITIONAL. The CSL signification is what determines promise. Period."

The engine does exactly what the KB forbids. Any chart with strong Venus
(common — Venus appears in RPs at any time Venus is the Moon-sign-lord or
Lagna-sign-lord, which is roughly 1 in 6 charts) gets a "Venus saves the
denial" upgrade. This is KSK-non-compliant and directly inflates positive
verdicts.

### Bug cluster 4 — Default-Compatible weighting

```python
kp_score = {"Strong Match": 3, "Good Match": 2, "Fair Match": 1,
            "Conditional": 1, "Caution": 0}.get(kp["kp_verdict"], 1)
ast_score = 2 if ashtakoota["total_score"] >= 25 else 1 if ashtakoota["total_score"] >= 18 else 0
combined = kp_score + ast_score - dosha_penalty

if combined >= 4:  overall = "Highly Compatible"
elif combined >= 2: overall = "Compatible"
elif combined >= 1: overall = "Conditionally Compatible"
else:               overall = "Needs Careful Consideration"
```

**The lowest non-zero kp_score is 1 (Conditional or Fair).** Combined with
`ast_score = 1` (which fires for Ashtakoota ≥ 18, roughly 50% of all
charts), the floor for "Compatible" (combined ≥ 2) is met before any
positive evidence is considered. With Tara inversion adding +1.5 to +3
of inflated score, Ashtakoota ≥ 18 is the default state.

**The math says: to get *below* "Compatible," you need EITHER kp_verdict =
Caution AND ast < 18 AND no dosha cancellation, OR a Nadi dosha plus another
two penalties.** That's a narrow path — most charts default upward.

### Bug cluster 5 — Resonance is statistical noise

```python
# compatibility_engine.py:706-709
resonance_1to2 = sorted(sigs1 & rp2)
resonance_2to1 = sorted(sigs2 & rp1)
total_resonance = len(set(resonance_1to2) | set(resonance_2to1))
```

`sigs1` is `_marriage_significators(chart1)` — every planet touching {2,7,11}
through the 4-level chain. For a typical chart, this returns **5-8 planets
out of 9**. `rp2` is a 4-element set (Moon-sign-lord, Moon-star-lord,
Lagna-sign-lord, Lagna-star-lord). Probability that 5+ out of 9 planets
intersects a 4-element set: nearly 100% gives intersection ≥ 2, very
common gives ≥ 3.

The threshold `total_resonance >= 3` for "Strong Match" or "Good Match"
fires too easily. It feels like a signal but it's mathematical noise. To
make resonance meaningful, the significator side needs to be tightened
to "fruitful significators only" (those in the running dasha chain) and
the RP side needs to be the 7-slot RP (which we don't compute).

### Bug cluster 6 — Denial houses miss H12

```python
# compatibility_engine.py:119
MARRIAGE_DENIAL_HOUSES = {1, 6, 10}
```

`marriage_matching.txt:23-27` and `marriage.txt:12` both include H12 as
a denial house (separation, isolation, foreign separation, loss). H12 is
omitted from the constant. So a chart with H7 CSL signifying H12 strongly
never triggers `has_denial` — only `_separation_risk` notes it, and that
doesn't feed `overall_verdict`.

### Net effect for the user's 3 tests

Without seeing the actual chart data, the most likely scenario is:

- User's own chart (Person 1) — H7 CSL has at least 1 signification in {2,7,11},
  → `has_promise = True` → `p1_effective = True`
- Each prospective partner — same as above for any normal chart →
  `p2_effective = True`
- Cross-resonance ≥ 1 (almost always true given 4-level significators) →
  `kp_verdict = "Good Match"` (kp_score = 2)
- Ashtakoota ≥ 18 (inflated by Tara inversion) → `ast_score = 1`
- No serious dosha → `dosha_penalty = 0`
- combined = 3 → `Compatible` (or `Highly Compatible` at 4+)

**Three different partners all hitting "Compatible" is structurally
inevitable with the current engine.** It's not noise; it's the system
working as coded.

---

## 4. Severity-tagged bug catalog

### Critical (verdict-distorting, must fix in PR A1.4)

1. **Tara kuta inversion** (`_calc_tara:810`) — auspicious set wrong. Replace
   `{1, 3, 5, 7}` with `{2, 4, 6, 8, 0}`; add Janma (1) as half-credit.

2. **`has_promise` loose** (`_h7_sublord_promise:324`) — gate on subset rather
   than full {2,7,11} match. Introduce tiered promise:
   `full_promise` (all three), `partial_promise` (2 of 3), `weak_promise` (1 of 3).

3. **Venus override** (`_kp_compatibility:716-725`) — remove entirely or gate
   behind a strict-KP-mode flag (off by default). KB explicitly forbids it.

4. **`p1_effective` reads `has_promise` not `verdict == Promised`** —
   route through the cleaner verdict that subtracts denial.

5. **H12 missing from denial houses** (`MARRIAGE_DENIAL_HOUSES:119`) — add 12.

6. **Default-Compatible bias** (`compute_compatibility:1096-1113`) — raise
   the threshold for "Compatible" so Conditional + Ashtakoota-mid doesn't
   automatically clear; add separation_risk and D9 H7 to the math.

7. **Resonance threshold too low** — change `total_resonance >= 3` from
   "5-8 sigs × 4 RPs" math to "fruitful sigs × 7-slot RPs" math. Reduce
   threshold to 2 *after* tightening both sides.

### High (real KP technique missing — astrologers will flag these)

8. **Missing 7-slot RP** (`_ruling_planets:548`) — Day Lord, Moon Sub Lord,
   Lagna Sub Lord. Reuse logic from PR A1.1c horary engine.

9. **Missing UNION method on H7 CSL** — extend `_planet_significations` to
   take Step 4 (sub lord's houses), not just Step 3 (star lord's).

10. **Missing 5-signal type classification** — implement `marriage.txt`
    Section 12 framework. The current `marriage_type` 4-line heuristic
    misclassifies the love-affair-fails-then-arranged case (the most
    common Indian-context pattern).

11. **Missing 5L placement override** — required by Section 12 Signal 2.

12. **Missing H4 + H9 parental check** — required by Signal 3.

13. **Missing Saturn aspect to H7** (3rd/7th/10th aspect) — `_separation_risk`
    only checks Saturn IN H7. Major delay signal silently dropped.

14. **Dasha overlap is mislabeled** (`_dasha_overlap_check`) — function name
    promises time-window analysis; implementation only does RP intersection.
    Rename + implement real overlap: scan next 60 months of each person's
    AD ladder, score each AD for "favorable for marriage in *this* chart,"
    then find months where both are favorable simultaneously.

15. **Jupiter/Saturn transit window** — compute next 24 months of Jupiter
    transit through {1, 2, 7, 11} of each chart and Saturn through {7};
    flag wedding-favorable windows.

16. **Spouse-profile cross-comparison** — engine has per-chart profile traits;
    add a comparator: do Person A's predicted spouse profile and Person B's
    actual H7-cusp-derived self-profile align? Mismatch = friction signal.

17. **Longevity band comparator** — compute Ayushya band per chart;
    flag if mismatch (one short, one long).

### Medium (precision improvements, KB-grounded)

18. **H7 CSL in retrograde star check** — KB Phase 18 added this; engine missing.

19. **Rahu/Ketu on H1-H7 axis** — flag for unconventional/karmic delay signal.

20. **Vasya map incomplete** (`VASYA_MAP:113`) — only 7 of 12 signs; missing
    Aries, Taurus, Gemini, Libra, Sagittarius. Silent score 0 for those.

21. **Varna gender ambiguity** — when gender missing, falls back to
    "Person 1 = Boy" silently. Either error or compute both directions.

22. **Manglik mutual cancellation too aggressive** — currently zeroes both
    doshas. Should reduce severity by one tier, not fully cancel.

23. **Nadi exceptions missing** — classical pada/rashi cancellations.

24. **Gana dosha cancellations missing** — friendly Graha Maitri, sign-distance
    5/9 cancellations.

25. **Bhakoota not in `critical_doshas` list** — 6-8 Shadashtak is severe
    but doesn't surface in the critical-doshas display field.

26. **Separation risk → verdict feedback** — `_separation_risk` runs but
    never feeds `overall_verdict`. High risk should down-tier.

27. **D9 H7 → verdict feedback** — D9 computed but only as cosmetic data.
    D9 H7 CSL contradicting D1 should down-tier "quality."

28. **H5 cross-comparison for children** — compute, surface, don't fold
    into the headline yes/no.

### Low (cosmetic / non-verdict)

29. **Nakshatra alias inconsistency** — "Mula" vs "Moola" both mapped but
    other engine paths might pick a single canonical and miss the other.

30. **Yoni "Mongoose" is asymmetric** — current handling treats Mongoose as
    neutral always; classical sources differ.

---

## 5. AI prompt path audit (`get_match_prediction`)

The AI receives:
- `marriage` KB file (`load_knowledge("marriage")` — 600+ lines, includes
  Section 12 type framework and Section 13 spouse profile)
- `format_match_for_llm` worksheet (the engine's outputs structured for LLM)
- The user's question + ≤4 history turns

**Strengths:**
- KB is loaded; the AI has access to the 5-signal framework, KP UNION
  rule, spouse-profile direction, Venus-as-context-not-override rule.
- Worksheet includes both charts' H7 CSL, supporting cusps, Venus, RPs,
  detailed 4-level significators (with fruitful subset), DBA, H5, separation
  risk, D9, Kuja, Ashtakoota, timing.
- System prompt emphasizes "use only data provided, never invent."

**Gaps & risks:**

- **G1.** AI inherits engine bugs. If `_calc_tara` reports score=3 on a bad
  tara, AI takes it as ground truth. The KB doesn't tell AI to double-check
  Tara classification, so it parrots inflated Ashtakoota.

- **G2.** AI inherits the `Venus override → Conditional` upgrade. Worksheet
  prints `"verdict": "Conditional (Venus overrides)"` and AI explains marriage
  is "promised because Venus karaka is strong" — directly contradicting
  the KB it was given. The conflict between worksheet and KB confuses the
  model; in practice it follows the worksheet (more concrete) over the KB
  (more abstract).

- **G3.** No system-prompt rule analogous to Astrologer-mode RULES 39-43
  (Phase 17-18) for marriage match. The 6-rule list is generic ("be specific,
  reference CSLs"). Missing:
  - "If H7 CSL `has_denial` is True, you may not call this match Promised
    even if `venus_override` is set. State the engine flag and apply strict
    KP override."
  - "Verbatim-cite H7 CSL planet, signified houses, and verdict from the
    worksheet — do not paraphrase or 'adjust'."
  - "If either chart's H7 CSL signifies H12, mark as separation-risk match
    regardless of `overall_verdict`."
  - "Apply the 5-signal type classification from marriage.txt Section 12
    before stating the marriage type — do not parrot `marriage_type` field
    which is a 4-line heuristic."

- **G4.** Worksheet missing several deep KP fields the KB expects:
  - H5 in H7 CSL chain (Signal 1)
  - 5L placement (Signal 2 override)
  - H4 + H9 parental presence (Signal 3)
  - 5L-7L relationship (Signal 5)
  - 7-slot RP of each chart
  - H7 CSL star lord chain (UNION Step 3) explicitly listed
  - Spouse-profile match comparison
  - Longevity-band match
  - Jupiter/Saturn transit windows

- **G5.** Question-routing for sub-questions vs full-topic — the
  astrologer-mode router uses Sonnet for full_topic, Haiku for sub_question
  with topic-switch escalation. `get_match_prediction` is **always Sonnet**.
  Cost-wise this is fine for now (match queries are rare), but the model
  isn't aware whether the user is asking "are we compatible?" (full_topic)
  vs "what's our timing?" (sub_question of the same match). Caching
  efficiency is missed.

- **G6.** `max_tokens=6000` is fine but no `cache_control` on system
  prompt or KB. Each match call re-reads the entire 21K-token system
  context. Per `CLAUDE.md` cache TTL gotcha, this is fixable with `"1h"`.

---

## 6. Frontend display audit (`app/app/page.tsx` Match tab)

- Verdict color hard-coded:
  - "Highly Compatible" → gold
  - "Compatible" → green
  - "Conditionally Compatible" → amber
  - other → red
- This is fine *if* the verdict is honest. With current engine the green
  state fires too easily — user sees green and trusts it.
- Gender warning chip shows when either gender is unset (caveats Ashtakoota).
  Good, but doesn't caveat the actual verdict.
- AnimatedScoreDonut shows Ashtakoota score/36 — a number that is currently
  contaminated by Tara inversion. Users see "25/36" and trust the donut.
- KP verdict (Strong/Good/Fair/Conditional/Caution) is displayed as a small
  text chip next to the big serif verdict — visual weight goes to the
  inflated combined verdict, not the more honest KP-only verdict.
- No display anywhere of: separation risk level, individual promise (Promised
  vs Denied vs Conditional per chart), 5-signal type breakdown, longevity-band
  match, D9 contradiction.

**The frontend is structurally fine — it shows what the engine returns.
Fixing the engine fixes the display.** Two cosmetic additions to consider
post-fix:
- A "Why this verdict?" expandable that shows the gates that fired (good)
  and gates that didn't (concerning).
- Show separation risk level on the hero pane (not buried in the Risks
  sub-tab) when it's High or Moderate.

---

## 7. Why this matters for the product positioning

Per `CLAUDE.md`: "It should match 20+ year astrologer prediction — anyone
who sees two charts in our app, what it tells, same should be told by an
experienced astrologer."

A senior KP astrologer presented with 3 unrelated prospective partners
against the same native chart will return **3 different verdicts** — that's
the entire point of consultation. They calibrate on:

- Specific significator overlap with the *current* dasha
- Specific time-window alignment for the next 24 months
- Specific compatibility of predicted spouse-type vs actual partner-type
- Risk patterns visible in *this specific pair*

Our engine gives a verdict that is mostly a function of each chart's
*own* properties (does H7 CSL touch {2,7,11}?) plus a noisy resonance
metric. There's very little that genuinely depends on the *pairing*.

**The user's 3-of-3 false positive isn't a hallucination — it's the
engine's actual behavior, and it's the strongest single evidence that
this tab is below the quality bar set for Track A.1.**

---

## 8. Proposed remediation plan (PR A1.4 + A1.5)

I recommend splitting into two PRs to keep each reviewable.

### PR A1.4 — Critical + High fixes (verdict accuracy)

Engine:
1. Fix Tara kuta inversion (`_calc_tara`).
2. Replace `has_promise` with tiered `full_promise` / `partial_promise` / `none`.
3. Add H12 to `MARRIAGE_DENIAL_HOUSES`.
4. Remove Venus override from `_kp_compatibility` (strict-KP-mode default).
5. Route `p1_effective` / `p2_effective` through the corrected verdict, not raw `has_promise`.
6. Implement 7-slot RP in `_ruling_planets`.
7. Implement UNION method Step 4 (sub lord's houses) in `_planet_significations`.
8. Implement 5-signal type classification (replace 4-line heuristic).
9. Implement 5L placement override.
10. Implement Saturn-aspect-to-H7 in `_separation_risk`.
11. Fix `_dasha_overlap_check` to do real time-window overlap (rename to
    `_marriage_window_overlap`).
12. Re-weight `overall_verdict` combiner: include separation_risk and D9 H7;
    raise "Compatible" threshold so Conditional + average Ashtakoota does
    not auto-pass.
13. Reduce Manglik mutual cancellation to severity-reduction not zeroing.

LLM:
14. Add system-prompt rules for marriage match analogous to RULES 39-43
    (verbatim citation, no Venus override, H12 = separation, 5-signal
    framework before type statement).
15. Worksheet additions: H5-in-H7-chain, 5L placement, H4/H9 parental,
    5L-7L relationship, 7-slot RP, separation risk surfaced, D9 H7
    contradiction flag.
16. Add `cache_control: ephemeral 1h` to match system prompt (matches
    astrologer mode).

Tests:
17. Pytest golden fixtures: 5-6 hand-curated chart pairs with expert-set
    expected verdict (we already have user's 3 cases as live data — use those
    as the first 3 fixtures).
18. Tara kuta unit test: every nakshatra pair × 9 = 729 cases against the
    expected ladder.
19. Promise check: synthetic charts where H7 CSL signifies exactly {2,7,11},
    exactly {1,6,10,12}, exactly {6}, exactly {2,8} → expected verdicts.

Frontend:
20. Add separation-risk chip to hero when High/Moderate.
21. Add "Why this verdict?" expandable.
22. Cap verdict at "Conditionally Compatible" when individual promise is
    not "Promised" for both charts, regardless of Ashtakoota.

### PR A1.5 — Medium fixes + AI quality (depth and richness)

Engine:
23. Vasya map: add Aries, Taurus, Gemini, Libra, Sagittarius.
24. Varna gender ambiguity: error out or compute both directions.
25. Nadi exceptions (classical).
26. Gana cancellations (classical).
27. Bhakoota severe doshas → `critical_doshas`.
28. Spouse-profile cross-comparison.
29. Longevity-band match.
30. Jupiter/Saturn 24-month transit windows.
31. H5 cross-comparison for children.
32. Rahu/Ketu H1-H7 axis check.
33. H7 CSL in retrograde star.

Tests:
34. Cross-verify against ksrinivas.com or Jagannatha Hora KP module on
    the 3 user-provided pairs (the same way horary cross-checked).

Frontend:
35. Show individual promise badge per chart (Promised / Conditional / Denied).
36. Show 5-signal type chip (Love / Arranged / Love-cum-arranged / etc.)
    with the cited signals.
37. Show longevity band chip with mismatch warning.

---

## 9. Risk + rollback

**Risk on PR A1.4:** the verdict distribution will shift. Charts that
previously read "Compatible" will read "Conditionally Compatible" or
"Needs Careful Consideration." This is *correct* behavior but users who
relied on the previous output will see a perceived regression.

**Mitigation:**
- Phase the change behind a `strict_kp_mode` flag for one week if there's
  hesitation; default to `True` after observation.
- Add a "What changed" note in the verdict footer pointing to this audit.

**Rollback:** `git revert <pr-sha>` on `compatibility_engine.py` brings
back the old logic; KB and frontend changes are additive and safe.

---

## 10. Open questions for user

1. **Strict-KP-mode default vs flag?** If `True` by default, expect the
   verdict drop described above. Comfortable?
2. **Ashtakoota — keep or de-emphasize?** KSK explicitly rejected the
   36-gun system. If we de-emphasize, the donut on the hero card becomes
   less prominent. Some Telugu/AP clients EXPECT the 36-gun number — is
   that the audience or not?
3. **Do you want me to wire 5-signal classification *now* (PR A1.4) or
   defer to A1.5?** It's a major addition (~150 LOC) but unblocks honest
   "love vs arranged" answers.
4. **Cross-verification reference:** for horary we used ksrinivas.com. For
   match, which reference app do you want to cross-check against?
   ksrinivas.com? Jagannatha Hora? An offline astrologer you trust?

---

*Doc author: Claude. Date: 2026-05-15.
 Status: research only. Awaiting user sign-off before PR A1.4 implementation.*

---

## 11. External corroboration (web research, 2026-05-15)

After drafting §1-10 from our internal KB + KSK sources, I cross-checked
every major claim against open-web KP astrology sources. All major findings
are externally confirmed; one finding was strengthened with extra detail
not in our KB.

### C1. Tara kuta inversion — externally confirmed (3 independent sources)

The smoking-gun claim: our engine's `auspicious = {1, 3, 5, 7}` is wrong.
External sources unanimously map the ladder as:

| Remainder | Tara name | Nature |
|---|---|---|
| 1 | Janma | conditionally auspicious |
| **2** | **Sampat (Wealth)** | **auspicious** |
| **3** | **Vipat (Danger)** | **inauspicious** |
| **4** | **Kshema (Prosperity)** | **auspicious** |
| **5** | **Pratyari (Obstacle)** | **inauspicious** |
| **6** | **Sadhaka (Achievement)** | **auspicious** |
| **7** | **Vadha (Slaughter)** | **inauspicious** |
| **8** | **Mitra (Friend)** | **auspicious** |
| 9 (=0) | Ati Mitra (Great Friend) | auspicious |

Sources:
- AstroSight: "The inauspicious remainders (3, 5, 7) must be avoided in both directions for maximum compatibility."
- FutureScope Astrology
- Astroyogi
- Vedik Astrologer
- Quora (Harshg's Notes on Jyotish)
- AstrologerPanditJi
- AstrologyFutureEye

**Action confirmed:** replace `{1,3,5,7}` with `{2,4,6,8,9}` (Janma 1 = half-credit per Brihat Parashara). Effect: many marginal "Compatible" verdicts will move down.

### C2. Two-chart matching rule — clarified and refined

External canonical rule (kpastrologylearning.com Rule 5):
> "Both persons' 7th cusp sub lords AND the other's ruling planets should signify 2, 7, and 11 for harmonious union."

This is *more specific* than what our engine does. Our `_kp_compatibility` does:
- `sigs1 & rp2` — chart 1's marriage significators ∩ chart 2's RPs

The canonical rule is:
- (1) Chart 1's H7 CSL signifies {2,7,11} AND
- (2) Chart 2's RPs signify {2,7,11} AND
- (3) Vice versa for chart 2

Note: significators of {2,7,11} ≠ marriage significators in general. The canonical check asks "do chart 2's RPs signify chart 2's marriage houses?" — a per-chart check that *uses* the partner's RPs as a filter.

**Action:** rewrite `_kp_compatibility` cross-chart logic to match the canonical 4-way check, not the loose intersection.

### C3. 7-slot Ruling Planets — externally confirmed canonical KP

ajmerastro.com (citing KSK's own writings): 7 RP slots:
1. Day lord (weekday at query/event moment)
2. Ascendant sign lord
3. Ascendant star lord
4. Ascendant sub lord
5. Moon sign lord
6. Moon star lord
7. **Moon sub lord** — "KS Krishnamurti's own writings show the Moon sub lord frequently decides yes/no when other ruling planets are split."

Our engine: `_ruling_planets` returns 4 slots — only sign lord + star lord of Moon and Lagna. Missing: Day lord, Asc sub lord, **Moon sub lord (the most important per KSK)**.

**Action confirmed:** plumb 7-slot RP into compatibility (already done in PR A1.1c for horary — port that logic).

### C4. Venus is modifier, not override — externally confirmed

kpastrologylearning.com Rule 2: "If the 7th cusp's sub lord indicates 1, 6, 10, or 12, marriage won't happen; **consider Venus's stance**."

The phrase "consider Venus's stance" matches our KB's "Venus is context, not override." Venus is consulted as a refinement; it does not override the CSL signification verdict.

**Action confirmed:** remove the Venus override in `_kp_compatibility:716-725`.

### C5. 5L placement override + 5CSL framework — externally confirmed

redastrologer.com:
- 5L/5CSL signifying 5,6,12 = breakup (with 11 = reunion possible)
- 5,8 = secrecy/scandal relationship
- 5CSL connecting to 4,9,11 = arranged-marriage / parental-acceptance path
- 5CSL connecting to 5 and 7 = love marriage

This validates the 5-signal framework in our `marriage.txt` Section 12 — it IS canonical KP technique, not our internal interpretation. **Engine implementation gap stands.**

### C6. Nadi dosha cancellation exceptions — externally confirmed

Three classical exceptions universally cited:
1. Same nakshatra, different rashi (when nakshatra spans sign junction — e.g., Krittika across Aries/Taurus)
2. Same nakshatra, different pada (charan)
3. Same rashi, different nakshatra

Sources: jyotishgher.in, aaps.space, horasarvam.blogspot.com, astrosight.ai, astrosubhash.wordpress.com.

Our engine: no exceptions — Nadi dosha always full 0 if same nadi. **Confirmed gap.**

### C7. Manglik mutual cancellation — refined understanding

External consensus: when both partners are Manglik, the **severity reduces / energies balance** — *not* that the dosha is fully nullified. AstroSight: "Two Manglik individuals may have a dynamic, passionate relationship with occasional sparks. But the feared outcome ... is neutralized when both carry similar energetic signatures."

Additional cancellations confirmed:
- Saturn's aspect on Mars reduces explosive quality
- Jupiter's aspect on Mars softens aggression
- Mars in own sign (Aries/Scorpio) or exaltation (Capricorn) = much weaker dosha
- Other partner has Saturn in 1/4/7/8/12 → cancels

Our engine: zeroes both doshas entirely (`has_dosha = False`). **Confirmed too aggressive.**

### C8. Longevity matching — new gap surfaced beyond our KB

External sources reveal multiple South-Indian / Vedic match-making factors *beyond* Ashtakoota that real practitioners check, which we don't have:

1. **Mahendra Koota** — represents longevity of the relationship itself
2. **Ayurdaya / Ayushya** — life-span band match (premature-widowhood prevention)
3. **Stree Deergha** — auspicious for wife's longevity and happiness
4. **Rajju** — strength of the marital bond

Our engine: none of these computed. Real KP astrologers in Tamil/Telugu/Malayali tradition would always glance at Mahendra and Stree Deergha. **New gap added to PR A1.5.**

### C9. KSK 7-cusp sub lord requirement — strict reading confirmed

kpastrologylearning.com Rule 1: "When the 7th cusp's sub lord signifies 2, **and** 7, **and** 11 with a flawless Venus, marriage becomes assured."

The conjunction is "AND," not "OR." Signifying only one of {2,7,11} is *not* full promise. Our engine treating any subset as `has_promise = True` violates the strict reading.

**Action confirmed:** tier the promise as Full (all of 2,7,11) / Partial (2 of 3) / Weak (1 of 3) / None (zero or only denial houses).

### Citations

Sources consulted on 2026-05-15 IST:

- [KP Astrology Learning — Seventh Bhava Rules](https://kpastrologylearning.com/kp-jyotish-astrology-seventh-house-bhava-rules/) (canonical H7 CSL rules + two-chart matching rule)
- [Jyotishtek — Predicting Exact Date of Marriage in KP](https://jyotishtek.com/blog/predicting-exact-date-of-marriage/) (timing via DBA + RPs)
- [AstroSight — Tara Koota Calculation Secrets](https://astrosight.ai/kundli/tara-koota-calculation-secrets) (Tara ladder + scoring)
- [FutureScope Astrology — Nakshatra Tara Chakra](https://futurescopeastrology.com/learn-astrology/nakshatra-tarachakra/)
- [Astroyogi — Tara Koota in Kundli Matching](https://www.astroyogi.com/blog/the-tara-koota-in-kundli-matching.aspx)
- [Vedik Astrologer — Tara Chakra Kuta (Goon Milan)](https://vedikastrologer.com/tara-chakra-kuta-goon-milan/)
- [Quora — Harshg's Notes on Jyotish (Navtara)](https://notesonjyotish.quora.com/Navtara-Chakr-Vedic-astrology-is-built-on-the-framework-of-the-Nakshatra-so-basic-understanding-of-this-is-necessary-N)
- [Astrology Future Eye — Tara Balam Calculator](https://astrologyfutureeye.com/astro-calculators/tara-balam-astrology)
- [Astrologer Pandit Ji — Tara Dosh](https://www.astrologerpanditji.com/page962.htm)
- [AjmerAstro — Ruling Planets in KP Astrology (7-slot framework)](https://www.ajmerastro.com/en/blog/ruling-planets-in-kp-astrology)
- [Astrogle — Will Love Materialise into Marriage (5th + 7th houses)](https://www.astrogle.com/astrology/will-love-materialise-into-marriage-based-on-5th-and-7th-houses.html)
- [Red Astrologer — Marriage Predictions in KP (love affairs / breakups / delay)](https://redastrologer.com/marriage-predictions-in-kp/)
- [Rahasya Vedic Astrology — Love Marriage Prediction in KP](https://www.rahasyavedicastrology.com/kp-love-marriage-prediction/)
- [Jagannath Hora — Marriage or Heartbreak: KP 5-8-12 Formula](https://jagannathhora.com/marriage-or-breakup-kp-astrology-5-8-12-formula/)
- [Sanjeev Gadhokk / astro786 — Marriage Through KP System](https://astro786.com/2019/06/01/marriage-through-kp-system/)
- [AstroSight — Mangal Dosha Cancellation Rules](https://astrosight.ai/doshas/mangal-dosha-cancellation-rules)
- [AstroSight — Nadi Dosha in Marriage: Cancellation & Remedies](https://astrosight.ai/doshas/what-is-nadi-dosha-in-marriage)
- [Jyotish Gher — Nadi Dosha in Astrology](https://jyotishgher.in/kundli-milan/nadi-dosha.php)
- [Aaps Space — 5 Ways to Nadi Dosha Cancellation](https://aaps.space/blog/5-ways-to-nadi-dosha-cancellation-and-nadi-matching/)
- [Hora Sarvam — Exceptions to Nadi Dosha](https://horasarvam.blogspot.com/2017/12/exceptions-to-nadi-dosha.html)
- [Astrotalk — Nadi Dosha Effects & Remedies](https://astrotalk.com/astrology-blog/nadi-dosha-effects-types-and-remedies-in-kundli-matching/)
- [Divine Creation — KP Reader 4: Marriage, Married Life & Children (KSK source book)](https://divinecreationindia.com/marriage-married-life-e-children-or-english-or-kp-reader-4-or-original-or)
- [AskAstrologer — Marriage Match-Making (Mahendra, Stree Deergha, Rajju)](https://askastrologer.com/articles/match-making/)
- [ShreeKundli — Compatibility (Kundli Milan)](https://www.shreekundli.com/vedic-astrology/compatibility)
- [Decode Malayalam — Vivaha Porutham (South Indian 10-poruttham system)](https://decodemalayalam.com/vivaha-porutham-horoscope-matching-guide/)


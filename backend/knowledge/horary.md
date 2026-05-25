# KP Horary (Prashna) — Canonical Doctrine

**Purpose**: Dedicated KP horary doctrine consolidated from KSK Reader I-VI,
JyotishPortal canonical 249-table, KP Astrology Learning horary rules, and
verified KP authority sources (theastrologyonline.com, astrojasa.blogspot.com,
gautamcrystals.com, ajmerastro.com, RVA horary methodology).

**Why this file exists**: Horary doctrine had been scattered across
`general.txt §5` (Ruling Planets overview) and `kp_csl_theory.txt` (CSL
chains). This file consolidates horary-specific rules — the 249-table
mechanics, lagna validity gating, retrograde precision, Moon-as-querent's-mind
doctrine, rejection rules, timing precision, and Bhavat Bhavam for
relative-questions — into a single canonical reference.

**Engine support**: `app/services/horary_engine.py` implements every doctrine
documented here. Future AI features layered on top of horary should load
this file via `TOPIC_TO_FILE` routing.

**Sensitivity tier**: same routing as Analysis tab — Tier 1 (factual horary
like job promotion / education) gets standard verdict; Tier 2-3 (marriage,
divorce, longevity, suicide_risk, missing_person, surgery) gets protective
framing per `sensitivity_tiers.md` + RULE 52.

---

## 1. THE FOUNDATIONAL HORARY DOCTRINE

KP horary is the **moment-of-question chart**. When a querent comes to the
astrologer with a question, the astrologer asks them to:

1. **Hold the question in mind** with sincere intent (per KSK Reader I
   doctrine on Prashna validity — the question must arise spontaneously)
2. **Pick a number between 1 and 249** that comes to them at that moment

That number maps via the canonical KP 249 sub-lord table to a precise
zodiacal longitude. The longitude becomes the **Prashna Lagna** (the
ascendant of the horary chart). All 12 houses are then computed via
Placidus at the **astrologer's current location** at the **moment of
question**.

The verdict cascades through three layers:
1. **Lagna CSL fruitfulness** — does the question itself carry promise?
2. **Primary topic-house CSL** — does the topic's house gate open?
3. **Ruling Planets confirmation** — does the moment carry the matter?

All three layers aligning = strong YES. Two aligning = MEDIUM. One aligning
+ RPs speak = PARTIAL (delayed/indirect). None aligning = UNCLEAR.

---

## 2. THE 249 SUB-LORD TABLE (canonical KP)

The zodiac (360°) is divided into 27 nakshatras × 9 sub-lords = 243 base
subdivisions. The KP canonical table has **249 entries** because 6 sub-lords
cross sign boundaries and are represented as two rows (one per sign side).
The 6 boundary crossings occur in the Rahu-Moon-Mars nakshatra sequence at
Cancer/Leo, Scorpio/Sagittarius, and Pisces/Aries boundaries.

**Engine implementation**: `app/services/kp_249_table.py` generates the table
programmatically and inserts the 6 split rows in-place, so the table is
correct by construction. Cross-verified against
[JyotishPortal canonical table](https://jyotishportal.com/KPResource/KP1-249.aspx)
and KSK "A Handbook of Astrology — KP Reader I".

Each entry contains: longitude range, sign, nakshatra, star lord, sub lord.

---

## 3. LAGNA VALIDITY GATING (KSK 5°–25° rule) — PR H1

Per KSK Reader I doctrine on Prashna validity:

> "Unless the rising degree is more than about 5 degrees, the query is not
> yet ripened or matured to get an answer; similarly, if the ascendant
> degree of the Prashna/Horary is more than 25 degrees, then it means
> that it is too late to look into the query."

The verdict cascade STILL RUNS for all 1–249 numbers, but the astrologer
must explicitly weigh the structural caveat before delivering the verdict.

### Three states

| State | Degree in sign | KSK interpretation |
|---|---|---|
| **Premature** | < 5° | Query not ripened. Matter has not yet formed clearly. Re-query in 2–3 weeks (when situation matures) often produces a cleaner Prashna. Verdict structurally accurate but timing carries caution. |
| **Ripened** | 5°–25° | Decision window — query is structurally ripe. Standard horary verdict applies. |
| **Expired** | > 25° | Query too late. Matter may have already crystallized (positively or negatively) before the question was asked. Consider whether a related event has already occurred. |

### Engine emission
- `result.lagna_validity = {state, degree_in_sign, window_start, window_end, in_window, doctrine}`
- Clinical flag: `lagna_premature` / `lagna_ripened` / `lagna_expired` (yellow for non-ripened, green for ripened)
- Numeric confidence penalty: −10 when lagna outside 5°–25°

---

## 4. RULING PLANETS — KSK 5 + Modern 7-slot

KSK Reader IV (Marriage chapter) defines 5 canonical Ruling Planets at the
moment of judgment:

1. **Asc Star Lord** (Lagna Nakshatra Lord) — strongest
2. **Asc Sign Lord** (Lagna Rasi Adhipati)
3. **Moon Star Lord**
4. **Moon Sign Lord**
5. **Day Lord** (weekday — weakest of the 5)

Modern KP practice (mainstream KP apps — ksrinivas.com, Jagannatha Hora,
onlinejyotish.com) extends this with:

6. **Asc Sub Lord**
7. **Moon Sub Lord**

The engine emits the 7-slot version as standard (more precision without
controversy since sub lord is core to KP methodology). Planets appearing
in 2+ slots are flagged as **strongest** — KSK: "a planet which is a
significator of the same matter AND also appears among the RPs more
than once is the most reliable."

### Strength ladder for fruitful-significator counting

| Slot match | Weight |
|---|---|
| Asc Star Lord | 5 |
| Asc Sign Lord | 4 |
| Moon Star Lord | 3 |
| Moon Sign Lord | 2 |
| Day Lord | 1 |
| Asc / Moon Sub Lord (extended) | 2 each |

---

## 5. 4-LEVEL SIGNIFICATOR HIERARCHY (horary-specific application)

Per KSK Reader V, significators of any house collect in 4 levels (strongest
to weakest):

- **Level 1**: planets in CONSTELLATION (nakshatra) of the OCCUPANT of the house
- **Level 2**: OCCUPANTS of the house themselves
- **Level 3**: planets in CONSTELLATION of the OWNER (sign lord) of the house cusp
- **Level 4**: OWNER of the house cusp itself

The horary engine emits all 4 levels per planet via
`_planet_significations_by_level()`. For ranking primary-house
significators, the strongest level a planet hits wins; ties broken by RP
status (RPs bubble up).

### Rahu/Ketu node inheritance (KSK Reader I)

Nodes own no signs and no houses. They act as proxies via 4-priority chain:
1. Planets conjunct with Rahu/Ketu within 3.33° → STRONGEST proxy
2. Star (nakshatra) lord of Rahu/Ketu → adopt star lord's house significations
3. Sign lord (dispositor) → adopt sign lord's significations (Level 3 strength)
4. If untenanted nakshatra: proxy operates without obstruction

For HORARY specifically, when a node is conjoining a planet in its OWN
nakshatra, the conjoining planet's Level 1/2 significations contribute at
the same levels to the node's map.

---

## 6. THE 3-LAYER VERDICT CASCADE

### Layer 1 — Lagna CSL fruitfulness

The Lagna Sub-Lord at the Prashna Lagna longitude is examined first. Its
4-step significations (UNION) are checked against the topic's yes-houses
and no-houses:

- **Lagna CSL signifies yes** → fruitful question (carries promise)
- **Lagna CSL signifies only no** → barren question (engine flags
  `lagna_csl_self_obstruction` per topic-specific denial set)
- **Lagna CSL neutral** → question structurally weak

A barren Lagna CSL would have stopped traditional KP analysis at Layer 1.
The engine still runs the cascade but flags the barrenness.

### Layer 2 — Primary topic-house CSL

The CSL of the topic's primary house (e.g., H7 for marriage, H10 for career,
H4 for property) is examined. The 4-step UNION significations are matched
against the topic set:

| Layer 2 verdict | Meaning |
|---|---|
| **YES** (clean) | CSL signifies ONLY relevant houses |
| **MIXED** | CSL signifies BOTH relevant AND denial — CONDITIONAL |
| **NO** (clean) | CSL signifies ONLY denial houses |
| **NEUTRAL** | CSL touches neither set |

When Layer 2 is NEUTRAL but Ruling Planets DO signify the topic → engine
emits **PARTIAL** (not UNCLEAR) — the moment carries the promise even
though the primary gate is silent.

### Layer 3 — Ruling Planet confirmation

The 7-slot RP set is intersected with the topic's significators. The result:
**fruitful significators** — planets that are BOTH topic-significators AND
currently ruling. These are the strongest timing triggers KP offers.

### Combined verdict

| All 3 layers signify | Verdict |
|---|---|
| Yes + Yes + ≥2 RPs | **YES, HIGH** |
| Yes + Yes + 1 RP | **YES, MEDIUM** |
| Yes + Yes alone | **YES, LOW** |
| Mixed at Layer 2 | **CONDITIONAL, MEDIUM** |
| Clean No at Layer 2 | **NO, HIGH/MEDIUM** |
| Neutral + RPs speak | **PARTIAL, MEDIUM/LOW** |
| Neutral + RPs silent | **UNCLEAR, LOW** |

---

## 7. KP REJECTION RULES (KSK Reader I rule 4)

KSK gives specific conditions where the horary verdict carries reduced
weight or where the question itself should be re-cast. Engine surfaces
these as clinical flags rather than rejecting the question outright (the
astrologer decides):

### 7.1 Lagna degree outside 5°–25° → §3 above

### 7.2 Primary CSL retrograde

> "The most important house cusp sub lord should not itself be retrograde
> at the time of judgment."

Engine flag: `csl_retrograde` (yellow). KP interpretation: retrograde CSL
indicates delays, revisits, or outcome through a second attempt or
re-negotiation.

### 7.3 Primary CSL in star of retrograde planet — PR H2

> "This sub lord should not occupy a star whose lord is retrograde at the
> time of judgment."

Engine flag: `csl_in_retrograde_star` (yellow). KP interpretation:
even when CSL is direct, if its STAR LORD is retrograde, the event
materializes only AFTER the retrograde planet turns direct — with
obstacles and delay.

### 7.4 Lagna CSL in star of retrograde planet — PR H2

Engine flag: `lagna_csl_in_retrograde_star` (yellow). KP interpretation:
querent's framing of the question itself carries reconsideration energy.
Not a denial signal, just a flavour of the moment — the querent may
revise the question, add conditions, or be of two minds about the outcome.

### 7.5 Retrograde planet results (general KP rule)

- **Natal chart**: retrograde planet is treated as direct for significator purposes
- **HORARY**: retrograde planet does NOT give results UNTIL it turns direct

The engine surfaces retrograde status per planet so astrologer can apply
the stricter horary rule.

---

## 8. STAR-SUB HARMONY LAYERED READING (PR H5, RULE 16)

KSK strict (Reader I, Sub Lord chapter):

> "The Star-Lord indicates the nature of the result. The Sub-Lord is the
> deciding factor — whether the result is favorable or not."

KP is NOT a flat 4-step UNION operation. It's a **TENSION between two
layers**:

- **STAR layer** = CSL's star lord + CSL's own placement (the "what kind
  of matter" reading)
- **SUB layer** = CSL's sub lord (the "is it permitted" reading — the
  deciding gate)

### Five harmony verdicts

| Verdict | Star | Sub | Meaning |
|---|---|---|---|
| **HARMONY (++)** | Relevant | Relevant | STRONGLY PROMISED, smooth |
| **ALIGNED (+)** | Mixed | Relevant | PROMISED, sub permits |
| **TENSION (−)** | Relevant | Denial | BLOCK dominates (sub is deciding gate) |
| **CONTRA (±)** | Denial | Relevant | Fires WITH friction (sub permits despite star tension) |
| **DENIED (−−)** | Denial | Denial | Structurally blocked |

The naive UNION reading hides which layer carries the yes signal. The
Star-Sub split tells the astrologer that even when houses look favourable,
the DECIDING layer (sub) may be carrying denial — flipping the verdict.

---

## 9. PATTERN LIBRARY (PR H4)

Canonical KP patterns from `pattern_library.md` applied to horary verdicts.
Pattern naming distinguishes a deep KSK reading from a generic significator
scan (RULE 19).

### Active patterns in horary engine

| ID | Name | Tone | When it fires |
|---|---|---|---|
| **T1** | Joint Period — all 3 horary layers signify | gold | Lagna CSL + Primary CSL + ≥1 RP all signify topic. Strongest YES signal. |
| **T2** | RP Amplifier | gold | Primary CSL itself is in RPs (or strongest RP signifies topic). Per KSK, 2-3× timing weight. |
| **T3** | Self-significator | gold | Primary CSL in its own nakshatra. Pure, concentrated effects. |
| **D2** | Step 4 Partial Denier | amber | Primary CSL promises but Step 4 (star lord of CSL's sub lord) signifies ONLY denial. Offer-then-withdrawn risk. |

### Deferred (future PRs)

- **T4** Sookshma day-precision firing window — requires native dasha tree
- **M5** AD-lord = supporting-cusp-sub-lord — requires native dasha tree

These fire in PR H9's timing window card (frontend cross of horary RPs ×
native dashas).

---

## 10. MULTI-CUSP SUPPORTING CONFIRMATION

For topics with multiple house gates (e.g., marriage = H7 + H2 + H11),
the engine also checks supporting cusps' CSL signification:

- **H2 supports**: H2 CSL signifies any yes-house
- **H11 supports**: H11 CSL signifies any yes-house

Both supporting → STRONGER promise (per `kp_multi_cusp_confirmation.md`).
One supporting → moderate amplification. Neither → primary CSL stands alone.

Engine adds +5 to numeric confidence for each supporting cusp that fires.

---

## 11. NUMERIC CONFIDENCE 0–100 (PR H3)

Weighting (max 100):

```
Layer 1   Lagna CSL fruitful                       +20
Layer 2   Primary CSL clean YES                    +30
          Mixed yes/no                             +15
          Clean NO (denial)                        −10
Layer 3   RP overlap                               +10 each (cap +30)
Multi-cusp  H2 supports                            +5
            H11 supports                           +5
Penalty   CSL retrograde                           −5
          CSL star lord retrograde                 −5
          Lagna outside 5°–25° window              −10
Clamped to [0, 100].
```

Brings horary into parity with Analysis tab's `engine_confidence` (also
0–100). Full breakdown emitted as `verdict.confidence_breakdown` for the
audit trail.

---

## 12. BHAVAT BHAVAM — RELATIVE-QUESTION DETECTION (PR H7, RULE 13)

When the horary question references a person OTHER than the native, we
cannot apply the native's house list directly — must rotate via Bhavat
Bhavam (house-from-house). The relative's H1 becomes a specific house
in the native's frame, and all topic houses rotate accordingly.

### Mapping

| Relative | Relative's H1 = native's H? |
|---|---|
| Mother | H4 |
| Father | H9 |
| Spouse | H7 |
| Child | H5 |
| Younger sibling | H3 |
| Elder sibling | H11 |
| In-law (general) | H7 (spouse axis) |
| Boss / employer | H10 |

### Worked example — "Will my mother recover from illness?"

- Mother's H1 (body) = native's H4
- Mother's H5 (recovery) = native's H8
- Mother's H11 (fulfilment of recovery) = native's H2
- Mother's H6 (disease persisting) = native's H9 (denial-side)

Engine rotates the topic's yes_houses + no_houses + primary_house through
this offset. Engine flag: `bhavat_bhavam` context surfaced for UI display.

### Accuracy floor

~70% via Bhavat Bhavam from native's chart alone. For higher precision
(~85-90%), use the relative's OWN birth chart in the Analysis tab.

---

## 13. SENSITIVITY TIER ROUTING (PR H8, RULE 52)

Horary questions span the stakes spectrum. Protective framing must shift:

- **Tier 1** (factual): job promotion, education, travel, vehicle, fame
- **Tier 2** (life-impact): marriage, divorce, business, property,
  money_recovery, litigation, mental_health, foreign_settle, addiction
- **Tier 3** (life-or-death): longevity, suicide_risk, hospitalization,
  child_illness, congenital_conditions, missing_person, criminal_case

### Auto-escalators

If question contains ANY of these keywords, escalate to Tier 3 regardless
of topic: survive, terminal, dying, cancer, suicide, kill myself, jail,
ICU, coma, ventilator, life support, born with, congenital, bankruptcy,
metastasis, etc.

### Crisis resources for Tier 3 mental-health / suicide

Engine surfaces resource list:
- India: iCall (TISS) +91-9152987821 (Mon–Sat 8 AM – 10 PM IST)
- India: Vandrevala Foundation 1860-2662-345 / +91-9999666555 (24/7)
- India: NIMHANS +91-80-46110007 (24/7)
- USA: 988 Suicide & Crisis Lifeline (24/7)

---

## 14. TIMING WINDOW SYNTHESIS (PR H9)

The verdict says "YES, 78/100" — astrologer's immediate next question is
"WHEN?" The engine + frontend synthesize a fire window by joining:

1. **Horary RPs that signify topic** (`rp_signifying_yes`)
2. **Native's Vimshottari dasha tree** (PADs within current AD)

Algorithm:
1. Scan upcoming PADs — find first whose lord is in `rp_signifying_yes`.
   That PAD's start→end is the primary fire window.
2. If no PAD lord matches, fall through to upcoming ADs.
3. If no upcoming period matches, show "Watch for [planet] dasha" as
   graceful fallback.

This is Pattern T1 (joint period) + T2 (RP amplifier) synthesized into
a single date range.

---

## 15. ASTROLOGER NOTES + AUDIT TRAIL (PR H10)

The horary tab surfaces three audit-trail tools so the astrologer can
either trust or verify the verdict:

1. **Full reasoning trace** (collapsible) — 6-section engine printout:
   topic resolution, CSL chain, Star-Sub harmony, RPs, patterns fired,
   confidence breakdown.

2. **Astrologer notes** (copy-paste ready) — 12-line summary suitable for
   the astrologer's case file. One-click Copy with checkmark feedback.

3. **Export JSON** — downloads full horary response as
   `horary_<number>_<topic>.json` for archival or external KP software
   cross-check.

---

## 16. TWIN-CHART / IDENTICAL-MOMENT PROBLEM (KP solution)

Traditional astrology produces identical charts for twins born within
~13 minutes. KP's Cuspal Sub-Lord changes every ~2-15 minutes of clock
time depending on which sub-division the cusp falls in. This means even
a small birth-time difference produces COMPLETELY DIFFERENT KP verdicts.

The engine is inherently aligned with this KP solution — no special
twin-chart handling needed. The 2-minute precision floor is the doctrine.

---

## 17. ENGINE EMISSION SUMMARY (developer reference)

Complete `analyze_horary()` response shape:

```python
{
  "prashna_number": 1-249,
  "question": str,
  "topic": str (user-supplied),
  "resolved_topic": str (canonical),
  "topic_was_aliased": bool,
  "chart_time": "YYYY-MM-DD HH:MM UTC",
  "lagna": {longitude, sign, degree_in_sign, nakshatra, star_lord, sub_lord, sub_entry},
  "lagna_validity": {state, degree_in_sign, in_window, doctrine},  # PR H1
  "ruling_planets": [...],
  "rp_context": {7-slot details + strongest},
  "moon_analysis": {...},
  "verdict": {
    "verdict": YES/NO/CONDITIONAL/PARTIAL/UNCLEAR,
    "confidence": HIGH/MEDIUM/LOW,
    "confidence_score": 0-100,                # PR H3
    "confidence_breakdown": [...],            # PR H3
    "explanation": str,
    "lagna_csl", "query_csl", ...,
    "yes_houses", "no_houses",
    "yes_houses_activated", "no_houses_activated",
    "star_sub_harmony": {...},                 # PR H5
    "ruling_planets", "rp_signifying_yes",
    ...
  },
  "topic_houses": {yes, no},
  "primary_house": int,
  "primary_house_significators": [...],
  "clinical_flags": [...],                     # PR A1.1d + H1 + H2
  "patterns_fired": [...],                     # PR H4
  "bhavat_bhavam": {...} | null,               # PR H7
  "sensitivity": {tier, escalators, ...},      # PR H8
  "planets": [...],
  "cusps": [...],
  "house_themes": {...}
}
```

---

## 18. KEY SOURCES

- KSK KP Readers I-VI on [archive.org/details/kp-readers](https://archive.org/details/kp-readers)
- [JyotishPortal canonical 249 table](https://jyotishportal.com/KPResource/KP1-249.aspx)
- [KP Horary method (Astrologer Sidharth)](https://theastrologyonline.com/horary/)
- [Why KP Horary fails (JASA)](https://astrojasa.blogspot.com/2012/04/why-does-kp-horary-fails-when-all-rules.html) — KSK Reader I rules 3/4/5
- [Twin births (Gautam Crystals)](https://www.gautamcrystals.com/post/how-can-twins-live-different-lives-kp-astrology-has-the-answer) — CSL precision
- [Ruling Planets in KP (AjmerAstro)](https://www.ajmerastro.com/en/blog/ruling-planets-in-kp-astrology) — 7-slot system

---

*Doc created PR H12 (2026-05-24). Consolidates KP horary canonical
doctrine across the 12 horary improvements H1-H12. Cross-links to
`pattern_library.md`, `kp_csl_theory.txt`, `kp_ruling_planets_deep.md`,
`bhavat_bhavam.md`, `sensitivity_tiers.md`, and `kp_multi_cusp_confirmation.md`.*

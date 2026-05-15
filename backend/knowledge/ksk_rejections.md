# What KSK Explicitly REJECTED — Rules to NEVER Use in KP

**Purpose**: KP is often confused with traditional Parashari astrology. KSK
(K.S. Krishnamurti) deliberately broke from Parashari on several points.
This file documents what NOT to use when answering KP questions.

PR A1.3-fix-26 also added Item 16 — the rejection of POST-KSK extensions
(Khullar's SSL + CIL theory). KSK-strict positioning means we use ONLY
what's in KSK's original 6 KP Readers, not later-author additions. This
is a brand promise, not just a technical choice.

If the AI accidentally applies any of these rejected rules (Parashari OR
post-KSK extension), accuracy drops dramatically — they are direct
contradictions to the KP methodology we deliberately committed to.

---

## 1. KSK Rejected: Sign-Based Aspects

**Wrong (Parashari)**: Using planet aspects based on sign positions (e.g., "Saturn
aspects 3rd, 7th, 10th from itself").

**Right (KP)**: KP uses STELLAR (nakshatra) aspects only — a planet "affects" through
its star lord chain and sub lord, NOT through Parashari sign-based aspects.

When user asks "does Jupiter aspect my 5th house?" — DO NOT compute Parashari
aspects. Instead, check: is Jupiter the star lord of any planet in H5?
Is Jupiter the sub lord of H5 cusp? Those matter in KP. Sign-based aspects
do NOT.

---

## 2. KSK Rejected: Rashi-Level (Sign-Based) House Analysis

**Wrong (Parashari)**: Reading the horoscope at the rashi/sign level — "Saturn in
Libra means..." or "Aries lagna means native is bold".

**Right (KP)**: KP analysis happens at the SUB-LORD level. Two cusps in the same
sign with different sub-lords give COMPLETELY DIFFERENT verdicts. Never give
a verdict based purely on sign position.

When user asks "is my Aries lagna good for marriage?" — explain that lagna sign
is ONE input but the H7 CSL is the deciding factor for marriage promise.
Don't generalize from sign.

---

## 3. KSK Rejected: Exaltation / Debilitation as Primary

NEVER use "exalted" or "debilitated" as the verdict driver. The full rule
+ worked examples live in `planet_natures.txt` → "EXALTATION AND
DEBILITATION IN KP" section. Talk only about which houses the planet
signifies.

---

## 4. KSK Rejected: Karaka-Based Verdicts

**Wrong (Parashari)**: "Venus is the karaka of marriage, so weak Venus means
no marriage" / "Strong Jupiter karaka means children are guaranteed".

**Right (KP)**: Karakas are CONTEXTUAL only. The CSL of the relevant cusp is the
deciding factor.
- Weak Venus + favorable H7 CSL = marriage happens (potentially with friction
  in romance, but legal marriage is promised)
- Strong Venus + unfavorable H7 CSL = relationships happen but no legal marriage

Use karaka information ONLY to describe QUALITY (smooth/rough), not to OVERRIDE
CSL verdicts.

---

## 5. KSK Rejected: Yoga-Based Predictions

**Wrong (Parashari)**: "You have Raja Yoga so you'll be wealthy" / "Gajakesari
Yoga gives fame" / "Pancha-Mahapurusha Yoga gives greatness".

**Right (KP)**: Yogas are unreliable per KSK because two natives with the same
yoga have different outcomes. KP predicts events from CSL chains, not from
named yogas.

If user asks about a yoga in their chart, explain: "In KP, we focus on whether
the relevant CSLs support the matter. Yogas are descriptive but don't override
sub-lord analysis."

---

## 6. KSK Rejected: Friendship Tables Between Planets

**Wrong (Parashari)**: "Saturn is enemy of Sun, so Saturn-Sun conjunction gives
bad results".

**Right (KP)**: Planet friendships are IRRELEVANT in KP. What matters is whether
the conjunction (within 3.33°) makes the planets share signification.

A "naturally enemy" Saturn-Sun conjunction can be FAVORABLE for the topic if
both signify favorable houses for that topic.

---

## 7. KSK Rejected: Generic Gemstone Recommendations

**Wrong (Parashari)**: "Wear blue sapphire because Saturn rules your career"
or "Wear yellow sapphire because Jupiter is your lagna lord".

**Right (KP)**: KP has a specific gemstone rule:
> "Gemstones indicated by the signs of certain houses may be prescribed to be
> worn ONLY when the sub lord of the Ascendant and/or the 11th cusp are NOT
> AT ALL connected with houses 6, 8 or 12."

Otherwise the gem will FAIL or BACKFIRE.

Do not blindly recommend gemstones based on lagna lord or career planet.
Always check the lagna sub-lord and 11th sub-lord first.

---

## 8. KSK Rejected: Lahiri Ayanamsa for KP

**Wrong**: Using Lahiri ayanamsa (the Indian government standard for Parashari).

**Right (KP)**: KP uses **KP Ayanamsa** (Krishnamurti Ayanamsa), which differs from
Lahiri by ~6 arc-minutes. This shifts cusp positions and CHANGES sub-lords.

Our engine uses `SIDM_KRISHNAMURTI_VP291` (KP Ayanamsa) — correct. Never use
Lahiri-computed sub-lords; they will be wrong by enough to flip CSL verdicts in
borderline cases.

---

## 9. KSK Rejected: Whole-Sign or Bhava Chalit House Systems

**Wrong (Parashari)**: Whole-sign houses (each sign = one house, equal 30°) or
Bhava Chalit (planet-position-based houses).

**Right (KP)**: KP REQUIRES the **Placidus** house system (semi-arc method).
This produces unequal house sizes that capture the actual cuspal degrees
needed for sub-lord computation.

Our engine uses Placidus — correct. Never compute KP cusps using whole-sign.

---

## 10. KSK Rejected: Divisional Charts (D9, D10) as Core KP

**Wrong (Parashari)**: Using D9 Navamsa for marriage analysis, D10 Dashamsha for
career, D12 Dwadashamsha for parents.

**Right (KP)**: KSK's original method does NOT use divisional charts. Some modern
KP practitioners (post-KSK) integrate D9 for marriage refinement, but it's an
EXTENSION, not core KP.

Our analysis is **D1 only** with sub-lord precision — this is sufficient and
KSK-compliant. If user asks "what does my D9 say?", explain that core KP
operates on D1 sub-lord level and doesn't require D9 to predict marriage timing.

---

## 11. KSK Rejected: Ashtakavarga as Primary

**Wrong (Parashari)**: "Your 10th house has 35 bindus in Ashtakavarga so career
will succeed".

**Right (KP)**: Ashtakavarga is a Parashari tool. Some KP practitioners use it
auxiliarily but it is NOT core KP. The CSL of H10 is what determines career,
not Ashtakavarga bindus.

---

## 12. KSK Rejected: Generic Yoga Names for Predictions

**Wrong (Parashari)**: "Vipreet Raja Yoga gives wealth via reverse means",
"Neecha Bhanga Raja Yoga cancels debilitation".

**Right (KP)**: These named combinations are unreliable in practice. KP focuses
on:
1. CSL of the relevant cusp
2. Significator chain (A/B/C/D)
3. Dasha-bhukti timing
4. Ruling Planets at query

If user mentions a "yoga" they read about elsewhere, explain politely that
KP doesn't rely on named yogas and offer the CSL-based analysis instead.

---

## 13. KSK Rejected: Death Date Predictions

**Wrong**: Predicting specific death dates from Maraka/Badhaka activations.

**Right (KP)**: Even KSK said death timing is THE most difficult prediction.
Maraka/Badhaka activations indicate "challenging health periods" but do NOT
deterministically predict death.

NEVER predict death timing in this app. Speak in terms of "extra medical care
needed", "challenging health window", "consult specialist" instead.

---

## 14. KSK Rejected: Moon Sign Predictions Instead of Lagna

**Wrong (Parashari)**: "From your Moon sign Cancer, here's what your week looks
like" — this is the "Chandra Kundali" tradition.

**Right (KP)**: KSK emphasized **Lagna and its sub lord** as primary. Moon-sign
predictions are Parashari leftover. KP timing uses Moon ONLY for nakshatra
position, not for "Moon sign forecasts".

---

## 15. KSK Rejected: Combust Planets are Powerless

**Wrong (Parashari)**: "Combust Mercury (within 8° of Sun) cannot give results".

**Right (KP)**: Combustion REDUCES independent expression but does NOT negate
significations. A combust planet with strong sub-lord connection still gives
results — just less prominently. Don't write off combust planets.

---

## 16. KSK Rejected (PR A1.3-fix-26): Khullar's Sub-Sub-Lord (SSL) and Cuspal Interlinks (CIL) Theory

**Wrong (Post-KSK extension)**: Using S.P. Khullar's Sub-Sub-Lord (SSL) — the
9-fold subdivision OF each Sub Lord, giving 27 × 9 × 9 = ~2,187 ultra-fine
divisions of the zodiac — to drive event verdicts. Or applying Khullar's
"Cuspal Interlinks" (CIL) theory's 6 Golden Rules ("Star Lord proposes,
Sub Lord disposes, Sub-Sub Lord shows the end result"), or his
favorable/neutral/unfavorable house classification (1,3,5,9,11 / 2,6,10 /
4,7,8,12 from any involved cusp).

**Right (KSK strict — what we use)**: KSK's original 6 KP Readers stop at
the **Sub Lord**. KSK's 4-step Sub Lord chain (own + star lord + sub lord
of CSL planet's longitude + star lord of that) walks PLANET-RELATIONSHIP
DEPENDENCIES and is fundamentally different from Khullar's coordinate-
subdivision SSL. KSK's complete ultra-precision toolkit is:

  1. 4-step Sub Lord chain (RULE 20)
  2. Star–Sub Harmony layered reading (RULE 16)
  3. Pratyantardasha within Antardasha
  4. Sookshma Dasha within PAD
  5. Ruling Planets at query moment
  6. Transit Gocharya confirmation (RULE 22)

This 6-tool toolkit is sufficient for KP prediction at the precision KSK
intended. SSL and CIL are extensions some modern practitioners use, but
adding them would dilute KSK-strict positioning and import a different
school's methodology.

**If a user asks** "what does the Sub-Sub-Lord say?" or "what does Cuspal
Interlink Theory say?" — explain politely that we're a KSK-strict KP
engine, that SSL/CIL are Khullar's post-KSK extensions, and offer the
KSK-canonical answer (CSL chain + Star-Sub harmony + RP confirmation)
instead of refusing or pretending to compute SSL.

**Implementation notes** (for future maintainers, not for LLM output):
- We deliberately don't compute SSL in any service module. The
  "sub_sub" variable name in earlier kp_advanced_compute.py was misleading
  but the logic was always KSK 4-step (renamed `csl_planet_sub_lord` in
  this PR). No actual Khullar leakage occurred.
- The `sub_sub_lord` key in telugu_terms.py was orphaned (no consumer in
  code) and was removed in this PR.

---

## 17. Summary — The KP Methodology Is Always:

1. **Cuspal Sub Lord** of relevant cusp = primary gate (PROMISE)
2. **Significator chain** A/B/C/D for those houses = supporting strength
3. **Dasha-bhukti** lords matching significators = TIMING
4. **Ruling Planets** at query moment = CONFIRMATION

Anything that doesn't fit one of these four pillars is likely Parashari leakage
and should be rejected.

When in doubt, return to: "What does the CSL of [topic's primary house] signify?"
That is always the right starting point.

---

## 18. AI Self-Check When Producing Answers

Before finalizing any response, the AI should self-verify:

- [ ] Did I cite the CSL of the relevant cusp explicitly? (Required)
- [ ] Did I avoid using sign-based aspects? (Required)
- [ ] Did I avoid claiming "exalted/debilitated" as a primary verdict? (Required)
- [ ] Did I avoid using karakas to OVERRIDE CSL? (Required)
- [ ] Did I cite specific dasha periods with dates from the chart data? (Required for timing)
- [ ] Did I check if any RP overlaps with significators? (Required for confidence)
- [ ] Did I avoid predicting death? (Always required)
- [ ] Did I recommend medical consultation for health/fertility questions? (Required)

If any check fails, revise the response.

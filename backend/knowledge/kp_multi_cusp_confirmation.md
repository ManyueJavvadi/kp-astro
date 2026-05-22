# KP Multi-Cusp Confirmation — Strengthening Verdicts via Supporting-Cusp Agreement

**Source**: KSK-strict, derived from KSK's foundational rule (KP Reader I, II, IV)
that "the Cuspal Sub Lord of the primary house must signify the house group for
the matter to fructify." This file makes EXPLICIT what KSK left implicit: the
predictive strength of an event scales with how many of the SUPPORTING cusps'
sub-lords ALSO signify the same house group.

**Why it matters**: A 20-year-experienced KP astrologer rarely gives a verdict
based on a single CSL alone. They CROSS-CHECK by looking at the supporting
cusps. When 3 of 3 (or 2 of 3) related CSLs all point to the same matter, the
prediction is far more reliable than when only the primary CSL agrees and the
supporting ones disagree. This file gives the AI explicit guidance to perform
that cross-check.

**Important**: This is NOT Khullar's "Cuspal Interlinks" theory (which is
post-KSK and rejected per `ksk_rejections.md` item 16). This is KSK's own
multi-house framework applied with discipline.

---

## 1. The Foundational KSK Rule (Reader I, II)

**Verbatim** (paraphrased from KSK Reader II Fundamental Principles):

> "If the sublord of primary house under consideration is signifying the
> house group related to the matter, the matter is going to fructify and
> the answer is positive. If it is signifying detrimental houses alone,
> the matter will not fructify. If it is signifying both relevant and
> detrimental houses, the native will get both results in different
> dasha periods."

KSK uses **one primary CSL** as the GATE. Promise/Denial/Conditional verdict
flows from that one CSL alone.

**What KSK leaves implicit**: when the SUPPORTING cusps' sub-lords ALSO
signify the same house group, that's a SECOND, THIRD, FOURTH layer of
confirmation. A 20-year astrologer reads all of them.

---

## 2. House Groups (KSK canon — refer to general.txt §3 for full table)

For multi-cusp confirmation, you need to know WHICH houses constitute the
"house group" for an event AND WHICH cusps to cross-check. Here's the canonical
KSK structure:

| Event | Primary cusp | Supporting cusps to ALSO check |
|---|---|---|
| Marriage | H7 | H2 (family), H11 (gain of relationship) |
| Career — Service | H10 | H6 (service), H2 (income from work), H11 (gain) |
| Career — Business | H10 | H7 (clients/partnership), H2, H11 |
| Children | H5 | H2 (family expansion), H11 (gain) |
| Property purchase | H4 | H11 (gain), H12 (outflow = acquisition) |
| Foreign travel | H12 | H3 (short journey), H9 (long journey) |
| Foreign settlement | H12 | H3, H9 (must include all three) |
| Higher education | H9 | H4 (formal study basis), H11 (gain/completion) |
| Health/recovery | H1 | H5 (improvement), H11 (gain of strength) |
| Disease | H6 | involved organ-house |
| Surgery | H8 | H2 (life force), H11 (gain through procedure) |
| Wealth/finance | H2 | H6 (debt repayment), H11 (gain) |
| Litigation — filing | H3 | H6 (dispute), H11 |
| Litigation — winning | H6 | H1 (self), H11 |
| Spiritual progress | H9 | H6 (sadhana effort), H11 |

For full event coverage see `house_combinations_canonical.md`.

---

## 3. The Multi-Cusp Confirmation Tiers

**TIER 1 — Single Primary CSL (KSK minimum)**:
Primary cusp's CSL signifies the relevant house group → event PROMISED.
This is KSK's foundational test. Sufficient to give a verdict.

**TIER 2 — Primary + One Supporting CSL agree (STRONGER)**:
Primary cusp's CSL AND ONE supporting cusp's CSL both signify the same
relevant house group → event STRONGLY PROMISED.
Example: Marriage — H7 CSL signifies {2, 7, 11} AND H2 CSL also signifies
{2, 7, 11} → marriage is doubly confirmed (the family-house gate ALSO opens).

**TIER 3 — Primary + Two Supporting CSLs agree (NEAR-CERTAIN in right dasha)**:
Primary + both supporting cusps' CSLs all signify the relevant house group →
event is NEAR-CERTAIN; the only question is timing.
Example: Children — H5 CSL signifies {2, 5, 11} AND H2 CSL signifies them
AND H11 CSL signifies them → progeny is structurally nearly guaranteed.
Timing then becomes the only variable.

**TIER 0 — Disagreement (DOWNGRADE confidence)**:
Primary CSL signifies the matter but supporting CSLs DON'T (they signify
denial houses) → CONDITIONAL with friction. Event may fire but with
significant struggle. Apply KSK strict bhukti rule (RULE 11).

**TIER -1 — Primary CSL doesn't signify but supporting CSLs do (RARE)**:
Primary CSL fails the basic KSK test, but H2 + H11 CSLs both signify
relevant houses. Verdict: NOT PROMISED in the conventional sense.
Effects of supporting houses (e.g., gain through relationship without legal
marriage, or financial benefit without traditional career) may manifest.

---

## 4. How to State Multi-Cusp Confirmation in Output

When the AI delivers a verdict, it should:

1. State the **primary CSL verdict** first (TIER 1 — KSK minimum).
2. Cross-check **each supporting cusp's CSL** and state whether it agrees,
   partially agrees, or disagrees.
3. Assign the **TIER label** (1 / 2 / 3 / 0 / -1).
4. Translate TIER to confidence:
   - TIER 3 → confidence 80-95% (event near-certain in right dasha)
   - TIER 2 → confidence 65-80% (strong promise)
   - TIER 1 → confidence 50-65% (KSK promise, but supporting cusps not double-confirming)
   - TIER 0 → confidence 35-50% (CONDITIONAL with friction)
   - TIER -1 → confidence below 35% (effects of supporting houses without primary fruition)

The TIER label should appear in the **DIRECT VERDICT section** alongside
the PROMISED/CONDITIONAL/DENIED verdict. Example output sentence:

> "**TIER 3 STRONGLY PROMISED** — H7 CSL Venus signifies {2, 7, 11},
> H2 CSL Mercury also signifies {2, 7, 11}, and H11 CSL Jupiter signifies
> {2, 7, 11}. All three marriage-related CSLs agree. Confidence 87/100.
> The only variable is when the right dasha-bhukti opens the window."

---

## 5. When Multi-Cusp Confirmation REVEALS Hidden Issues

The cross-check often catches things the single-CSL read misses:

**Example A — H7 alone says yes, H2 says no**:
H7 CSL = Venus → signifies {2, 7, 11} → primary verdict: marriage promised.
H2 CSL = Saturn → signifies {6, 8, 12} → family/wealth gate signifies
denial houses for marriage.
Translation: legal marriage may happen but the FAMILY support (parental
acceptance, dowry, kinship structure) is structurally weak. Predict:
inter-religious or against-family-wishes match likely; kinship friction
expected even if marriage occurs.

**Example B — H10 strong, H6 weak (career)**:
H10 CSL signifies {2, 6, 10, 11} → career promised.
H6 CSL signifies {3, 8, 12} → service/employment-gate weak.
Translation: career success will come via SELF-EMPLOYMENT or BUSINESS, not
via traditional employment/service. The H6 gate (which carries the
"employer-relationship" thread) does not open cleanly.

**Example C — H5 strong, H2 weak (children)**:
H5 CSL signifies {2, 5, 11} → children promised.
H2 CSL signifies {6, 8, 12} → family-house carries denial.
Translation: children will come, but family-line continuation is
weakened. Possibilities: child raised away from extended family,
adoption, or single-parent path. The H5 thread fires but the H2
"extension of lineage" reading is muted.

These fine-grained predictions are EXACTLY what a 20-year-experienced
KSK astrologer pulls out, and what a single-CSL reading would miss.

---

## 6. What to AVOID (Anti-Patterns)

1. **Don't conflate "supporting cusp" with "primary cusp"**.
   H2 is a SUPPORTING cusp for marriage — the primary is H7. If H2 CSL
   signifies marriage houses but H7 CSL doesn't, marriage is NOT promised
   in the conventional sense. (Effects of H2 — e.g., financial support
   from family — may manifest, but marriage as an event needs H7 gate.)

2. **Don't substitute multi-cusp confirmation for the basic KSK promise test**.
   The primary CSL gate is the FOUNDATION. Supporting cusps add or remove
   confidence on top — they don't replace the primary gate.

3. **Don't claim "TIER 3" without explicitly stating which 3 CSLs agree**.
   The output must NAME the planet that is each CSL and which houses it
   signifies. "I think marriage is strongly promised" without the cuspal
   evidence is a fail. Cite all three.

4. **Don't expand the house group to include marginally relevant houses**
   to artificially boost the tier. If the topic's house group is {2, 7, 11},
   stick to those three. Don't sneak in H5 (romance) or H4 (home) just to
   say "more houses agree" — that's not KSK rigor.

5. **For DENIAL verdicts, also cross-check supporting cusps**.
   If H7 CSL signifies only {1, 6, 12}, that's denial-leaning at primary.
   Cross-check H2 + H11 CSLs. If they ALL signify denial houses → strongly
   denied (TIER 3 in the denial direction). If they signify mixed/relevant
   → CONDITIONAL with possibility through atypical means (companion
   without legal marriage, etc.).

---

## 7. Pitfalls Specific to Multi-Cusp Confirmation

**Pitfall 1: Overcounting via shared planets**.
If the same planet (e.g., Jupiter) is the CSL of multiple cusps, you have
ONE source of signification, not multiple. Don't claim "all 3 CSLs agree"
when actually one planet rules all 3 sub-lord positions. State explicitly:
"H7 CSL Jupiter and H11 CSL Jupiter (same planet — counts as one
confirmation source, not two)."

**Pitfall 2: Ignoring KSK strict bhukti rule when CONDITIONAL**.
TIER 0 (primary signifies but supporting disagree) is a CONDITIONAL chart.
Per RULE 11 (KSK strict bhukti rule), the bhukti where the SUPPORTING-cusp
sub lord activates determines whether the event fires or is blocked in
that period. Multi-cusp confirmation FEEDS INTO RULE 11; it doesn't
override it.

**Pitfall 3: Forgetting that supporting cusps are TOPIC-SPECIFIC**.
The supporting cusps for marriage (H2, H11) are different from supporting
cusps for career (H6, H2, H11) which are different from supporting cusps
for children (H2, H11). Always look up the topic's house group from
KSK canon (general.txt §3 or `house_combinations_canonical.md`) before
running multi-cusp confirmation.

---

## 8. Integration With Existing Rules

This file deepens (does NOT replace) these existing rules:
- RULE 5 — 5-tier promise verdict scale (now refined by TIER 0/1/2/3 above)
- RULE 11 — KSK strict bhukti rule (multi-cusp confirmation feeds the
  CONDITIONAL/TIER 0 path)
- RULE 16 — Star-Sub Harmony (apply on EACH CSL when doing multi-cusp
  cross-check; don't skip the harmony layer just because you're checking
  multiple cusps)
- RULE 18 — engine compute output (the engine should expose the CSL of
  EVERY cusp, not just the primary; multi-cusp confirmation depends on it)
- RULE 20 — 4-step Sub Lord chain (run on EACH CSL being cross-checked)

---

## 9. Quick Reference Card

**For every astrologer-mode verdict, perform this checklist**:

1. Identify primary cusp + supporting cusps from house group table.
2. Read CSL of EACH cusp.
3. For EACH CSL, run 4-step chain → get its full signification set.
4. Run Star-Sub Harmony on EACH CSL.
5. Count how many CSLs signify the relevant house group.
6. Assign TIER (3 / 2 / 1 / 0 / -1).
7. Translate TIER to confidence percentage.
8. State TIER + supporting evidence in the DIRECT VERDICT section.

Not optional. Even when the primary CSL alone gives a clear verdict,
performing the cross-check catches hidden friction or hidden strength
that single-cusp reading misses.

This is the difference between a textbook KP read and a 20-year-experienced
KP astrologer's read.


---

## 10. EXTENDED HOUSE-GROUP TABLE — ALL CANONICAL TOPICS (pre-test-cleanup)

Beyond the foundational career + marriage examples in §1-9, the
multi-cusp confirmation framework extends to every canonical topic in
TOPIC_HOUSE_MAP_CANONICAL. Use this extended table to apply TIER 0-3
multi-cusp confirmation across the full domain spectrum.

### Career / Business / Wealth cluster

| Topic | Primary | Supporting cusps | Denial set | Notes |
|---|---|---|---|---|
| `job` | H10 | H6, H2, H11 | 1, 5, 9, 12 | KSK strict: H10 + H6 (service house critical) |
| `business` | H10 | H7, H2, H11 | 1, 6, 9, 12 | H10 NOT H7 primary (KSK doctrine; H7 = partners/public) |
| `wealth` | H2 | H6, H11 | 1, 8, 12 | KSK STRICT — wealth is 2/6/11 NOT 2/6/10/11 |
| `money_recovery` | H6 | H2, H11 | 1, 5, 8, 12 | H6 sub lord MUST exclude Saturn for clean recovery |
| `salary_growth` | H2 | H10, H11 | 1, 8, 12 | Distinct from promotion (H6+H10+H11) |
| `loan` | H6 | H2, H11 | 1, 5, 9, 12 | H6 sub lord NOT retrograde for approval |

### Education cluster

| Topic | Primary | Supporting | Denial | Notes |
|---|---|---|---|---|
| `education` | H4 | H9, H11 | 3, 8, 10, 12 | Default school-level |
| `education_higher` | H9 | H4, H11 | 3, 8, 10, 12 | College/PhD — H9 primary |

### Marriage / Family cluster

| Topic | Primary | Supporting | Denial | Notes |
|---|---|---|---|---|
| `marriage` | H7 | H2, H11 | 1, 6, 10, 12 | KSK Rule 2 verbatim — foundational doctrine |
| `divorce` | H6 | H10, H12 | 2, 7, 11 | Reconciliation = denial of divorce |
| `second_marriage` | H2 | H9, H11 | 6, 8, 12 | H9 primary gate (= 3rd from H7); H2 = 8th-from-H7 |
| `in_laws` | H7 | H2, H11 | 1, 6, 10, 12 | Bhavat Bhavam: mother-in-law = H10 |
| `children` | H5 | H2, H11 | 1, 4, 7, 10 | KSK strict — H7 in denial set |
| `pregnancy_complications` | H5 | H11 | 1, 4, 8, 12 | H8 affliction = C-section / high-risk |
| `adoption` | H5 | H2, H9, H11 | 1, 4, 7, 10 | H5 doesn't distinguish biological vs adopted |
| `blended_family` | H5 | H2, H11 | 6, 7, 12 | Step-child = dual-house (H5 + H11 via Bhavat Bhavam) |

### Health cluster

| Topic | Primary | Supporting | Denial | Notes |
|---|---|---|---|---|
| `health` | H1 | H5, H11 | 6, 8, 12 | WELLNESS framing (recovery) |
| `disease_risk` | H6 | H8, H12 | 1, 5, 11 | DISEASE framing (will I fall ill?) |
| `child_illness` | H5 | H2, H11 | 1, 4, 7, 10 | Read child via parent's H5 (Bhavat Bhavam, ~70% conf) |
| `congenital_conditions` | H5 | H8, H12 | 1, 4, 9, 11 | Diagnostic-confirmatory, not diagnostic-primary |
| `mental_health` | H1 | H4, H5, H9 | 6, 8, 12 | Moon + Mercury condition critical |
| `suicide_risk` | H8 | H6, H12 | 1, 5, 9, 11 | TIER 3 ABSOLUTE — never tell client this signature |
| `addiction` | H12 | H6, H8 | 1, 5, 9, 11 | Rahu primary planet, Jupiter as antidote |
| `longevity` | H1 | H5, H9, H10 | 2, 7, 12 | Maraka + Badhaka (Badhaka MORE harmful than Maraka) |

### Property / Foreign / Vehicle cluster

| Topic | Primary | Supporting | Denial | Notes |
|---|---|---|---|---|
| `property` | H4 | H11, H12 | 3, 5, 6, 8 | KSK — H4 primary, H11 gain, H12 investment outflow |
| `foreign_travel` | H9 | H3, H12 | 2, 4, 11 | H9 primary for short journeys |
| `foreign_settle` | H12 | H3, H9 | 2, 4, 11 | H12 primary for long-term settlement |
| `visa` | H12 | H3, H9, H11 | 2, 4, 7 | Different visa types emphasize different houses |
| `pilgrimage` | H9 | H5, H12 | 2, 7, 11 | Distinct from spirituality (own canonical topic) |

### Litigation cluster

| Topic | Primary | Supporting | Denial | Notes |
|---|---|---|---|---|
| `litigation` | H6 | H11 | 7, 8, 12 | WIN framing |
| `litigation_loss` | H7 | H8, H12 | 6, 11 | Reverse framing — used rarely |

### Public-eye cluster

| Topic | Primary | Supporting | Denial | Notes |
|---|---|---|---|---|
| `fame` | H10 | H1, H5, H11 | 6, 8, 12 | Sun + Jupiter karakas; Saturn distinguishes sustained vs flash |
| `politics` | H10 | H7, H11 | 6, 8, 12 | H7 = public/opponents in democratic contest |
| `sports` | H5 | H6, H11 | 8, 12 | Mars + Sun karakas; H6 = competition |

### Other / niche cluster

| Topic | Primary | Supporting | Denial | Notes |
|---|---|---|---|---|
| `spirituality` | H9 | H8, H12 | 2, 3, 11 | Jupiter + Ketu karakas |
| `occult` | H8 | H9, H12 | 1, 5, 11 | TIER 2-3 sensitive — never confirm 'cursed' verdict |
| `missing_person` | H12 | H3, H9 | 1, 4, 11 | Prashna context — chart cast at question moment |
| `personality` | H1 | H5, H9 | 6, 8, 12 | H1 + Moon condition primary |
| `father` | H9 | H10 | 3, 4 | Sun karaka |
| `mother` | H4 | H10 | 3, 9 | Moon karaka |
| `siblings` | H3 | H11 | 9, 12 | Mars + Mercury karakas |

### Decision (META-topic)

| Topic | Primary | Supporting | Denial | Notes |
|---|---|---|---|---|
| `decision` | H1 | H5, H9, H10, H11 | 6, 8, 12 | Routes THROUGH underlying domain KBs |


---

## 11. TIER CONFIDENCE BANDS BY TOPIC FAMILY

The TIER 0-3 confidence framework (§4-7) maps differently across topic
families. Apply these calibrations:

### Tier 1 topics (factual — career promotion, salary, education,
travel, vehicle, fame): TIER 0-3 maps directly to engine confidence
   - TIER 3: 80-95% — high confidence multi-cusp confirmation
   - TIER 2: 65-80% — clean primary + ALIGNED harmony
   - TIER 1: 50-65% — CONTRA on supporting cusps
   - TIER 0: 30-50% — friction at primary
   - TIER -1: <30% — denial pattern

### Tier 2 topics (life-impact — marriage, business, wealth,
divorce, money recovery): same TIER bands but apply RULE 44
(capability vs manifestation) framing — the verdict is structural
+ timing-dependent, not absolute.

### Tier 3 ABSOLUTE topics (longevity, suicide_risk, child_illness,
criminal_case): TIER bands inform STRUCTURAL READING but NEVER
become death-date prediction. RULE 15 always governs.

For longevity specifically:
   - TIER 3 longevity-supportive = Poornyash bracket
   - TIER 2 longevity-supportive = Madhyayasha bracket
   - TIER 1 longevity-supportive = Madhyayasha-vulnerable bracket
   - TIER 0 longevity-supportive = Alpayash structural propensity
   - TIER -1 = strong structural vulnerability — apply Tier 3
     framing with maximum care

### Compound questions (multiple topics simultaneously)

When a question is compound, each axis has its own TIER. The OVERALL
output reflects the LOWEST TIER axis's protective framing (most
conservative governs) while still articulating all axes.

Cross-link to `compound_topics.md` §2 (decomposition protocol).


---

## 12. CROSS-LINKS TO TOPIC-SPECIFIC KB

Each topic-specific KB file contains its own multi-cusp examples + KSK
strict bhukti rule applications:

- Career: `job.txt` §2-3 (H10 + H6 confirmation)
- Business: `business.txt` §1-3 (H10 + H7 + H2 + H11)
- Marriage: `marriage.txt` §2-4 (H7 + H2 + H11 trinity)
- Children: `children_detailed.md` §4 (H5 + H2 + H11)
- Health: `health.txt` §7 (H1 + H6 + H8 + H12 multi-cusp analysis steps)
- Longevity: `longevity.md` §2 (Alpayash/Madhyayasha/Poornyash brackets)
- Wealth: `wealth.txt` (H2 + H6 + H11 trinity — KSK strict)
- Litigation: `litigation.txt` §4 (H6 + H1 + H11 win signature)
- Money recovery: `money_recovery.md` §3 (4-house compound H6+H7+H8+H2)
- Child health: `child_health.md` §2-4 (Bhavat Bhavam multi-cusp)
- Mental health: `mental_health.md` §1 (H1+H4+H5+H9 wellness multi-cusp)
- Suicide risk: `mental_health.md` §3 (TIER 3 ABSOLUTE — H8+Maraka+Badhaka+Mars)
- Adoption: `adoption.md` §2 (4-layer reading)

For canonical topics WITHOUT dedicated multi-cusp examples in their
own files, apply the §10 extended table above as the primary reference.

---

*Sections 10-12 added pre-test-cleanup (2026-05-22). Extends multi-cusp
confirmation TIER 0-3 framework to every canonical topic in
TOPIC_HOUSE_MAP_CANONICAL. The career + marriage examples in §1-9 remain
the foundational worked-examples; this extension provides the lookup
table for the other 41 canonical topics.*

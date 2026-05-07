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

# Multi-Chart Analysis — KP Doctrine

This knowledge base file is the sole doctrinal source loaded by the
multi-chart analysis flow (`/astrologer/multi-analyze-stream`). It is
NOT loaded for single-chart Analysis tab queries — those continue to
use the existing Universal KB + topic KB stack.

Use this KB whenever 2 or more charts are present in the conversation
context and the astrologer is asking a question that requires combining
their signals.

---

## 1. Core principles

### 1.1 KP rejects "merged" or "composite" charts

Western synastry sometimes blends two natal charts into a single
"composite chart" with midpoint planets. **KP does not do this.** Each
chart stays sovereign. The astrologer reads each chart against the
question's house group, then applies a **combination rule** to merge
the verdicts at the human level — not at the chart level.

This is the most important principle in this document. Never describe
a "combined chart" or "merged sub-lords across charts". Always speak
in terms of "Chart 1 signifies X; Chart 2 signifies Y; combined per
KPRM rule Z, the verdict is …".

### 1.2 KP is event-driven, not category-driven

Every question maps to a specific **house group** — a primary house
plus supporting houses, sometimes plus karaka planets. There is no
hard list of "use cases". The KP literature catalogues hundreds of
events with their house groups. The astrologer's first job for any
question is to identify which house group the question is about.

Examples of question → house group mappings:

| Question | Primary | Supporting | Karaka |
|---|---|---|---|
| "Will I marry her?" | H7 | 2, 11 | Venus |
| "Will we have a child?" | H5 | 2, 11 | Jupiter |
| "Will we win this court case?" | H6 | 11 | Mars/Saturn |
| "Will we lose this court case?" | H8 | 12 | — |
| "Should we add this partner?" | H7 | 2, 6, 10, 11 | Mercury, Saturn |
| "Will my sibling cooperate on the property?" | H3 + H4 | 11 | — |
| "Will my father recover from the surgery?" | H1 (rotated to native's H9) | H11 | Jupiter, Mars |
| "Should we hire this employee?" | H6 (boss) ↔ H10 (employee) | 2, 11 | Mercury |
| "Is this guru the right teacher for my child?" | H9 (guru) ↔ H5 (child) | 4, 11 | Jupiter |

The full catalogue is in §2. Read the question, find the house group,
analyze each chart against that group, apply the combination rule.

### 1.3 KPRM — KP Relationship Method

KPRM is the canonical multi-person framework in KP, formalized by
Kanak Kumar Bosmia. It applies the cusp sub-lord doctrine to ANY
inter-personal relationship: spouse, sibling, parent-child, employer-
employee, business partner, friend, guru-disciple, plaintiff-defendant.

**KPRM rule of thumb:**
> An event between two people fires when BOTH charts' relevant cusp
> sub-lords signify the houses associated with the event AND the
> running dasha lords are common significators across the charts.

Translated for our use:
- For each chart, identify the cusp sub-lord of the relevant primary
  house for the event.
- Check whether each cusp sub-lord signifies the event's house group.
- Then apply the combination rule for that event type (see §3).

### 1.4 Maximum 4 charts in a single conversation

The system caps at 4 charts. KP literature does not explicitly cap,
but practical experience shows that combination logic past 3-4 charts
loses precision (too many degrees of freedom). For mass disputes
(family feud, large partnership), pick the 4 most-involved parties
and analyze pairwise.

---

## 2. House group catalogue

This is the practical reference table. For any question, find the
nearest entry and use its house group.

### 2.1 Marriage, partnership, romance

| Event | Primary | Supporting | Denial |
|---|---|---|---|
| Marriage will happen | H7 | 2, 11 | 1, 6, 10 |
| Love marriage | H5 | 7, 11 | 1, 6 |
| Arranged marriage | H7 | 9, 11 | 1, 6 |
| Second marriage (after divorce) | H7 + H9 | 2, 11 | 1, 6 |
| Divorce / separation | H6 | 1, 10, 12 | 2, 7, 11 |
| Re-union after separation | H7 | 2, 11 | 6, 10, 12 |
| Live-in relationship | H5 | 7, 11 | — |
| Engagement (without marriage yet) | H7 + H11 | 2 | 1, 6 |

### 2.2 Children, fertility, family expansion

| Event | Primary | Supporting | Denial |
|---|---|---|---|
| Childbirth | H5 | 2, 11 | 1, 4, 10 |
| Fertility difficulty | H5 | 6, 8 | 2, 11 |
| Adoption | H5 | 9 | (8th touch is OK for adoption) |
| Pregnancy in this dasha | H5 | 2, 11 + Jupiter karaka | — |
| Miscarriage risk | H5 + H8 | 12 | — |
| IVF / medical-assist conception | H5 + H6 | 11 (gain via service) | — |
| Number of children | H5 + H11 | 2 | — |
| Child's wellbeing | H5 (rotated) | 11 | 6, 8, 12 |

### 2.3 Career, employment, business

| Event | Primary | Supporting | Denial |
|---|---|---|---|
| Job acquisition | H6 + H10 | 2, 11 | 5, 9 |
| Promotion | H10 + H11 | 2, 6 | 5, 9 |
| Self-employment / business start | H7 + H10 | 2, 11 | 5, 9, 12 |
| Job change | H1 + H6 | 9, 10 | — |
| Job loss / resignation | H5 + H1 | 9 | 2, 6, 10, 11 |
| Business partnership formation | H7 + H10 | 2, 11 | 1, 6, 8 |
| Adding a new partner | H7 + H11 | 2, 10 | 6, 8, 12 |
| Removing a partner | H6 | 12 | 7, 11 |
| Business success (overall) | H2 + H10 + H11 | 6 | 5, 8, 12 |
| Foreign job / posting | H6 + H10 + H12 | 9 | — |
| Government job | H1 + H10 | 6, 11 + Sun karaka | — |
| Contract signoff | H6 + H10 | 2, 11 | 5, 8 |

### 2.4 Property, finance, inheritance

| Event | Primary | Supporting | Denial |
|---|---|---|---|
| Property purchase | H4 | 11, 12 | 3, 8 |
| Property sale | H3 + H10 | 11 | 4 |
| Property dispute (sibling, family) | H4 + H6 | 8, 12 | — |
| Inheritance | H4 + H8 | 2, 11 | — |
| Wealth accumulation | H2 + H11 | 6, 10 | 5, 8, 12 |
| Loan acquisition | H6 + H8 | 11 | — |
| Loan repayment | H6 | 12 | — |
| Theft / loss of property | H8 + H12 | — | 2, 11 |
| Insurance claim | H6 + H8 + H11 | — | — |

### 2.5 Health, surgery, hospitalization

| Event | Primary | Supporting | Denial |
|---|---|---|---|
| Good health / recovery | H1 + H11 | 5 | 6, 8, 12 |
| Disease onset | H1 + H6 + H8 | 12 | 11 |
| Surgery success | H1 + H11 + Mars karaka | — | 8, 12 |
| Hospitalization | H1 + H6 + H12 | — | 11 |
| Chronic disease | H6 + H8 + H12 (Saturn karaka) | — | 1, 11 |
| Death prediction | **DO NOT PREDICT.** See §8.4 |

### 2.6 Education, learning

| Event | Primary | Supporting | Denial |
|---|---|---|---|
| Education completion | H4 + H9 + H11 | 2 | 5, 8 |
| Higher studies abroad | H9 + H12 | 4, 11 | — |
| Exam success | H4 + H11 | 9 | 8 |
| Scholarship / award | H4 + H11 | 9 | 5 |
| Skill mastery | H3 + H5 | 11 + relevant karaka | — |

### 2.7 Legal, court cases

| Event | Primary | Supporting | Denial |
|---|---|---|---|
| Court win | H6 + H11 | 1, 10 | 8, 12 |
| Court loss | H8 + H12 | 5 | 6, 11 |
| Out-of-court settlement | H6 + H7 + H11 | — | 8 |
| Land litigation | H4 + H6 | 11 | 3, 8 |
| Criminal case (defending) | H8 + H12 (avoid) | H6 (win) | — |
| Punishment / jail | H8 + H12 | 1, 5 | 11 |
| Acquittal / release | H1 + H11 | — | 8, 12 |

### 2.8 Travel, foreign

| Event | Primary | Supporting | Denial |
|---|---|---|---|
| Domestic travel | H3 + H9 | — | — |
| Foreign travel | H3 + H9 + H12 | 11 | 4 |
| Foreign settlement | H7 + H9 + H12 | 11 | 4 |
| Travel return home | H4 | 11 | 9, 12 |
| Pilgrimage | H9 + H12 | 4 | — |

### 2.9 Spiritual, philosophical

| Event | Primary | Supporting | Denial |
|---|---|---|---|
| Spiritual initiation (diksha) | H5 + H9 + H12 | — | 6 |
| Guru-disciple bond | H9 (disciple's view) | 5, 12 + Jupiter | — |
| Meditation success | H9 + H12 | — | — |
| Renunciation (sannyasa) | H9 + H12 + H4 (giving up home) | — | 2 |

### 2.10 Generic relationship analysis

When the question is not about a specific event but about the
RELATIONSHIP itself between two people:

| Question | House group |
|---|---|
| "Are we compatible?" (any relationship) | H7 (of both) + H11 + H5 |
| "Will we get along long-term?" | H7 + H11 + 5th-from-7th = H11 |
| "Will this relationship cause loss?" | H7 + H12 + H8 |
| "Will this relationship bring gain?" | H7 + H11 + H2 |

---

## 3. Combination rules — KPRM applied

### 3.1 Three core rules

**OR-rule (Promise rule):**
If the event is a SHARED ASPIRATION (both parties want the event), the
event is promised if EITHER chart strongly signifies the event's house
group AND the running dasha lord in EITHER chart is a strong significator.

Used for: marriage, childbirth, business success, joint property gain.

**AND-rule (Denial rule):**
The event is FULLY DENIED only if BOTH charts deny it independently —
i.e., both charts' cusp sub-lords signify denial houses AND running
dasha lords are denial-thread significators.

If only one chart denies, the event is CONDITIONAL — possible with
intervention, delay, or compromise.

**SYNASTRY-OVERLAY rule (Compatibility check):**
For partnership / cooperation questions, check whether ONE chart's
key planets fall in the OTHER chart's relevant houses:

- Mercury of A in B's H7 → strong communication compatibility
- Saturn of A in B's H10 → A provides stability/structure to B's career
- Jupiter of A in B's H5 or H9 → A acts as wisdom-bringer for B
- Venus of A in B's H7 → romantic/aesthetic harmony
- Sun of A in B's H1 → A is dominant/leading in the dynamic
- Moon of A in B's H4 → emotional comfort/home-feel

Used when assessing how WELL two people will work together
(business, marriage, mentorship), beyond just whether the event
fires.

### 3.2 Combination rule selector by event type

| Event type | Apply rule |
|---|---|
| Marriage, joint childbirth, business partnership formation | OR + Synastry |
| Divorce, separation, partner exit | AND (both must agree) + each chart's H6 |
| Court case (between two parties) | Each chart's H6 vs H8 → who has stronger H6 wins; H11 vs H12 secondary |
| Inheritance dispute (multiple heirs) | Each chart's H8 + H4 signification; ranking |
| Adoption | Adoptive parent's H5 (OR-rule across both parents) + child's H9 (acceptance) |
| Hiring / firing | Boss's H6 + employee's H10 (Synastry-overlay primary) |
| Guru-disciple | Disciple's H9 + guru's H5 (Synastry overlay on Jupiter) |
| Generic "are we compatible?" | Synastry-overlay primary, OR-rule for any positive question, AND-rule for any negative one |

### 3.3 When only ONE chart is available (relative's chart missing)

Use **Bhavat Bhavam (rotational frame)** — see §4. Confidence drops to
~70% (single chart can only infer about the relative via rotation;
real chart is ~95% confidence).

---

## 4. Bhavat Bhavam — rotational frame for relatives

When the astrologer asks about a relative who does not have a chart
on file (e.g., "how is my father's health?" with only the native's
chart), apply Bhavat Bhavam — rotate the native's chart from the
relative's significator house, then read houses from THAT rotated
ascendant.

### 4.1 Standard rotations

| Relative | Rotated Lagna in native's chart | Their H6 (disease) = native's | Their H7 = native's | Their H10 = native's |
|---|---|---|---|---|
| Father | H9 | H2 | H3 | H6 |
| Mother | H4 | H9 | H10 | H1 |
| Spouse | H7 | H12 | H1 | H4 |
| Elder sibling | H11 | H4 | H5 | H8 |
| Younger sibling | H3 | H8 | H9 | H12 |
| Son / Daughter (own child) | H5 | H10 | H11 | H2 |
| Father-in-law | H3 (9th-from-7th) | H8 | H9 | H12 |
| Mother-in-law | H10 (4th-from-7th) | H3 | H4 | H7 |
| Boss / employer | H10 | H3 | H4 | H7 |
| Subordinate / employee | H6 | H11 | H12 | H3 |
| Friend | H11 | H4 | H5 | H8 |
| Open enemy | H7 | (their H6) H12 | H1 | H4 |
| Hidden enemy | H12 | (their H6) H5 | H6 | H9 |
| Teacher / guru | H9 | H2 | H3 | H6 |
| Student / disciple | H5 | H10 | H11 | H2 |

### 4.2 Confidence calibration

| Source of relative's signals | Confidence |
|---|---|
| Relative's own natal chart | ~95% |
| Native's chart via Bhavat Bhavam (rotation) | ~70% |
| Pure transit observation (no natal chart at all) | ~50% |

Always state the confidence calibration in the output when using
Bhavat Bhavam.

### 4.3 When to use the rotation vs the real chart

If the relative's chart IS available (uploaded as one of the charts
in the conversation), ALWAYS prefer the real chart. Use rotation
only when the chart is missing.

If the relative's chart is available BUT the question is about how
their state affects the native, BOTH analyses can be done in
parallel:
- "Father's own chart shows X for his health" (95% confidence)
- "Native's chart via rotation shows Y for father's health" (70%
  confidence — cross-check)
- If they agree: HIGH confidence combined verdict
- If they disagree: trust the real chart, note the rotational
  discrepancy as a learning signal

---

## 5. Per-relationship-type playbooks

### 5.1 Couple — fertility / childbirth

**House group:** H5 (children) + H2 (family expansion) + H11
(fulfillment) — primary. Jupiter karaka. Denial: H1, H4, H10.

**Per chart:**
1. H5 CSL must signify {2, 5, 11}.
2. Jupiter (karaka) condition: well-placed (own/exalted/friendly) vs
   afflicted (debilitated, combust, with Rahu/Ketu/Saturn).
3. Check for barren signs (Gemini, Leo, Virgo) holding the H5 cusp
   or 5th lord.
4. Current dasha: AD/PAD lord must be a significator of {2, 5, 11}.

**Combination:**
- BOTH charts' H5 CSL signify {2, 5, 11} → **STRONG PROMISE** of
  natural conception in current dasha.
- ONE chart promises + ONE chart partially denies → **CONDITIONAL**
  — IVF / medical-assisted / specific timing window required.
- BOTH charts deny + Jupiter afflicted in BOTH → **DENIAL** —
  natural conception unlikely; adoption pathway (check H5 + H9 for
  adoption signature).

**Adoption signature (special case):**
- One chart's H5 having an 8th-house touch from the sub-lord is
  classically read as adoption (not biological). Combined with H9
  (acceptance from "elsewhere") and Jupiter aspect.

**Output template:**
```
Per-chart verdict:
  • [Name 1] — H5 CSL = [planet], signifies {…}. Promise/Conditional/Denial.
  • [Name 2] — H5 CSL = [planet], signifies {…}. Promise/Conditional/Denial.
Jupiter karaka check (both charts): …
Combined verdict (KPRM OR-rule): PROMISED / CONDITIONAL / DENIED-NATURAL
Timing: [strongest joint sookshma where BOTH chart's dasha-bhukti
significators are active]
Path: [natural / IVF / adoption recommendation per signature]
```

### 5.2 Couple — marriage compatibility

**Note:** The dedicated Match endpoint (`/compatibility/match`) is
the precise tool for marriage compatibility — it computes 36-guna +
KP H7 sub-lord promise + D9 navamsha + Mangalik + joint precision
windows. When the question is specifically about marriage between
two named people, prefer the Match endpoint over this multi-chart
flow. Use multi-chart for OTHER couple questions (fertility, joint
finance, joint property, child's career, etc.).

If the user explicitly asks marriage compatibility through the
multi-chart flow, output a brief reading and refer them to the
dedicated Match tab for the full structured worksheet.

### 5.3 Business partners (2-N people)

**House group:** H7 (partnership) + H10 (career/business) + H11
(gains) — primary. H2 (income), H6 (service/operations) supporting.
Mercury (negotiation), Saturn (discipline), Jupiter (trust) karakas.
Denial: H8, H12 (loss), H1 (selfish exit).

**Per chart:**
1. H7 CSL must signify {2, 6, 7, 10, 11} for partnership viability.
2. H10 CSL must signify {2, 6, 10, 11} for business success.
3. H6 CSL must signify {6, 10, 11} for operational competence.
4. Mercury condition (negotiation), Saturn condition (long-term
   discipline).

**Synastry overlay (essential for partnerships):**
- Each partner's Mercury falling in the others' H7/H10 → strong
  communication match.
- Each partner's Saturn falling in others' H10 → stability provider.
- Each partner's Jupiter in others' H11 → trust + gain provider.

**Combination:**
- ALL partners' H7 + H10 CSLs signify the venture houses → **STRONG
  COMPATIBILITY**, venture supported.
- 1-2 partners signify + 1 partner shows H8/H12/H1 dominance →
  **CONDITIONAL** — venture works but with the malefic partner as a
  source of friction; recommend explicit role separation.
- ALL partners' charts deny the venture houses → **DON'T PROCEED**.

**Adding a new partner:**
- New partner's chart must show H7 CSL signifying existing partners'
  H2 + H11 (income + gain) and NOT signifying H8 (loss for them).
- If new partner's H6 sub-lord is malefic and signifies existing
  partners' H12 → red flag (will cause operational losses).

**Removing a partner:**
- Use AND-rule on the exit: removing requires the exiting partner's
  H5/H6 (departure) to signify exit AND the remaining partners' H11
  (gain) to be intact post-exit.
- Check the dasha period: if exit window aligns with everyone's
  positive dasha (no one's MD/AD ruler is fighting it), the exit is
  smooth. If misaligned, expect litigation.

**Output template:**
```
Per-chart verdict (each partner):
  • [Name X] — H7 CSL: …, H10 CSL: …, H6 CSL: … → COMPATIBLE / FRICTION / INCOMPATIBLE
Synastry overlays:
  • [Name X]'s Mercury in [Name Y]'s H{n}: … (impact)
  • [Name X]'s Saturn in [Name Y]'s H{n}: … (impact)
Combined verdict: VENTURE SUPPORTED / CONDITIONAL (with caveat) / DO NOT PROCEED
Recommended structure: [equal partners / lead-and-support / silent-partner pattern]
Timing for action: [dasha-window check]
```

### 5.4 Family — sibling / property / inheritance

**House group (per native):** H3 (siblings) + H4 (property) + H8
(inheritance) — primary. H6 (litigation), H11 (gains). Mars (sibling
karaka), Moon (mother → inheritance). Denial for property disputes:
H12 (loss), H10 (lost public face).

**Per chart:**
1. H3 CSL — relationship temperament with siblings (cooperative vs
   contentious).
2. H4 CSL — own property prospect (will the property be retained or
   given up).
3. H8 CSL — inheritance (will it materialize and in what form).
4. H6 CSL — litigation involvement (active dispute house).
5. H11 CSL — material gain through dispute or settlement.

**Combination (multiple siblings disputing property):**
- For EACH sibling, run H4 + H8 + H6 + H11 analysis.
- Sibling with strongest H6 + H11 + weak H8/H12 → most likely to
  win or get largest share.
- Sibling with strong H8 + H12 + weak H11 → most likely to lose,
  or to accept a settlement at a loss.
- AND-rule: dispute fully resolves only when ALL siblings' running
  dasha periods stop activating H6/H8 simultaneously — usually
  takes 1-3 years.

**Out-of-court settlement signature:**
- Each chart's H7 (counsel/mediator) + H11 (gain) active → settlement
  pathway available. Recommend.
- If any chart's H6 + H8 are heavily active with malefic dasha
  lords → expect courtroom fight, not settlement.

### 5.5 Employer-employee compatibility

**Boss's chart house group:** H6 (subordinate as service-class
relationship), H10 (own role being supported).
**Employee's chart house group:** H10 (own job), H6 (the role).
**Synastry primary:** employee's Mercury in boss's H6/H10 →
communication. Boss's Saturn in employee's H10 → mentorship +
structure.

**Combination:**
- Both charts' H6/H10 in mutual positive signification → strong fit.
- One chart shows H12 (loss) signature from the other → toxic
  dynamic; expect attrition.

### 5.6 Hiring decision (boss + 2-3 candidate employees)

For each candidate:
1. Candidate's H10 CSL + H6 CSL signification check.
2. Synastry: candidate's Mercury/Saturn/Jupiter falling in boss's
   chart's positive houses (H2/H10/H11).
3. Rank candidates by combined score.

Output a ranked recommendation, not a single binary verdict.

### 5.7 Teacher / guru and student

**House group:** Student's H9 (guru) + H5 (learning capacity) + H4
(formal education). Guru's H5 (teaching capacity) + H10 (public
role as teacher).

**Synastry primary:** Guru's Jupiter in student's H9 → strong
guidance bond. Student's Sun in guru's H5 → student's authority
recognizes the guru.

**Combination:**
- Both charts' Jupiter strongly placed + Synastry overlay positive
  → bond will flourish.
- Either chart's H6/H12 dominating the inter-aspect → friction
  (student rebels or guru loses patience).

### 5.8 Plaintiff vs defendant (court case prediction)

**Plaintiff's chart:** H6 (active dispute) + H11 (gain via win) +
H10 (public victory).
**Defendant's chart:** H1 (self-protection) + H11 (gain via being
acquitted) + H6 (cleared of charges).
**Both:** H8 + H12 represent loss for either side.

**Combination (who wins?):**
- Whichever party has STRONGER H6 + H11 active in current dasha,
  AND weaker H8 + H12, has the upper hand.
- If both have similar H6+H11 strength → settle / draw / appealable.
- If both have strong H8+H12 → both lose, case dismissed or both
  sanctioned.

### 5.9 Cohabitation / roommate compatibility

**House group:** H4 (home) + H11 (friends) — primary. Moon condition
in each chart (emotional comfort).

**Synastry primary:** Each chart's Moon in the others' H4 → emotional
home-fit.

**Combination:**
- Both charts' H4 CSL + Moon condition positive + Synastry on Moon
  → comfortable cohabitation.
- One chart's Mars/Saturn afflicting the others' H4 → conflict over
  shared space.

### 5.10 Medical — patient + doctor / caregiver

**Patient's chart:** H1 (body) + H6 (treatment) + H11 (recovery).
**Doctor's chart:** H10 (professional capability) + H6 (service to
patient). Jupiter karaka.
**Synastry primary:** Doctor's Jupiter in patient's H1 (healing
energy directed at patient).

**Combination:**
- Both charts positive + Synastry positive → high-trust treatment
  relationship.
- Patient's H6 indicates surgery + Doctor's H10 indicates skilled
  intervention → procedure supported.

---

## 6. Worked examples

### 6.1 Example: Couple fertility (Manyue + Ramya)

**Question:** "We've been trying for 2 years and nothing yet. What
does our combined chart say?"

**House group identified:** H5 (children) + H2 (family) + H11
(fulfillment); Jupiter karaka.

**Chart 1 — Manyue (male, Scorpio Lagna):**
- H5 cusp = Aries 1.64° → Sub-lord = Venus
- Venus in H11 (Virgo), owns H7 + H12 → signifies {7, 11, 12}.
  H11 is RELEVANT (fulfillment); H12 is DENIAL.
- Verdict: MILD CONDITIONAL — H11 present but H12 denial thread.
- Jupiter karaka condition: Jupiter in H6 (Taurus), owns H2 + H5
  → signifies {2, 5, 6}. H5 RELEVANT (children promise via
  ownership); H6 DENIAL (medical intervention house).
- Conclusion: Jupiter favourable but in disease-house → fertility
  promise present but with medical-route implication.
- Current dasha: Rahu MD ▸ Saturn AD ▸ Saturn PAD until Aug 2026.
  Saturn signifies H6 (disease), so the active dasha is in the
  medical-intervention thread.

**Chart 2 — Ramya (female, hypothetical for example):**
- [Each field analyzed per same procedure]
- Verdict: …

**KPRM OR-rule applied:**
Since BOTH charts show H5 CSL with conditional/denial threads in
the same dasha period → **CONDITIONAL with medical pathway**.

The Saturn AD in Chart 1 signifying H6 + the matching dasha period
in Chart 2 → window is open for medical intervention (IVF, fertility
treatment) RIGHT NOW (through Aug 2026). Natural conception is
weakly supported; assisted reproduction is the structurally
indicated path.

**Client summary:** Both charts agree on conditional fertility.
Saturn period (now through Aug 2026) supports medical intervention
(IVF, treatment). Natural conception possible but not the strongest
signature. Recommend consulting a fertility specialist during this
window — the chart structurally supports medical-route success.

### 6.2 Example: Sibling property dispute (3 siblings)

**Question:** "My two brothers and I are fighting over our father's
property. Will the dispute resolve, and who gets what?"

**House group:** Each sibling's H4 (property) + H8 (inheritance) +
H6 (dispute) + H11 (gain).

**Per chart (each of 3 brothers):**
- Brother A: H4 CSL strongly signifies {2, 4, 11}; H6 CSL active in
  current Mercury AD. → A is in the active-dispute period AND has
  the strongest inheritance/gain signature.
- Brother B: H4 CSL signifies {4, 8, 12}; H11 CSL has weak
  signification. → B is in a loss-leaning position; H8/H12 dominate.
- Brother C: H8 CSL signifies {6, 8, 11}; H6 active. → C is the
  active disputant but with mixed gain/loss signals.

**Combined verdict:**
- Brother A: most likely to receive the largest share — court win
  or favourable settlement.
- Brother B: likely to accept a smaller share or face loss; H12
  signature suggests letting go.
- Brother C: in active fight mode but with mixed outcome — most
  likely to negotiate / settle out of court.
- Timing: dispute resolution window opens in 8-14 months when
  Mercury AD ends across all charts simultaneously.

### 6.3 Example: Adding a 4th partner to a 3-person business

**Question:** "We three run a tech startup. A 4th person wants to
join. Should we let him in?"

**House group:** Each existing partner's H7 (new partnership)
+ H10 (business) + H11 (gain). New partner's H7 + H10 + H11. Cross-
synastry: new partner's chart against each existing partner.

**Per chart:**
- Partner 1: H7 CSL signifies {7, 10, 11} — supports new partner.
- Partner 2: H7 CSL signifies {7, 10, 8} — H8 thread = loss
  potential from new partner.
- Partner 3: H7 CSL signifies {7, 11} — supports new partner.
- New partner: H7 CSL signifies {2, 6, 10, 11} — strong own
  partnership signature.
- Synastry: New partner's Mercury falls in Partner 2's H8 (!).

**Combined verdict:**
- 2 of 3 existing partners support; Partner 2 has a structural
  warning (H8 thread). The Synastry overlay confirms: new partner's
  Mercury hits Partner 2's H8 = friction inevitable.
- Recommendation: Partner 2 should NOT have day-to-day reporting
  contact with the new partner. If the structure can isolate them
  (different verticals, different geographies, separated equity
  buckets), the partnership works. If not, the H8 friction will
  manifest as litigation or exit within 12-18 months.

---

## 7. Output format conventions

### 7.1 Multi-chart answer template

Every multi-chart answer should follow this structure:

```
1. QUESTION INTERPRETATION
   - Restate the question
   - Identify the house group (from §2 catalogue)
   - State which combination rule (§3) will be applied

2. PER-CHART VERDICTS
   For each chart in context:
     - Name + chart identifier (e.g., "♂ Manyue (chart 1)")
     - Relevant cusp + sub-lord + signification
     - Current dasha alignment with the question's houses
     - Per-chart verdict: PROMISE / CONDITIONAL / DENIAL

3. CROSS-CHART OVERLAY (when relationship-type indicates synastry)
   - Specific planet-in-house cross-references
   - Friction points vs harmony points

4. COMBINED VERDICT
   - Apply the rule (OR / AND / Synastry / weighted)
   - State the final verdict with confidence calibration

5. TIMING
   - Best window (joint dasha overlap)
   - Avoid windows (dasha conflict)
   - Falsifiable check (date by which the prediction can be tested)

6. RECOMMENDED ACTION
   - Concrete steps the parties can take
   - Pathway (natural / medical / legal / negotiated etc.)

7. CAVEATS / ALTERNATIVE READS
   - Doctrinal alternatives if any
   - Bhavat Bhavam confidence note if any chart is missing

8. CLIENT SUMMARY
   - 2-3 sentence plain-language wrap-up
   - Suitable for the astrologer to read verbatim to the client(s)
```

### 7.2 Confidence calibration display

Every multi-chart verdict carries a confidence number 0-100. Compose
from:
- 95 base if ALL relevant charts are present
- −25 if Bhavat Bhavam rotation is used for any party (relative's
  chart missing)
- −10 if any chart's dasha lord is in transition (within 2 weeks of
  AD/PAD change)
- −5 if any chart's H7/event-CSL has a Sub-Sub-lord in a Rahu/Ketu
  star (uncertainty)

Floor: 30 (never claim < 30% confidence — recommend more data
collection instead).

### 7.3 Per-chart pill convention

The frontend renders a pill above each multi-chart answer:

```
📊 Charts analyzed: ♂ Manyue · ♀ Ramya
🟢 RPs from: Hyderabad · 14:32 (your live location)
🔍 Verdict confidence: 78/100
```

Always include the chart identifier (gender symbol + name) for each
chart used in the analysis.

### 7.4 Ruling Planets at the moment of a multi-chart query

Even in multi-chart analysis, **Ruling Planets are ONE set of values
computed at a single moment + location** — namely, the astrologer's
CURRENT location at the time of the query.  RPs are NOT computed per
chart; they're computed for the moment of the inquiry.

When multiple charts are in conversation:
- The "astrologer's live location" determines the RP-source coordinates
  (same as single-chart — see Trust-1 rp_meta contract).
- The 7 RP slots (Day Lord, Asc Sign/Star/Sub, Moon Sign/Star/Sub) are
  computed ONCE for the moment of query.
- Then each chart's significators are cross-referenced against this
  one RP set.  A planet that is a significator in Chart 1 AND is a
  Ruling Planet at the moment is a "fruitful significator" for
  Chart 1.  Same for Chart 2.
- This is how the combination logic ties multi-chart static
  signification to the dynamic moment.

If the astrologer's live location is unavailable (denied / unsupported),
the same natal-fallback warning applies as single-chart: the RPs are
computed at SOME location (typically the first chart's natal), and the
output MUST explicitly state this with the same trust-pill colour code
(red = natal fallback, amber = manual, green = auto-live).

---

## 8. Anti-patterns and guardrails

### 8.1 Never blend charts at the data level

**WRONG:** "The combined Mercury (average of both charts' Mercury
longitudes) is in Virgo …"

**RIGHT:** "Chart 1's Mercury is in Virgo H11; Chart 2's Mercury is
in Leo H9. Synastry: Chart 1's Mercury falls in Chart 2's H3 …"

### 8.2 Never apply Parashari doshas across charts

Mangalik dosha, Sade Sati, Kuja Dosha — these are Parashari/Vedic
constructs that KP does not include. The dedicated Match endpoint
intentionally avoids them per the KSK strict doctrine. Multi-chart
analysis MUST follow the same rule.

If a user asks "is my partner Mangalik for me?" in the multi-chart
flow, redirect them to: "KP analyzes marriage compatibility through
the H7 sub-lord doctrine, not through Mangalik dosha. The dedicated
Match tab provides the full KP marriage worksheet."

### 8.3 Never average or score-out compatibility numerically

The 36/8 score in Match is a specific marriage-compatibility
construct. Do NOT invent equivalent scores for business partnership,
family compatibility, or other multi-chart cases. Use qualitative
verdicts (PROMISED / CONDITIONAL / DENIED) plus confidence
calibration only.

### 8.4 Never predict death timing (RULE 15 from existing KB)

Across any number of charts, do NOT predict:
- "When will X die"
- "What is the longevity of X"
- "Will X survive this illness?" (binary survival prediction)

Health prediction may discuss: chronicity, recovery vs setback,
medical intervention need, severity tier (mild / moderate /
serious). Survival itself is OFF-LIMITS regardless of how many
charts are involved.

### 8.5 Never predict specific named entities

Charts show TIMING and QUALITY of events, not the names of
companies, courts, employers, schools, or specific persons. If a
user asks "will I get the job at CIBC specifically?", the correct
answer is: "Your chart shows H6+H10+H11 activation for contract
closure in the [window]. If CIBC is in your active pipeline, the
chart's signature applies to whichever contract is closest to
closure in that window. The chart shows the WHEN and the QUALITY,
not the WHICH."

### 8.6 Never inflate confidence

The confidence calibration in §7.2 is mechanical. Do not write
"95% confident" because it sounds authoritative. Compute the
confidence from the rules and report honestly. Astrologers building
trust with their clients rely on truthful confidence calibration.

### 8.7 Never combine charts of unrelated parties

If the conversation context contains charts of, say, Manyue + Ramya
+ an unrelated friend Vamsi, and the user asks "will Manyue marry
Ramya?", DO NOT include Vamsi's chart in the marriage analysis.
Use only the charts that are relevant to the question being asked.

Output should note: "Charts in context: Manyue, Ramya, Vamsi.
Analysis uses: Manyue + Ramya. Vamsi's chart not relevant to this
question — skipped."

### 8.8 Never recommend illegal or harmful action

If a multi-chart analysis seems to suggest exclusion of a partner,
removal of an heir, denial of a child, or any action with legal /
ethical / financial consequences, ALWAYS frame the chart's signature
as ONE data point among many. The astrologer-client conversation
should incorporate legal counsel, mental-health considerations, and
human judgment. The chart never makes the decision — it informs the
decision.

### 8.9 Never simulate a chart that's not provided

If the user asks "what if my partner had a chart like X?", DO NOT
generate fake chart data. Politely require the actual chart inputs.

---

## 9. Doctrinal references

This KB synthesizes doctrine from:

- **K.S. Krishnamurti — Krishnamurti Padhdhati Vols. 1-6** (founding
  doctrine of the KP system, sub-lord theory, house grouping).
- **Kanak Kumar Bosmia — Easy Way to Learn KP: KP Relationship
  Method (KPRM)** (canonical multi-person framework).
- **K. Hariharan — KP Astrology: A Study** and **Ruling Planets and
  KP (RPKP)** (modern teaching of the system).
- **K. Subramaniam — Astro Secrets and KP, Vol. VIII (Sub Sub)**
  (deep sub-sub-lord doctrine).
- **JyotishPortal — KP House Groupings** (canonical event→house
  table; reference for §2).
- **AstroSage KP Tutorials** (publicly accessible modern teaching).
- **Existing knowledge base files in this repo** —
  `backend/knowledge/*.txt`, `backend/app/kp_knowledge/*.md` — for
  tone, terminology, formatting conventions, anti-Parashari guard.

This KB is intentionally written in the same terse-but-precise
voice as `kp_csl_theory.txt`, `pattern_library.md`, and
`worked_examples_library.md` so the LLM treats it as part of the
same canonical-doctrine stack.

---

## 10. Versioning + change log

- **v1 (2026-05-26)** — Initial draft. Covers principles, house
  group catalogue (10 sub-domains), 3 combination rules + selector,
  Bhavat Bhavam table, 10 per-relationship playbooks, 3 worked
  examples, output format conventions, 9 anti-patterns.
- **v2 (2026-05-26 — Phase 5)** — Same 10 sections preserved.
  Added §11 (cross-chart engine primitive specifications — the 7
  fact-tables that the LLM quotes verbatim under MC2 discipline).
  Added §12 (named live failures from May 2026 production tests —
  the multi-chart equivalent of single-chart's "ANTI-PATTERNS THE
  LLM HAS PRODUCED LIVE" section). Added §13 (multi-chart pattern
  library cross-reference — companion to single-chart's
  pattern_library.md).

Future versions should preserve the v1 + v2 structure; only extend
in-section content.

---

## 11. Cross-chart engine primitive specifications (Phase 5)

This section is the LLM-facing contract for the 7 cross-chart engine
primitives emitted by `cross_chart_engine.compute_all()`. The LLM
sees these as structured fact tables in the user-message block and
must quote VERBATIM under MC2 discipline.

### ① SYNASTRY OVERLAY MATRIX

**What it is**: For each ordered pair of charts (A, B) where A ≠ B,
the engine emits a planet-to-house map: for each of A's 9 grahas,
which house of B (using B's actual KP cusps) contains that planet's
absolute longitude.

**LLM consumption rules**:
- When a synastry overlay is relevant (Section 3 of the output), cite
  the SPECIFIC planet + the SPECIFIC house in B — e.g., "Pavithra's
  Mars (Pisces 28°26'14") lands in Manyue's H4 (domestic / home)".
- POSITIVE overlay if the landed house is in `focus_houses` for the
  current topic. FRICTION overlay if in `denial_houses` or {6, 8, 12}.
- The engine has done the math — never re-derive. Quote the matrix.

**Doctrinal anchor**: KP H7/Lagna lord cross-placement rule
(KP Reader IV) — "lagna or 7th lord of one partner placed in the
other's lagna or 7th house" is a recognised compatibility signal.

### ② COMMON-SIGNIFICATOR SET

**What it is**: For each focus house, each chart's 4-step significators
(per KP RULE 5 A/B/C/D levels), the intersection across all N charts,
and the intersection with today's Ruling Planets.

**LLM consumption rules**:
- "Common significators with RP" are the "RIPE-to-manifest" planets —
  the strongest timing signal in multi-chart KP. Cite them explicitly
  in Section 5 (TIMING).
- Empty intersection ≠ denial. It signals the event needs different
  triggers (transit, single-chart promise dominance, etc.).
- Quote sets verbatim — sorted lists, exact members.

**Doctrinal anchor**: KSK Reader V "When the ruling planets and the
significators for marriage in a chart become common significators, it
is imminent that the marriage will take place during the harmonious
Dasha periods." (Generalises beyond marriage to any event.)

### ③ JOINT DASHA INTERSECTION WINDOWS

**What it is**: Date ranges (next 24 months) where ALL N charts have
at least one running dasha layer (MD/AD/PAD) signifying any focus
house. Scored 0-100 (base = (sum_layers_signifying / max_layers) ×
100; +10 bonus if any of today's RPs is a signifying lord). Ranked
top 5.

**LLM consumption rules**:
- Cite the TOP 3 windows by score in Section 5 (TIMING).
- For each window, quote per-chart active layers and signifying lords
  VERBATIM — don't paraphrase as "Saturn period" when the engine
  emits ['AD', 'PAD'] with lords ['Saturn', 'Mercury'].
- RP overlap is the riper signal — flag it (e.g., "RP boost: Mars,
  Mercury").
- Empty list = "no joint window in next 24 months where all charts
  fire focus group simultaneously". State this honestly; suggest
  re-checking after the next major dasha shift.

**Doctrinal anchor**: KSK Reader V joint-period principle (Pattern T1
in single-chart pattern_library.md) extended to multi-chart: all N
charts must fire focus-house significators in the same time bucket
for the event to materialise.

### ④ SUB-LORD CROSS-CHECK SUMMARY

**What it is**: Per focus house, each chart's CSL chain side-by-side:
CSL planet + CSL's house + CSL's signifies (4-step) + CSL's star-lord
+ star-lord's house + CSL's sub-lord + sub-lord's house + 4-step union
+ per-chart 5-tier verdict (STRONGLY PROMISED / PROMISED / CONDITIONAL
/ WEAKLY PROMISED / DENIED / NEUTRAL).

**LLM consumption rules**:
- Use as the spine of Section 2 (PER-CHART VERDICTS). Cite the CSL
  chain at single-chart depth for each chart.
- The per-chart verdict from engine = the headline; you may elaborate
  with Star-Sub Harmony (RULE 16) and Pattern naming (RULE 19) but
  do NOT contradict the engine's verdict label.
- Cite chain unions verbatim — these are the 4-step KP rule output.

**Doctrinal anchor**: Single-chart RULE 5 + RULE 11 (KSK strict bhukti
rule for dual signification) applied per chart, then combined per MC3.

### ⑤ BHAVAT BHAVAM CROSS-VALIDATION

**What it is**: When questioner's chart (index 0) AND relative's chart
(index 1) are both present AND the playbook has a `relative_type`
(spouse, child, father, mother, sibling, etc.), the engine emits both:
- rotated_verdict from questioner's chart via rotation (~70% conf)
- natal_verdict from relative's chart directly (~95% conf)

**LLM consumption rules**:
- Cite BOTH verdicts in Section 2 — never silently pick one.
- AGREE → upgrade combined confidence to 95%, state this explicitly.
- DISAGREE → trust the natal (relative's own chart). Flag the
  rotated-verdict discrepancy in Section 7 (CAVEATS) as a learning
  signal — it tells the astrologer how reliable Bhavat Bhavam is
  for similar questions in the future.
- If primitive is `null` (not applicable), don't fabricate one.

**Doctrinal anchor**: Bhavat Bhavam axis table (multi-chart KB §4) —
Bosmia KPRM parent-child + KP Reader IV (children section).

### ⑥ KARAKA ROLE DISTRIBUTION

**What it is**: For N≥3 partnership-style topics (business, partnership,
startup, joint_venture, career_business), the engine ranks each chart's
karaka strength (Mars=operator, Mercury=advisor, Saturn=discipline,
Jupiter=trust, Venus=harmony) and assigns the strongest chart per role.

Scoring per chart × karaka:
- +20 if karaka signifies H10 or H11 (career/gain anchors)
- +15 if karaka is self-significator (in own nakshatra)
- −10 if karaka is in H8 or H12 (loss houses)

**LLM consumption rules**:
- Cite in Section 3 (CROSS-CHART OVERLAY) for N≥3 partnership queries.
- Use the role assignments to give CONCRETE structural advice in
  Section 6 (RECOMMENDED ACTION) — e.g., "Chart 2 carries Mars role
  (operator) most strongly → likely best as the operations lead.
  Chart 1's Mercury role (advisor) suggests strategy/negotiation seat."
- If primitive is `null` (N<3 or non-partnership topic), don't
  invent a karaka distribution.

**Doctrinal anchor**: Bosmia KPRM partnership chapter (workshop
examples assigning roles in N-person partnerships).

### ⑦ COMBINATION RULE VERDICT

**What it is**: The mechanical combined verdict the engine emits
after applying OR-Promise / AND-Denial / Synastry-Overlay rule per
MC3 to per-chart verdicts + joint windows.

Fields:
- `rule`: which rule was applied (selected by PLAYBOOK_MAP per topic)
- `verdict`: combined verdict (PROMISED / CONDITIONAL-POSITIVE /
  CONDITIONAL / DENIED / STRONG-FIT / WORKABLE / FRICTION /
  INCOMPATIBLE / NOT-DENIED / UNKNOWN)
- `formula_trace`: human-readable step-by-step showing the math

**LLM consumption rules**:
- This is the headline of Section 4 (COMBINED VERDICT). State VERBATIM:
  "Per ⑦ Combination Rule Verdict: [verdict]. Formula trace:
  [formula_trace]."
- You may explain the verdict in plain English afterwards, but the
  literal quote must appear first.
- Do NOT override the verdict with intuition. Engine math is sacred
  (same as single-chart RULE 18 engine confidence).

**Doctrinal anchor**: Multi-chart KB §3 (OR/AND/Synastry rules) +
MC3 (the mechanical formula).

---

## 12. Named live failures (May 2026 production tests)

This section catalogues SPECIFIC failure modes observed in production
multi-chart answers, with their root cause and the discipline rule
that prevents recurrence. Modelled on single-chart's "ANTI-PATTERNS
THE LLM HAS PRODUCED LIVE" section.

### 12.1 Venus position contradiction across turns

**Symptom**: In one multi-chart conversation, Pavithra's Venus was
quoted as "Pisces (Revati nakshatra)" in answer 1, then "Aquarius
(H7)" in answer 2.  Same chart, same conversation.

**Root cause**: Phase 2/3 compact formatter omitted the `house` field
from karaka rows (chart_engine's planet dict has no `house` key).  LLM
saw "Venus: Aquarius 314.5° · house · …" with blank house and inferred
per turn — sometimes from sign, sometimes from longitude.

**Phase 5 fix**: format_chart_compact_for_multi is GONE.  Now per-
chart context = goated format_chart_for_llm output with explicit
"Per Pavithra's chart data: Venus owns H7, H12" + PLANET POSITIONS
block ("Venus -> H10") — single source of truth.

**Discipline rule**: MC2 (engine-emit-then-quote) + single-chart
RULE 10 (placement verification) + MC8 forbidden pattern #1.

### 12.2 Jupiter signified houses incomplete

**Symptom**: Manyue's Jupiter quoted as "signifies {2, 4}" when the
engine's 4-step union emits "{2, 5, 6, 9}".

**Root cause**: Compact formatter never surfaced per-planet
significations.  LLM recomputed the 4-step rule by hand and dropped
contributions (the star-lord chain and sub-lord chain).

**Phase 5 fix**: Goated context includes HOUSE SIGNIFICATORS block
per house (occupants + in_star_of_occupants + house_lord +
in_star_of_lord + 4-step union).  LLM reads, doesn't compute.

**Discipline rule**: MC2 (engine-emit-then-quote) + single-chart
RULE 10 (no inferring significations) + MC8 forbidden pattern #2.

### 12.3 Mixed degree formats

**Symptom**: In one answer: "Taurus 54.67°" (absolute longitude) and
"Taurus 24.67°" (within-sign degree) — both for the same planet.

**Root cause**: Compact formatter emitted only absolute longitude.
LLM converted to within-sign sometimes, didn't other times.

**Phase 5 fix**: Goated context formatter uses consistent DMS
within-sign + parenthetical absolute longitude in the same line —
e.g., "Taurus 24°40'12" (abs 54.67°)".  LLM has only one canonical
form to quote.

**Discipline rule**: MC8 forbidden pattern #3.

### 12.4 "Data not surfaced for Shadbala"

**Symptom**: LLM refused to discuss Venus's Shadbala saying "data
not surfaced for this multi-chart view" — when in fact the goated
single-chart context HAS Shadbala (it's in format_chart_for_llm's
output for every chart).

**Root cause**: Compact formatter omitted Shadbala (and dignity, and
retrograde, and transits, and Tara Chakra, etc.) to "save tokens".
LLM correctly applied MC2/R5 discipline ("data not surfaced → say so,
don't fabricate") but the data WAS available in the goated context;
the compact formatter dropped it.

**Phase 5 fix**: Per-chart context is now the full goated context.
Every field single-chart Analysis tab sees is present per chart.

**Discipline rule**: MC8 forbidden pattern #4.  Phase 5 makes this
impossible by design.

### 12.5 Silent chart skipping

**Symptom**: With Manyue + Pavithra + Ramya in conversation context,
the LLM analyzed only Manyue + Pavithra for a marriage question and
didn't mention Ramya at all.

**Root cause**: No prompt rule required explicit included/excluded
chart enumeration in Section 1.

**Phase 5 fix**: MC8 forbidden pattern #6 + OUTPUT TEMPLATE Section 1
explicitly requires: "Charts INCLUDED in this analysis, charts
EXCLUDED (and why if any are present-but-not-relevant)".

### 12.6 Per-chart depth shallower than single-chart

**Symptom**: A multi-chart answer for "Manyue's career prospects?"
(when 3 charts were in context) gave a 200-word per-chart verdict
when the equivalent single-chart Analysis tab answer would have been
2000 words with full Star-Sub Harmony breakdown.

**Root cause**: No prompt rule enforced single-chart depth per chart
in multi-chart mode.

**Phase 5 fix**: MC1 explicit + smart routing (Commit 6) routes
single-chart questions to /astrologer/analyze-stream automatically
when scope=1 chart.

---

## 13. Multi-chart pattern library cross-reference

Single-chart pattern_library.md catalogues patterns like M1 (marriage
strong promise), C2 (children conditional), J3 (Jupiter-debility-yet-
promise), T1 (joint-period fructification). These apply PER CHART in
multi-chart analysis per MC1.

Multi-chart-SPECIFIC patterns (catalogue grows as we observe them in
production):

| Pattern ID | Name | Conditions |
|---|---|---|
| MC-T1 | Joint fructification active | Top joint dasha window has score ≥80 AND RP overlap non-empty |
| MC-T2 | Joint fructification dormant | No joint window in next 24mo (event waits for next major dasha shift) |
| MC-S1 | Strong synastry | ≥4 positive overlays AND ≤1 friction overlay (Synastry rule → STRONG-FIT) |
| MC-S2 | Asymmetric synastry | One direction strong, other weak (e.g., A's Venus in B's H7 but B's Venus in A's H6) |
| MC-D1 | Universal denial | All N charts DENIED with no joint window (AND-rule + OR-rule both deny) |
| MC-D2 | Asymmetric promise | One chart strongly PROMISED, others DENIED — combination depends on rule |
| MC-B1 | Bhavat Bhavam agreement | Rotated verdict and natal verdict AGREE → 95% confidence |
| MC-B2 | Bhavat Bhavam disagreement | Verdicts DISAGREE → trust natal, flag rotation discrepancy |
| MC-K1 | Clear karaka distribution | (N≥3) Each role has a clearly strongest chart (gap ≥15 points) |
| MC-K2 | Contested karaka | (N≥3) Two charts tied for a role — recommends explicit role assignment |
| MC-RP1 | RP-rich joint window | Joint window has RP overlap ≥2 planets (very ripe) |
| MC-RP2 | RP-empty common sigs | Common significators non-empty but none in today's RPs (event possible but not "today") |

When a pattern fires in a multi-chart answer, name it explicitly:
"Pattern MC-T1 fires — top joint window (2026-08-15 → 2026-11-22)
scores 95 with RP overlap [Mars, Saturn]."

This is the multi-chart equivalent of single-chart's "Pattern T1
fires — Mercury AD is the supporting-cusp-sub-lord trigger" naming
discipline. KSK-grade reading vs generic scan.

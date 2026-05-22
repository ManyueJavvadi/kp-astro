# Compound Questions Library — Cross-Topic KP Doctrine

**Purpose**: Master library of compound-question patterns. Real-world
questions rarely fit one topic; this file codifies the top 25+ compound
patterns the AI should recognize and decompose properly.

**Source**: Synthesis of Batches 1-5 doctrine + RULE 14 (multi-factor
queries) + RULE 29 (decision support) + `sensitivity_tiers.md` §11
(compound Tier-3 protocol) + real-world case study patterns.

**Loaded universally** (in ADVANCED_FILES) because compound questions
can hit any topic-pair and need to be recognized BEFORE topic routing.

---

## 1. THE FOUNDATIONAL DOCTRINE

### What makes a question "compound"

A question is COMPOUND when it touches 2+ of these:
1. Multiple life domains (career + marriage / health + wealth / etc.)
2. Multiple family members
3. Multiple decision options
4. Multiple time horizons
5. Multiple financial/emotional stakes

### Why compound questions matter

Real-world consultations are overwhelmingly compound. The most common
pattern: a client opens with a single topic but the actual concern
spans 3+ domains.

Example:
- Surface question: "When will I get married?"
- Actual compound: marriage timing + career-stability before marriage
  + family acceptance + financial readiness + spouse character

The astrologer's job in compound questions:
1. RECOGNIZE the compound nature (don't collapse to single-topic)
2. DECOMPOSE into axes
3. READ each axis with its own KB doctrine
4. SYNTHESIZE — not as verdict but as decision-support across axes
5. CROSS-LINK to specialized files as needed

### The compound-recognition checklist

Apply this checklist to every question:
- [ ] Does the question contain "and" / "or" / "should I X or Y"?
- [ ] Does it mention multiple people (spouse + parents + children)?
- [ ] Does it imply finite resources (savings / time / opportunity)?
- [ ] Does it span multiple time horizons (now vs later)?
- [ ] Does it involve a decision-frame ("should I" / "is it good to")?

2+ checks → COMPOUND. Apply the decomposition protocol.

---

## 2. THE COMPOUND DECOMPOSITION PROTOCOL

### Step 1 — Identify all axes

Read the question carefully and list every axis it touches.

### Step 2 — Apply each axis's own KB

For each axis, route to the relevant KB:
- Career axis → `job.txt` + `business.txt` + `wealth.txt` (salary)
- Marriage axis → `marriage.txt` + `marriage_matching.txt`
- Health axis → `health.txt` + `health_detailed.md` + specialized
  (mental_health / hospitalization / longevity / pregnancy)
- Financial axis → `wealth.txt` + (loan/EMI/investment subsections)
- Family axis → `parents_family.md` + `marriage.txt` §14 (in-laws)
- Property axis → `property.txt`
- Foreign axis → `foreign.txt`
- Children axis → `children_detailed.md` + `child_health.md` +
  `pregnancy.md` + `adoption.md`
- Legal axis → `litigation.txt`
- Spiritual axis → `spirituality.md` + `pilgrimage.md`

### Step 3 — Identify the sensitivity tier per axis

The OVERALL tier of a compound question = the MAXIMUM tier among
its axes:
- Compound with any Tier 3 axis → Tier 3 ABSOLUTE compound
  (apply `sensitivity_tiers.md` §11)
- Compound with Tier 2 max → Tier 2 with multi-branch
- All Tier 1 axes → standard multi-branch presentation

### Step 4 — Read each axis independently

Don't let one axis dominate. Each axis gets its own honest reading.

### Step 5 — Synthesize as decision-support

Apply `decision_support.md` 7-step protocol. Never reduce to a verdict.

### Step 6 — Cross-link explicitly

In the output, name the cross-link files used. This makes the
reasoning auditable and traceable.

---

## 3. TOP 25 COMPOUND PATTERNS — RECIPE LIBRARY

Each pattern has: the question template, the axes involved, the KB
files to consult, and the sensitivity tier.

### Pattern C1 — Career change with family impact

**Template**: "Should I quit my [stable job] to start a business
given my family's expectations?"

**Axes**: career + business + family + wealth + decision
**KBs**: job.txt + business.txt + parents_family.md + wealth.txt
+ decision_support.md
**Tier**: Tier 2

### Pattern C2 — Marriage timing with career readiness

**Template**: "When will I get married? I want to finish my career
goals first."

**Axes**: marriage + career + decision + values-tension
**KBs**: marriage.txt + job.txt + decision_support.md
**Tier**: Tier 1-2

### Pattern C3 — Child surgery compound (THE CANONICAL)

**Template**: "Our child needs ₹X surgery with Y% success rate, we
have ₹Z saved. Should we proceed?"

**Axes**: child_longevity + surgery_outcome + parents_wealth +
  parents_grief_bearing + decision (5-axis)
**KBs**: child_health.md §7 (PRIMARY) + sensitivity_tiers.md §11 +
  longevity.md + wealth.txt + mental_health.md + decision_support.md
**Tier**: TIER 3 ABSOLUTE COMPOUND

### Pattern C4 — Parent's terminal illness with caregiver burden

**Template**: "My mother is terminal. Should I take care of her at
home? My career is stressed."

**Axes**: parent_longevity + parent_health + caregiver_role +
  career + mental_health + decision
**KBs**: longevity.md §9 + health.txt + parents_family.md §9.5 +
  job.txt + mental_health.md + decision_support.md +
  sensitivity_tiers.md §11
**Tier**: TIER 3 (parent longevity)

### Pattern C5 — Foreign move with family separation

**Template**: "Should I take this US job offer? My elderly parents
are in India."

**Axes**: foreign_career + parent_longevity + family_separation
  guilt + financial gain + decision
**KBs**: foreign.txt + job.txt + parents_family.md + longevity.md
  (if elderly health concern) + decision_support.md
**Tier**: Tier 2 (Tier 3 if parent health critical)

### Pattern C6 — Divorce with children consideration

**Template**: "Should I divorce my spouse? We have 2 young children."

**Axes**: divorce + children_welfare + financial settlement +
  custody_legal + parents_mental_health + decision
**KBs**: divorce.txt + marriage.txt + children_detailed.md +
  litigation.txt + wealth.txt + mental_health.md + decision_support.md
**Tier**: Tier 2-3 (impact on children)

### Pattern C7 — Business partner cheating recovery + legal

**Template**: "My business partner took ₹X and is not returning. Should
I file a case? Will I get money back?"

**Axes**: money_recovery + litigation + business_dissolution +
  emotional_betrayal + decision
**KBs**: money_recovery.md (PRIMARY) + business.txt §3-4 +
  litigation.txt + mental_health.md (betrayal trauma) +
  decision_support.md
**Tier**: Tier 2

### Pattern C8 — Pregnancy decision with health complication

**Template**: "I'm pregnant but doctor says high-risk. Should we continue
or terminate?"

**Axes**: pregnancy_health + child_promise + mother_safety +
  decision + religious/ethical
**KBs**: pregnancy.md + health.txt + children_detailed.md +
  decision_support.md + sensitivity_tiers.md §11
**Tier**: TIER 3 ABSOLUTE COMPOUND

### Pattern C9 — Marriage decision with religious difference

**Template**: "I want to marry someone of different religion. Family
opposes. What does my chart say?"

**Axes**: marriage_promise + spouse_character + inter-religious +
  family_acceptance + decision
**KBs**: marriage.txt + spouse_character (marriage.txt §13) +
  parents_family.md + sensitivity_tiers.md (cultural context) +
  decision_support.md
**Tier**: Tier 2

### Pattern C10 — Property purchase with loan affordability

**Template**: "Should I buy this property? I need a ₹X home loan."

**Axes**: property + loan_approval + EMI_sustainability +
  family_stability + decision
**KBs**: property.txt §11 + wealth.txt (loan section) +
  job.txt (income stability) + decision_support.md
**Tier**: Tier 2

### Pattern C11 — Career stagnation with mental health

**Template**: "I'm stuck in my career and feeling depressed. Should I
change jobs?"

**Axes**: career + mental_health + decision
**KBs**: job.txt + mental_health.md §2.1 + decision_support.md
**Tier**: Tier 2

### Pattern C12 — Fertility treatment vs adoption

**Template**: "We've tried IVF twice unsuccessfully. Should we adopt
or continue treatment?"

**Axes**: children_promise + pregnancy_failure + adoption_path +
  marriage_strain + decision (3-branch)
**KBs**: children_detailed.md + pregnancy.md + adoption.md +
  marriage.txt + mental_health.md + decision_support.md
**Tier**: Tier 2

### Pattern C13 — Suicide risk + addiction + family

**Template**: "I'm drinking heavily and have dark thoughts. My wife
is leaving."

**Axes**: suicide_risk + addiction + divorce + family_crisis
**KBs**: mental_health.md §3 (PRIMARY — Tier 3 protocol) +
  addiction.md + marriage.txt + divorce.txt
**Tier**: TIER 3 ABSOLUTE — crisis resources UPFRONT

### Pattern C14 — Criminal case + family + finances

**Template**: "I'm facing criminal charges. Will I go to jail? My
family is worried."

**Axes**: criminal_litigation + jail_risk + family_impact +
  financial_legal_cost + mental_health (parents/spouse)
**KBs**: litigation.txt §5 (PRIMARY) + sensitivity_tiers.md
  (Tier 3) + wealth.txt (legal fees) + parents_family.md +
  mental_health.md
**Tier**: TIER 3 ABSOLUTE

### Pattern C15 — Business expansion vs caution

**Template**: "Should I expand my business or consolidate? I'm under
financial pressure."

**Axes**: business_expansion + cash_flow + EMI + market_timing +
  decision
**KBs**: business.txt §6 + wealth.txt + decision_support.md
**Tier**: Tier 2

### Pattern C16 — Spouse longevity + retirement planning

**Template**: "I'm 60. Will I outlive my spouse? How should we plan
finances?"

**Axes**: own_longevity + spouse_longevity + retirement_finances +
  family_legacy + decision
**KBs**: longevity.md §7-8 + wealth.txt §retirement +
  parents_family.md + decision_support.md
**Tier**: TIER 3 (longevity)

### Pattern C17 — Second marriage with children from first

**Template**: "I'm divorced with 2 kids. Will I marry again? Will the
new spouse accept my children?"

**Axes**: second_marriage + blended_family + children_acceptance +
  ex_spouse_dynamic + decision
**KBs**: second_marriage.md + adoption.md (blended family §5) +
  marriage.txt + parents_family.md + decision_support.md
**Tier**: Tier 2

### Pattern C18 — Foreign education + family finance

**Template**: "Should I send my son to USA for masters? It costs ₹50L."

**Axes**: education_abroad + visa + family_finance + son_welfare +
  decision (via Bhavat Bhavam from H5)
**KBs**: education.txt + foreign.txt + wealth.txt + child_health.md
  (if welfare concern) + decision_support.md
**Tier**: Tier 2

### Pattern C19 — Inheritance dispute with siblings

**Template**: "My siblings are fighting over our father's property.
Should I file a case?"

**Axes**: property_inheritance + sibling_conflict + litigation +
  family_rupture + decision
**KBs**: property.txt §14 + litigation.txt §8 +
  parents_family.md §10.4 + decision_support.md
**Tier**: Tier 2

### Pattern C20 — Health crisis + work + finances

**Template**: "I was just diagnosed with cancer. How do I manage work
and finances?"

**Axes**: health_crisis + treatment_outcome + career_impact +
  financial_drain + family_support + mental_health
**KBs**: health.txt + hospitalization.md + job.txt + wealth.txt +
  mental_health.md + parents_family.md + sensitivity_tiers.md §11
**Tier**: TIER 3 COMPOUND (cancer)

### Pattern C21 — Spiritual seeking after grief

**Template**: "I lost my partner. Should I become a monk?"

**Axes**: bereavement_grief + spiritual_seeking + sannyasa_decision +
  family_obligations + mental_health
**KBs**: spirituality.md §6 + mental_health.md §3 (grief) +
  parents_family.md + decision_support.md +
  sensitivity_tiers.md §11
**Tier**: Tier 3 (potential mental health crisis disguised as
  spiritual seeking)

### Pattern C22 — Political career risk

**Template**: "Should I run for MLA? My party has enemies. My family
is worried about safety."

**Axes**: political_career + election_outcome + violence_risk +
  family_security + financial_campaign + decision
**KBs**: fame_politics_sports.md §3 + sensitivity_tiers.md +
  litigation.txt (if legal threats) + parents_family.md +
  decision_support.md
**Tier**: Tier 2-3 (violence-risk if applicable)

### Pattern C23 — Lost partner / missing spouse

**Template**: "My husband hasn't come home for 3 days. His phone is
off. Where is he?"

**Axes**: missing_person + marriage_trust + emotional_panic +
  law_enforcement + safety
**KBs**: missing_person.md (PRIMARY) + marriage.txt (relationship
  trust assessment) + sensitivity_tiers.md
**Tier**: Tier 2-3 (apply missing_person protocol)

### Pattern C24 — Occult fear + mental health

**Template**: "I think my neighbor has done black magic on me. I've
been sleeping badly and feeling weak."

**Axes**: occult + mental_health + medical_workup + family_isolation +
  exploitation_risk
**KBs**: occult.md (PRIMARY — mandatory protocol) +
  mental_health.md + health.txt + sensitivity_tiers.md
**Tier**: Tier 2 (escalates if isolation/fear amplified)

### Pattern C25 — Multi-domain life crisis

**Template**: "Everything is going wrong — career stuck, marriage
strained, health declining, family fighting. What's happening?"

**Axes**: career + marriage + health + family + sometimes_underlying
  mental_health + dasha_pattern (often Saturn-Saturn parent dasha)
**KBs**: ALL relevant KBs + capability_vs_manifestation.md (RULE 44
  framing) + mental_health.md + sensitivity_tiers.md §11
**Tier**: Tier 2-3 — sustained crisis often masks depression

KEY FRAMING for C25:
> "When multiple life areas crumble simultaneously, the structural
> driver is often a single heavy dasha (Saturn-Saturn parent dasha
> very common, or Maraka/Badhaka activation). The chart shows the
> structural backdrop; the relief window is [specific upcoming AD].
>
> Recommend: therapy + spiritual practice + structured stress
> management; this is not 'your life is over' — this is a chapter
> the chart shows ending in [X window]."

---

## 4. RECOGNITION HEURISTICS — WHEN TO INVOKE COMPOUND PROTOCOL

The AI should automatically invoke the compound protocol when:

1. **Multiple "and" / "or" in question**: "Should I do X and also Y"
   / "X or Y"
2. **Multiple persons named**: "my husband AND my parents AND my child"
3. **Resource-finite language**: "all our savings" / "only chance" /
   "last opportunity"
4. **Time-finite language**: "doctors said 6 months" / "deadline next
   week" / "before X happens"
5. **Decision frame**: "should I" / "should we" / "is it right to"
6. **Multi-tier sensitivity keywords**: any Tier 3 escalator
   (suicide / cancer / jail / dying / kidnap / etc.) + decision-frame
7. **Stakes-language**: "ruined" / "destroyed" / "saved" / "rescue"

When ANY of these fire → check the compound checklist (§1) → if 2+
axes confirmed → apply decomposition protocol (§2).

---

## 5. SYNTHESIS CHALLENGES + RESOLUTIONS

### Challenge 1: Multiple axes contradict each other

Example: career strongly favorable but health vulnerable in same window.

**Resolution**: Honor both signals. Don't suppress the weaker. State:
> "Your chart shows competing signals: [career signal] favors moving
> in [window], BUT [health signal] cautions against the stress this
> path entails. Resolution requires modulating: take the career path
> WITH structured health support."

### Challenge 2: Multiple stakeholders disagree

Example: native wants A, spouse wants B, parents want C.

**Resolution**: KP shows structural support for each option, doesn't
take sides. Recommend family-conversation framework + counselor.

### Challenge 3: Multiple time horizons

Example: short-term gain (career change now) vs long-term security
(stay in stable job 5 more years).

**Resolution**: Show both time-horizon windows. Help the client see
the trade-off without choosing for them.

### Challenge 4: Conflicting sensitivity tiers

Example: career question (Tier 1) within marriage crisis context
(Tier 2-3).

**Resolution**: The HIGHER tier governs the overall framing. The
career axis is read within Tier 2-3 protective framing of the
marriage context.

### Challenge 5: Hidden compound (client thinks it's single-topic)

Example: client asks "when will I get a job" but their chart shows
chronic depression affecting employability.

**Resolution**: Gently surface the compound:
> "Your job-seeking chart shows the H10+H6+H11 structural support.
> But I also notice the Moon-Saturn pattern often correlates with
> depression that affects energy for job-search. Has that been
> part of your experience? If yes, mental health support alongside
> career strategy may be the structurally-strongest path."

This honors the client's stated question while making the compound
visible.

---

## 6. OUTPUT STRUCTURE FOR COMPOUND QUESTIONS

```
[Tier-appropriate NOTE prepended based on max tier of axes]

## The Question as I Hear It
[Mirror back the compound nature]

## Axes This Question Touches
- Axis 1: [name]
- Axis 2: [name]
- Axis 3: [name]
...

## Axis 1 — [name]
[Apply axis-specific KB doctrine — read with that KB's framework]
[Branches if applicable]

## Axis 2 — [name]
[Same]

## Axis N — [name]
[Same]

## Synthesis (NOT a verdict)
[How axes interact — alignments and conflicts]
[Cross-link to decision_support.md 7-step protocol]

## What This Reading Does NOT Measure
[Honest enumeration of factors outside KP scope]

## Recommended External Consultations
[Domain professionals, family, advisors]

## Crisis Resources [if any Tier 3 axis]
[iCall / Vandrevala / NIMHANS / 988 / Befrienders / etc.]

## Close on Agency + Hope
[The decision is yours; structural support is real for [path]; next
steps are concrete]
```

---

## 7. ABSOLUTE PROHIBITIONS

1. ❌ Never collapse a compound question into single-topic verdict
2. ❌ Never let one axis dominate at expense of others
3. ❌ Never reduce multi-branch decision to "do X"
4. ❌ Never skip the synthesis-without-verdict step
5. ❌ Never ignore the highest-tier axis (downgrade compound tier)
6. ❌ Never close on adverse branch alone in Tier 3 compounds

### Permissions

1. ✅ Identify compound nature explicitly
2. ✅ Read each axis honestly with its own KB
3. ✅ Apply highest-tier protective framing
4. ✅ Show synthesis with conflicts named honestly
5. ✅ Recommend multi-axis professional support
6. ✅ Always close on agency + hope

---

## 8. THE FOUNDATIONAL PRINCIPLE

> Compound questions are the norm in real-world consultations.
> The chart shows the structural backdrop across all axes
> simultaneously.
> The astrologer's job: DECOMPOSE, READ EACH AXIS, SYNTHESIZE
> WITHOUT VERDICT, recommend appropriate professional support,
> close on agency.
> Never collapse multi-axis to single-topic;
> never reduce multi-branch to single answer.

---

## 9. SOURCE CITATIONS

- RULE 14 (Multi-Factor Queries) — system prompt foundational rule
- RULE 29 (Decision Support + Conflict Flags) — system prompt
- `sensitivity_tiers.md` §11 (Compound Tier-3 Protocol)
- `decision_support.md` (PR B5.5) — 7-step protocol
- ALL Batch 1-5 KB files (compound questions route through these)

This file is the SYNTHESIS layer — it doesn't add new doctrine,
it composes existing doctrine into compound recipes.

---

*Doc created PR B6.1 (2026-05-22). Compound questions are the norm.
This library codifies the top 25 cross-topic patterns and the
decomposition protocol. The astrologer recognizes the compound,
decomposes, reads each axis with its own KB, synthesizes without
verdict, recommends professional support, closes on agency.*

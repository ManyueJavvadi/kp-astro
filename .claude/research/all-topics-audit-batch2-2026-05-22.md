# All-Topics KP Coverage Audit — BATCH 2
## Health · Mental Health · Hospitalization · Longevity · Child Illness · Addiction · Suicide Risk

**Date**: 2026-05-22
**Author**: Phase 1-2 audit (read-only, no code changes)
**Sensitivity**: Tier 3 HEAVY — most topics in this batch carry life-or-death stakes
**Status**: AUDIT — awaiting user approval before PR sequence

---

## Executive summary

Batch 2 is the **most ethically sensitive batch of the entire roadmap.** Every PR here interacts with life-or-death questions: cancer survival, suicide risk, child longevity, surgical outcomes, parent's final illness, addiction recovery. The Tier 3 framework (PR A2.0c / RULE 52) we shipped in Batch 1 is the protective scaffold; Batch 2 fills in the specific doctrine.

Critical context — **the existing health.txt + health_detailed.md are already strong** (~650 lines combined, 9 sections each). The framework exists. What's missing is:
1. **Dedicated longevity doctrine** (currently scattered; RULE 15 covers what NOT to predict but no positive structural framework)
2. **Suicide risk Tier 3 protocol** (mental_health currently in general.txt with RULE 45 universal framing — no crisis-intervention specific doctrine)
3. **Hospitalization recovery / discharge timing** (KP doctrine on H1+H5+H11 well-known but not in our KB)
4. **Child illness + congenital conditions** (the user's worked example — pregnant 32M+30F couple with newborn heart defect)
5. **Pregnancy complications / miscarriage risk** (in children_detailed.md briefly; needs dedicated doctrine)
6. **Addiction + recovery** (general.txt scatter only)
7. **Accident risk + post-trauma recovery** (brief in health.txt; needs depth)

| Topic | Engine | KB | Routing | detect_topic | Sensitivity tier | Grade |
|---|---|---|---|---|---|---|
| **health** (general) | ✅ {1,5,11} | ✅ 650 lines | ✅ → health.txt | ✅ | T2 default / T3 escalators | **A-** |
| **disease_risk** | ✅ {6,8,12} | ✅ (via health.txt §2) | ✅ → health.txt | ✅ | T2 default | **B** |
| **hospitalization** | aliased to disease_risk | 🟡 scattered | ✅ → health.txt | ✅ | T3 (ICU/critical care) | **C** |
| **surgery** | aliased to disease_risk | 🟡 22 lines in health_detailed §6 | ✅ → health.txt | ✅ | T3 (major surgery) | **C+** |
| **accident_risk** | aliased to disease_risk | 🔴 brief mentions | ✅ → health.txt | ✅ | T3 | **D** |
| **recovery** | ✅ aliased to health | 🟡 in health_detailed §5 | ✅ → health.txt | ✅ | T2-T3 | **C** |
| **mental_health** | 🔴 no canonical entry | 🟡 18 lines in health_detailed §7 + RULE 45 | ✅ → general.txt | ✅ | T2 default / T3 (suicide) | **C-** |
| **suicide_risk** | 🔴 not its own topic | 🔴 nothing dedicated | 🔴 | 🔴 | T3 ABSOLUTE | **F** |
| **addiction** | 🔴 routes to general | 🔴 nothing dedicated | ✅ → general.txt | ✅ | T2-T3 | **D** |
| **longevity** (own/spouse/parent/child) | 🔴 not its own topic | 🔴 mentioned in RULE 15 + capability_vs_manifestation only | 🔴 | 🔴 | T3 ABSOLUTE | **F** |
| **child_illness** | 🔴 not its own topic | 🔴 not addressed | 🔴 | 🔴 | T3 ABSOLUTE | **F** |
| **pregnancy_complications** | 🔴 | 🔴 brief in children_detailed | 🔴 | 🔴 | T2-T3 | **D** |
| **congenital_conditions** | 🔴 | 🔴 not addressed | 🔴 | 🔴 | T3 ABSOLUTE | **F** |
| **chronic_disease_management** | aliased to health | 🟡 age-watch matrix in health.txt §8 | ✅ | T2 | **B-** |

**Headline**: 7 of 14 topics need substantial new dedicated doctrine. The most-critical gaps (suicide_risk, longevity, child_illness, congenital_conditions) all overlap with the user's child-surgery worked example.

---

## Per-domain analysis

### 1. HEALTH (general) — Grade A-

#### What's there
- Engine: `TOPIC_HOUSE_MAP_CANONICAL["health"] = {relevant:{1,5,11}, denial:{6,8,12}, primary_cusp:1}` (PR A2.0a wellness framing — questions like "will I recover" now correctly oriented)
- KB: health.txt (360 lines, 9 sections) + health_detailed.md (293 lines, 12 sections) = 653 lines
- Routing: `health → health.txt`, deep-dive `health_detailed.md` loaded too
- Detection: ✓
- Tier framework: T2 default, T3 escalators in sensitivity_tiers.md for cancer/terminal/ICU/coma

#### Existing strengths
- KP Health Triad (H1/H6/H8/H12) thoroughly documented
- Disease nature by H6 sub lord (9 planets covered)
- Surgery indicators (§6 of detailed)
- Reproductive function (male + female depth, PR A1.3-fix-7)
- Age-watch matrix (metabolic risk by age 32+/35+/40+)
- Chronic vs acute distinction
- Mental health basics (§7 of detailed — 18 lines)
- Ethical doctrine (§11 — "NEVER predict death" — RULE 15 anchor)

#### Gaps for general health
- **Diet/lifestyle remedies per disease** — currently absent; KP has remedy doctrine for specific health
- **Specific common diseases catalogue** — diabetes/BP/thyroid/PCOS each have specific KP signatures; current §8 is generic
- **Pediatric health** — adult-focused; child health is a gap (Section 4 below)
- **Geriatric health** — old-age specific patterns (Saturn period, Sade Sati Phase 3, etc.)

**Recommended fix**: Light polish only (~3-4 hours). General health KB is strong.

---

### 2. HOSPITALIZATION + DISCHARGE TIMING — Grade C

#### What's there
- Routing: `hospitalization → health.txt` (aliased to disease_risk)
- KB content: mentioned in health.txt §6 (H12 = hospitalization possible) but no recovery/discharge specific section

#### Canonical KP doctrine (from web research — NOT in our KB):
- Hospitalization promised: H12 activation + H6/H8 link
- ICU / critical care: H12 + H8 + Mars/Saturn affliction
- Discharge timing: H1 (vitality returns) + H5 (= 12th-from-H6 = "end of disease") + H11 (= "end of expenses/weakness in body")
- **Recovery dasha**: when dasha shifts from disease significators (H6/H8/H12) to recovery significators (H1/H5/H11)
- Some practitioners cite H2+H11 for discharge specifically (release from confinement)

#### Gaps
- No dedicated "when will I be discharged?" doctrine
- No "ICU vs general ward" KP signatures
- No "recovery dasha scanning" procedure
- No post-discharge home-care prediction
- Tier 3 protective framing not yet specifically tuned for hospitalization

**Recommended fix**: Add dedicated `hospitalization.md` (~6-8KB) with discharge-timing doctrine.

---

### 3. SURGERY — Grade C+

#### What's there
- health_detailed.md §6 — 22 lines covering surgery indicators + type by planet + recovery
- Routing: `surgery → health.txt`

#### Gaps
- **Surgery success rate prediction** — currently has "recovery good if H1+H5+H11 in next bhukti" but no probability framework
- **Pre-surgery muhurta** — KP muhurta exists for surgery timing; not addressed in health files
- **Post-surgery complication prediction** — H8 CSL + H12 chain analysis missing
- **Major vs minor surgery** — no doctrine separating cosmetic from life-threatening
- **Specific surgeries**: cardiac, brain, transplant, cancer-resection — each has specific patterns
- **Pediatric surgery** (your example — child cardiac surgery) — not addressed; high Tier 3 sensitivity

**Recommended fix**: Expand `surgery` section in health_detailed.md OR new `surgery.md` (~8KB). Mid-priority.

---

### 4. CHILD ILLNESS / CONGENITAL CONDITIONS — Grade F (YOUR WORKED EXAMPLE)

#### Background — the user's canonical case
> "Couple, 32M + 30F, child born 2024 with congenital heart defect, doctor says <1yr without ₹40L surgery, surgery has 60% success rate. Should they proceed?"

This is a **multi-axis compound question** the current system cannot handle properly:
1. **Child's longevity** — Markesh/Maraka via parent's chart (Bhavat Bhavam)
2. **Surgery success probability** — child's H1+H5+H11 vs H6+H8+H12 chain
3. **Parents' financial capacity** — H2+H11 of each parent (₹40L)
4. **Decision under uncertainty** — should they pay for 60%-success treatment?
5. **Parents' grief-bearing dasha** — H4+Moon for each parent (mental state)

#### Current state
- **NOTHING** dedicated for child illness via parent's chart
- Bhavat Bhavam doctrine exists (RULE 13 + bhavat_bhavam.md) but not applied to child health specifically
- children_detailed.md (315 lines) covers fertility / promise / IVF but NOT child's illness or longevity
- The 5-axis compound framework doesn't exist; only universal RULE 14 (multi-factor)

#### Canonical KP doctrine needed
- Child's body/health = native's H8 (= 4th-from-H5)
- Child's disease = native's H10 (= 6th-from-H5) ← wait, need to verify: 6th-from-H5 = H10
- Actually correctly: child's H6 (disease) = native's H10 (6 + 5 - 1 = 10)
- Child's H8 (longevity stress) = native's H12 (8 + 5 - 1 = 12)
- Child's H1 (body) = native's H5
- Confidence floor for indirect reading: ~70% (per RULE 13 + Bhavat Bhavam doctrine)

#### Gaps (everything for this compound question)
- No dedicated `child_health.md` KB
- No engine helper to do the 5-axis compound (parent chart + child chart + financial + decision)
- No Tier 3 escalation protocol specifically for "child won't live past age X" questions
- No "ground truth from child's own chart" prompting (recommend getting child's birth data)
- No worked example of the canonical case in gold_standard_examples.md

**Recommended fix**: This is THE biggest single PR in Batch 2. Create dedicated `child_health.md` (~12-15KB):
- Section 1: Reading child's health via parent's chart (Bhavat Bhavam, RULE 13 + confidence floor)
- Section 2: Child's longevity (Markesh/Maraka via H8-from-H5 = H12 of native)
- Section 3: Congenital conditions (H5 + H8 + H12 affliction patterns)
- Section 4: Surgery outcome for the child (cross-link to surgery.md)
- Section 5: The 5-axis compound reading (the user's worked example codified)
- Section 6: Decision-support framing (Tier 3 ABSOLUTE — never name death dates, always show both branches, recommend pediatric specialist)
- Section 7: When to recommend child's own chart (precision floor without it ~70%)

**Effort**: ~8-10 hours (the largest doctrine PR in Batch 2). **Highest emotional impact + biggest gap.**

---

### 5. LONGEVITY (own + spouse + parent + child) — Grade F

#### What's there
- RULE 15 (absolute prohibition on death-date prediction)
- capability_vs_manifestation.md (PR A1.19) — mentions but doesn't expand
- general.txt §8 has Maraka/Badhaka doctrine briefly

#### Canonical KP doctrine (from my Batch 1 web research):
- **Longevity assessment**:
  - H1 sub lord signifies H12 → short life (Alpayash, ~33 years and below)
  - H1 sub lord signifies H1, H5, H9, or H10 → long life (Poornyash, 66+ years)
- **Maraka houses** (death-inflicting): H12 (12th from H1), H7 (12th from H8), H2 (12th from H3)
- **Badhaka houses** — MORE harmful than Maraka. When assessing longevity, check Badhaka first
- **Badhaka by sign type**:
  - Movable signs (Aries/Cancer/Libra/Capricorn): H11 is Badhaka
  - Fixed signs (Taurus/Leo/Scorpio/Aquarius): H9 is Badhaka
  - Dual signs (Gemini/Virgo/Sagittarius/Pisces): H7 is Badhaka
- **Short life signals**: H1 sub lord signifies {6,8,12} with Maraka/Badhaka lord involvement
- **Accidental death**: H1 sub lord signifies H8 with Maraka/Badhaka
- **Death in unknown place / hospital**: H1 sub lord signifies H12 alongside Maraka/Badhaka

#### Gaps
- No dedicated `longevity.md` KB
- No engine helper for longevity scoring
- Spouse longevity (via H7 Bhavat Bhavam) not addressed — important for "will I outlive my husband?" questions
- Parent longevity (via H4 mother / H9 father) referenced briefly; not synthesised
- Child longevity (via H5) — Tier 3 absolute — not addressed

#### Critical doctrinal framing
**RULE 15 already prohibits naming death dates.** This file is about reading LONGEVITY STRUCTURE — short/medium/long life potential, vulnerability windows, mitigation by lifestyle — without ever stating a date.

**Recommended fix**: Create `longevity.md` (~10-12KB) with explicit Tier 3 absolute rules:
- Section 1: KP longevity doctrine (Alpayash / Madhyayasha / Poornyash brackets)
- Section 2: Maraka houses (without dates)
- Section 3: Badhaka houses (by sign type)
- Section 4: Vulnerability windows (Maraka dasha periods — frame as "extra-care periods")
- Section 5: Spouse / parent / child longevity via Bhavat Bhavam (cross-link)
- Section 6: Tier 3 ABSOLUTE protective framing — what's allowed vs prohibited
- Section 7: "I've been told I have X months to live" — how to respond

**Effort**: ~6-8 hours. **Tier 3 highest sensitivity — needs explicit user review before merging.**

---

### 6. MENTAL HEALTH + SUICIDE RISK — Grade C- (mental_health) / F (suicide_risk)

#### What's there
- mental_health → general.txt routing (KB is generic, not dedicated)
- health_detailed.md §7 — 18 lines on mental health (Moon afflicted, Saturn-on-Moon, Rahu-on-Moon, Ketu-on-Moon)
- RULE 45 (mental affliction protection — Tier 2 framing for depression/addiction)
- sensitivity_tiers.md §1 lists suicide-risk keywords as Tier 3 escalator

#### Existing strengths
- RULE 45 is well-crafted for depression/anxiety (not crisis-level)
- Sensitivity tier framework correctly flags Tier 3 escalation for suicide keywords

#### Critical gap — suicide risk
- No dedicated suicide-risk Tier 3 protocol
- Web research (Vedic + KP): suicide indicators include Moon-Saturn-Mars conjunction + H8/H12 affliction + Mercury malefic
- Per Vedic: "suicide tendencies via 8th cusp sub lord in star of planet connecting to Maraka/Badhaka/H8/Mars" (KP-specific — from earlier research)
- Currently the system would apply RULE 45 (which is for depression-level) — insufficient for active suicide ideation

#### Mental health depth gaps
- Depression vs anxiety vs OCD vs schizophrenia — no differentiation in KP signatures
- Treatment response prediction (medication, therapy, hospitalization)
- Family role / support system reading
- Specific patterns: bipolar (Moon-Mars-Saturn cycles), schizophrenia (Mercury severely afflicted by Rahu)

**Recommended fix**: Create `mental_health.md` (~8-10KB) with:
- Section 1: Mental health KP framework (Moon/Mercury/H1/H4/H12)
- Section 2: Common conditions by planetary signature (depression / anxiety / bipolar / OCD / schizophrenia / panic)
- Section 3: Suicide risk Tier 3 PROTOCOL (mandatory) — never predict suicide; immediate crisis resources cited; refer to professional help; structural reading framed carefully
- Section 4: Treatment response (therapy + medication windows via dasha)
- Section 5: Recovery timing (Jupiter/H5/H11 favorable)
- Section 6: Tier 3 ABSOLUTE escalation protocol

**Effort**: ~5-6 hours. **CRITICAL safety — needs explicit user review.**

---

### 7. ADDICTION + RECOVERY — Grade D

#### What's there
- Routing: `addiction → general.txt`
- No dedicated KB; only RULE 45 mention

#### Canonical KP doctrine (from web research):
- **Addiction trigger planets**: Rahu (primary), Mars, Saturn — these afflict H6 (health), H2 (mouth/throat) and H12 (loss)
- **H12 + Rahu**: substance abuse, fluid intoxication, escape behaviors
- **H6 + H8 + Rahu/Mars/Saturn**: addiction-driven health crisis
- **Jupiter as antidote**: strong Jupiter in chain → recovery potential (Jupiter = wisdom, divine grace)
- **Recovery indicators**: H1 sub lord signifying H5 + H11 (rebuilding life) without H12 active

#### Gaps
- No addiction-specific KB
- No "will my addiction recover" timing
- No relapse risk doctrine
- Family member's addiction (via Bhavat Bhavam) — not addressed
- Tier 2-3 framing not addiction-specific

**Recommended fix**: Create `addiction.md` (~6KB):
- Section 1: KP addiction doctrine (Rahu/Mars/Saturn + H6/H2/H12)
- Section 2: Common addictions by planet (alcohol = Moon-Venus; drugs = Rahu; smoking = Mars-Saturn)
- Section 3: Recovery timing (Jupiter favorable + H5/H11)
- Section 4: Relapse risk (dasha-windows of Rahu/Mars/Saturn return)
- Section 5: Family member's addiction (via Bhavat Bhavam)
- Section 6: Tier 2-3 framing — never shame; recommend rehabilitation + therapy

**Effort**: ~4-5 hours.

---

### 8. ACCIDENT RISK + POST-TRAUMA RECOVERY — Grade D

#### What's there
- Brief mentions in health.txt (Mars-related disease) + health_detailed.md
- Routing: `accident_risk → health.txt`

#### Gaps
- No dedicated accident-risk framework
- No vehicular vs workplace vs home accident distinction
- No post-trauma recovery doctrine (PTSD, physical rehab)
- No accident timing windows

**Recommended fix**: Add ~3KB section to health.txt OR add to hospitalization.md. Low priority.

---

### 9. PREGNANCY COMPLICATIONS / MISCARRIAGE — Grade D

#### What's there
- children_detailed.md covers fertility + child promise (315 lines)
- No dedicated pregnancy-complication or miscarriage doctrine

#### Canonical KP doctrine (from web research)
- **Miscarriage risk**: H5 + Jupiter affliction + Mars/Saturn conjunction on H5
- **H8 affliction**: C-section, high-risk pregnancy, surgical birth, delivery delay
- **Multiple miscarriages**: H5 lord severely afflicted + Karaka Jupiter afflicted in D1 + D9
- **Specific triggers**: Mars-Saturn conjunction in 2nd/3rd trimester = abrupt complications

#### Gaps
- No dedicated pregnancy-complications doctrine
- No miscarriage-risk scoring
- No "will this pregnancy go to term" framework
- Cross-link to child_health.md (Section 4 above) missing

**Recommended fix**: Add `pregnancy.md` (~5KB) OR extend children_detailed.md with pregnancy complications section. Medium priority.

---

## Cross-cutting Batch 2 findings

### Sensitivity tier audit confirms protective framework solid
PR A2.0c (sensitivity_tiers.md + RULE 52) holds up under Batch 2 scrutiny. Tier 3 escalation keywords already cover: suicide / kill myself / survive / terminal / cancer / ICU / coma / congenital / how long will [X] live. Adequate for Batch 2.

### RULE 15 is the foundational doctrine for all of Batch 2
Every Tier 3 PR in Batch 2 must INVOKE RULE 15 ("NEVER predict death") explicitly. The new doctrine files should reinforce, not weaken, RULE 15.

### Bhavat Bhavam (RULE 13) is critical for relative-health questions
"My mother has cancer", "my father's longevity", "will my child survive surgery" — all use parent's chart with house-from-house translation. This is RULE 13 territory but applied with maximum care. The user's child-surgery example specifically lives here.

### Sensitivity tier framework needs slight extension
- Add explicit Tier 3 sub-framework for "compound questions" — the user's child-surgery example combines multiple Tier 3 topics. Current sensitivity_tiers.md doesn't have a compound-tier-3 escalation protocol.
- Recommended: add §11 to sensitivity_tiers.md covering compound Tier 3 questions specifically.

---

## Recommended PR sequence for Batch 2

**Ship in this order** (each independently verifiable + revertable):

```
TIER 1 — FOUNDATION (foundation for Batch 2 doctrine)

  B2.0a  Topic routing additions:
         Add canonical topics: longevity, suicide_risk, addiction,
         child_illness, pregnancy_complications, congenital_conditions
         Add 15+ aliases for detect_topic + TOPIC_TO_FILE
         Effort: ~2-3h

  B2.0b  Sensitivity_tiers.md §11 compound-Tier-3 protocol
         For multi-axis questions (child surgery + parent finances + decision)
         Effort: ~1-2h

TIER 2 — DEDICATED DOCTRINE (the big ones)

  B2.1   child_health.md  (~12-15KB)  ← THE USER'S EXAMPLE
         - Bhavat Bhavam reading child via parent's chart
         - Child longevity (5-axis compound)
         - Congenital conditions framework
         - Surgery outcome for child (Tier 3 max)
         - The canonical worked example codified
         Effort: ~8-10h

  B2.2   longevity.md  (~10-12KB) — TIER 3 SENSITIVE
         - Alpayash / Madhyayasha / Poornyash framework
         - Maraka + Badhaka doctrine
         - Vulnerability windows (without dates)
         - Spouse / parent longevity via Bhavat Bhavam
         - Absolute protective framing
         Effort: ~6-8h

  B2.3   mental_health.md  (~8-10KB) — TIER 3 (suicide risk)
         - Conditions by planetary signature
         - Suicide risk Tier 3 protocol
         - Treatment response timing
         - Recovery doctrine
         Effort: ~5-6h

  B2.4   hospitalization.md  (~6-8KB)
         - Hospitalization promise (H12 + H6/H8)
         - Discharge timing (H1 + H5 + H11)
         - ICU / critical care framing
         - Post-discharge home-care
         Effort: ~4-5h

TIER 3 — POLISH

  B2.5   addiction.md  (~6KB)
         - Substance abuse signatures (Rahu/Mars/Saturn + H6/H2/H12)
         - Recovery timing
         - Relapse risk
         - Family addiction via Bhavat Bhavam
         Effort: ~4-5h

  B2.6   pregnancy.md  (~5KB)
         - Miscarriage risk (H5 + Jupiter affliction)
         - High-risk pregnancy (H8)
         - Delivery timing
         - Pregnancy complications by trimester
         Effort: ~3-4h

  B2.7   surgery expansion in health_detailed.md  (~3-5KB added)
         - Major vs minor surgery
         - Cardiac / brain / cancer / transplant specifics
         - Surgery success rate (cross-link to child_health.md for pediatric)
         - Post-surgery complications
         Effort: ~3-4h

  B2.8   accident risk + chronic disease management
         expansion in health.txt  (~3-4KB)
         Effort: ~2-3h
```

**Total Batch 2**: 10 PRs, ~38-52 hours
**Tier 3 sensitivity**: 4 of 10 PRs touch absolute-care doctrine (B2.1 / B2.2 / B2.3 / B2.4)

---

## Critical pre-shipping checks for Batch 2

Before ANY Tier 3 PR ships, mandatory:

1. **Real AI baseline test for each Tier 3 topic** (longevity, suicide_risk, child_illness) — same pattern as Batch 1
2. **User review** of:
   - longevity.md (the most-sensitive single file)
   - mental_health.md §3 suicide protocol
   - child_health.md §5 (canonical worked example)
3. **Regression test** on existing baselines (cancer survival, criminal jail risk) — confirm Batch 2 PRs don't weaken Batch 1 Tier 3 framing
4. **Real-world worked example** baseline for the user's child-surgery scenario — capture before-and-after to prove the doctrine fires correctly

---

## What I'm NOT proposing in Batch 2

- Engine changes (CLAUDE.md sacred — only TOPIC_HOUSE_MAP_CANONICAL additions, no new computation paths)
- Modification to existing health.txt or health_detailed.md (only EXPANSIONS where called out)
- Frontend changes (KB + routing only)
- New tabs / UI changes

---

## What I need from you to proceed

1. **Approve Batch 2 PR sequence** (10 PRs in priority order — or pick a different order)
2. **Approve high-sensitivity files for first review**: longevity.md, mental_health.md §3, child_health.md §5 will be the most critical to read before merge
3. **Optional**: tell me if there's a specific real-world example you want as a worked-baseline case (the child-surgery scenario will be default; want me to add others?)
4. **Order preference**:
   - Option A: B2.0a foundation → B2.1 child_health (your example first) → B2.2 longevity → ... (covers your example first)
   - Option B: B2.0a → B2.3 mental_health (suicide risk first — highest universal sensitivity) → B2.2 longevity → ...
   - Option C: I pick the order — default to A

Reply with the order + any specific files you want to review first.

---

## Sources used in this audit

- KP Astrology Learning — H6 / H7 / H8 / H10 cusp pages (Batch 1 research, still applies)
- Divine Creation India — "How to Judge Longevity - KP" (Krishnamurti Publications)
- KP Astrology Pro — health prediction framework
- Red Astrologer — KP Medical Astrology + case studies
- RVA Forum — recovery from disease KP significators
- AstroSubhash — KP Prashna for disease recovery
- Vedic Raj Astrology — finding diseases + timing of recovery
- Vinay Bajrangi — drug addiction astrology indications
- Bejan Daruwalla — astrological reasons for abortion/miscarriage
- Psychologically Astrology — prediction of suicidal tendencies
- KP Astro App — health in KP astrology
- Mayam Matrix Astro — suicidal tendencies in astrology
- KSK KP Readers I-VI (foundational doctrine)
- Existing internal KB files: health.txt, health_detailed.md, capability_vs_manifestation.md, sensitivity_tiers.md, bhavat_bhavam.md, children_detailed.md, parents_family.md

All new doctrine in Batch 2 PRs will cite these sources verbatim per the Batch 1 precedent.

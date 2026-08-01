# Match Tab — Content & Reasoning Spec (research, 2026-08-01)

## ✅ IMPLEMENTATION STATUS (updated 2026-08-01, PR A1.13 + A1.13b)

**Shipped to develop + main:**

| Item | Status | Where |
|---|---|---|
| Gana table swap fix (Shatabhisha ↔ Uttara Bhadrapada) | ✅ | `compatibility_engine.NAKSHATRA_GANA` |
| "Dhanishta" spelling bug (broke Tara/Nadi/Rajju/Yoni for ~3.7%) | ✅ | `_canonical_nak()` in `_build_chart` |
| Vedha porutham (12 pairs + mutually-vedha triad) | ✅ | `south_indian_matching.calc_vedha` |
| Dina porutham | ✅ | `south_indian_matching.calc_dina` |
| Dashakoota 10-porutham assembly (reuses Ashtakoota results) | ✅ | `south_indian_matching.build_dashakoota` |
| **Dual verdict** (with / without Rajju+Vedha blockers) | ✅ | same |
| Papa Samyam per-chart + comparison (Lagna/Moon/Venus) | ✅ | `south_indian_matching.compute_papa_samyam` |
| Chart strength screen | ✅ | `match_individual_screen.assess_chart_strength` |
| Mental/emotional screen | ✅ | `…assess_mental_stability` |
| Progeny / putra dosha screen | ✅ | `…assess_progeny` |
| Longevity indicators + cross-chart balance | ✅ (indicators only, NOT Ayurdaya) | `…assess_longevity_indicators` |
| Nadi parihara (4 cancellation rules) | ✅ | `dosha_cancellation.nadi_cancellation` |
| Bhakoot parihara | ✅ | `…bhakoot_cancellation` |
| Gana directional exception | ✅ | `…gana_exception` |
| Manglik parihara (10 rules, was 3) | ✅ | `…manglik_cancellation` |
| Frontend: Stage-1 Individual gate | ✅ | `MatchIndividualGate.tsx` |
| Frontend: both koota systems + dual verdict | ✅ | `MatchKootaSystems.tsx` |
| Frontend: traditional per-chart screens | ✅ | `MatchTraditionalScreen.tsx` |
| Frontend: doshas with parihara | ✅ | `MatchDoshaParihara.tsx` |

**Deliberately NOT implemented (with reason):**
- **Full classical Ayurdaya** (Pindayu/Amsayu/Nisargayu) — intricate,
  disputed between authorities, and a wrong lifespan figure inside a
  marriage consultation is actively harmful. We publish *indicators* and
  label them as such.
- **D7 Saptamsha** divisional chart — the engine has no D7 computation
  yet; progeny is read from 5th house/lord + Jupiter instead. Adding D7
  is a separate, self-contained piece of work.
- **Tara "Janma = full credit"** — genuinely disputed between authorities
  (we give 0.75). Left as-is pending a ruling from a practising astrologer
  rather than silently changing existing verdicts.

**Open question for dad:** which affliction flags he treats as fatal vs
tolerable, what mitigations he accepts, and whether he uses a weighted
Papa Samyam scheme (we use a transparent 1-point-per-hit count, max 15).

---


**Goal:** make the Match tab a *self-contained* surface an astrologer can read
once and confidently counsel a client from — no need to open any other tab or
tool. Grounded in KP (KSK 7th-CSL method) + traditional Ashtakoota/dosha
literature. Research/design only — no engine changes proposed here without a
separate approved, dad-validated PR.

---

## 0. The governing principle (dad's rule)

> "First see the individual charts. If those are good, then see the match."

This is a **sequencing rule**, confirmed across KP and classical sources:

1. **Marriage must be promised in each chart individually before compatibility
   is meaningful.**
   - KP: each person's **7th cuspal sub-lord must signify 2/7/11** → promised;
     if it signifies 1/6/10 → denied/delayed.
   - Classical: 7th house + 7th lord, Venus & Jupiter (karakas), and the
     **D9/Navamsa** must support marriage and a good married life.
2. **If either chart denies marriage or shows a serious affliction**
   (separation/widowhood yoga, hard Manglik with no cancellation, weak D9),
   **no guna score can rescue it.** You cannot match two people into a marriage
   their own charts don't grant.
3. Therefore: **Gate 1 = individual promise → Gate 2 = compatibility →
   Gate 3 = timing.** Never lead with the 36-guna number.

Design implication: the tab is a **funnel**, and the guna score is *secondary*,
not the headline.

---

## 1. The funnel (top-level IA of the tab)

```
STAGE 0  Snapshot (both people, side by side)
STAGE 1  INDIVIDUAL CHART — per person, TWO parts   ← the missing gate
         PART A  MARITAL-WORTHINESS / AFFLICTION SCREEN  (dad's real gate — "should it happen")
           A1 Withdrawal-from-bonding / detachment  (Ketu or Saturn on 7th;
              afflicted Moon & Venus; 7th CSL leaning to 6/8/12)
           A2 Separation / divorce proneness  (7th lord in 6/8/12; 7th hit by
              Mars/Rahu/Ketu/Saturn + weak Venus; Rahu–Ketu on 1–7 axis)
           A3 Harm-to-spouse / Vaidhavya yoga  (Mars/Mangal in 8th; Rahu in
              7/8/12; 8th lord in 7th or 7th lord in 8th/12th; maraka 2/7)
           → each flag shown WITH its mitigations/cancellations; verdict =
             recommend / caution / do-not-recommend (regardless of match)
         PART B  MARITAL PROMISE & QUALITY  ("will it happen / be good")
           B1 Is marriage promised?          (KP 7th CSL → 2/7/11)
           B2 Quality & longevity of married life (7th/8th, benefics)
           B3 Manglik in THIS chart WITH cancellation check
           B4 D9/Navamsa promise (7th lord dignity, Venus, vargottama)
           B5 Individual marriage-timing window (this person's dasha)
         → per-person GATE: if PART A is red → tab de-emphasizes the match
           entirely ("this chart alone is not recommendable"); PART B refines.
STAGE 2  COMPATIBILITY  (framed as "only meaningful because both passed Stage 1")
           2a KP cross-match (each partner as significator for the other)  ← KP differentiator
           2b Ashtakoota 36 (8 kootas) — with meaning, not just numbers
           2c Dosha screen WITH cancellations (Manglik / Nadi / Bhakoot / Gana)
           2d D9 compatibility (both Navamsas compared)
           2e Karaka layer (Venus both, Jupiter for husband, Mars temperament)
STAGE 3  TIMING (joint) — best wedding window = overlap where BOTH dashas support
STAGE 4  Longevity & harmony outlook ("if it happens, will it last & be happy")
STAGE 5  Astrologer notes (copy-paste) + "what to tell the client" per section
```

---

## 2. Stage-by-stage: data → reasoning → presentation → client line

### STAGE 0 — Snapshot
- **Data:** each person's Moon rashi + nakshatra (+ pada), Lagna, Lagna lord,
  current MD→AD, and a one-line readiness verdict.
- **Present:** two compact identity cards. Show **borderline flags** (e.g. Moon
  within ~1° of a nakshatra boundary → Gana/Tara/Nadi are sensitive).

### STAGE 1 — Individual marital promise (per person) — THE NEW GATE

**1a — Is marriage promised? (KP)**
- Data: 7th CSL 4-step chain; does it signify **2, 7, 11**? Denial if **1, 6, 10**.
- Reason: sub-lord gives the final verdict. PROMISED / promised-with-caveats /
  denied-or-delayed.
- Client line: "Marriage is promised in his/her own chart" (or the caveat).

**1b — Quality & longevity of married life**
- Data: condition of **7th & 8th** houses (8th = sustenance/longevity of the
  marriage, *aayu of the tie*); malefics in/aspecting 7th; benefic (Jupiter/
  Venus) support of 7th; 2nd house (family continuity).
- Separation/divorce screen: **7th lord in 6/8/12**, **Rahu–Ketu on the 1–7
  axis**, **Mars + another malefic on 1/4/7/8/12**, 7th lord combust/debilitated.
- Second-marriage hint: 7th house/lord in dual signs (Gemini/Virgo/Sag/Pisces).
- Reason → "steady / workable-with-effort / fragile — watch X."
- Client line: plain-language, non-alarming ("the tie is steady" vs "needs
  conscious effort around …").

**1c — Dosha in THIS chart (with cancellation)**
- Manglik: Mars in **1/2/4/7/8/12** (from Lagna; also check from Moon & Venus).
- **Always run cancellation** (see §4). Show BOTH the raw flag AND whether it's
  cancelled — never a bare "Manglik: yes/no."
- Client line: "Technically Manglik, but cancelled because …" is what wins trust.

**1d — D9 / Navamsa promise**
- Data: 7th lord dignity in D9 (own/exalted/debilitated/combust), Venus in D9,
  **vargottama** planets (esp. 7th lord & Venus), D9 lagna.
- Reason: D9 = *quality/durability* vs D1 = *circumstance/timing*. A weak D9
  downgrades even a promised D1.
- Client line: "the marriage the chart grants is durable / needs the D9 caveat."

**1e — Individual marriage timing**
- Data: which of THIS person's MD/AD/PAD periods activate 2/7/11 significators.
- Present a per-person "marriage-favorable windows" mini-timeline.

**1f — Per-person verdict + GATE**
- Green (promised + good + no hard dosha) / Amber (promised but fragile) /
  Red (denial or serious affliction).
- **Gate rule:** if either is Red, the tab visually *de-emphasizes* the guna
  score and says "resolve individual promise first" — mirrors dad's flow.

### STAGE 2 — Compatibility (only now)

**2a — KP cross-match (the differentiator)**
- Each partner treated as the other's spouse-significator; 7th-CSL harmony
  across the two charts; H7 occupant/aspects both ways; the TIER verdict.
- This is the part AstroTalk & guna-only apps DON'T do — foreground it.

**2b — Ashtakoota 36 (8 kootas)**
- Fix the Gana table bug first (Uttara Bhadrapada = Manushya, Shatabhisha =
  Rakshasa). For each koota show the score **and one line of meaning for THIS
  couple** (e.g. "Bhakoota 7/7 — prosperity & health of the union supported").
- Frame as secondary confirmation, subordinate to 2a (KSK view).

**2c — Dosha screen WITH cancellations (what astrologers most appreciate)**
- Manglik match: both Manglik → mutual cancellation; one-sided → check parihara.
- **Nadi dosha + its 6 exceptions** (same rashi diff nakshatra; same nakshatra
  diff pada; different rashi & nakshatra; etc.).
- **Bhakoot dosha + cancellation** (Moon-sign lords are friends, or same
  nakshatra lord).
- **Gana exception** (Manushya-boy + Rakshasa-girl is *not* a hard 0).
- Rule: **never show a dosha without its cancellation verdict.**

**2d — D9 compatibility** — compare both D9 7th houses / Venus / Jupiter.

**2e — Karaka layer** — Venus (both, harmony), Jupiter (traditionally husband
significator in a woman's chart), Mars (drive/temperament fit).

### STAGE 3 — Timing (joint)
- Best wedding window = overlap where **BOTH** charts' dashas support 2/7/11
  (already computed as joint AD overlap — keep, and label which houses each
  side's period lord signifies).

### STAGE 4 — Longevity & harmony outlook
- "If it happens, will it last & be happy" (H8 CSL, 7th lord, malefics on 7th)
  — already present; keep, and tie back to Stage 1b per person.

### STAGE 5 — Astrologer notes + client language
- Copy-paste consultation notes block (mirror the Horary tab's "Astrologer
  notes · copy-paste ready").
- A plain-language **"what to tell the client"** line under each verdict, so the
  astrologer can relay confidently without re-deriving.

---

## 3. Reasoning principles to encode (the "how we reason")

1. **Promise before compatibility** (dad's rule).
2. **Cancellation before dosha** — a flagged dosha without its parihara check is
   amateur; the cancellation logic is the single biggest trust signal.
3. **KP verdict > guna score** — KSK treats Ashtakoota as secondary; lead with
   the 7th-CSL cross-match.
4. **D9 confirms/tempers D1** — circumstance vs durability.
5. **Sub-lord gives the final verdict** — always show the CSL chain as evidence.
6. **Show the WHY, not just the score** — every verdict carries its evidence
   chain so the astrologer can defend it to the client.
7. **Flag borderline inputs** — borderline Moon nakshatra / borderline CSL /
   birth-time sensitivity, because Gana/Tara/Nadi/CSL can swing.

---

## 3a. ⚠️ REGIONAL CORRECTION (2026-08-01) — we were building the WRONG system

**Dad is a Telugu (Andhra) astrologer. South India does NOT use the North
Indian Ashtakoota-36 as its primary frame.**

| | North Indian (what our tab leads with) | South Indian / Telugu (dad's system) |
|---|---|---|
| Koota system | Ashtakoota — 8 kootas, 36 points | **Dashakoota — 10 poruthams** |
| Highest weight | Nadi (8) | **Rajju** — checked FIRST, before the total |
| Failure mode | aggregate score ≥18 | **Rajju & Vedha are HARD BLOCKERS** — reject regardless of score |
| Individual screen | (none standard) | **PAPA SAMYAM** — per-chart affliction load, compared |

The 10 poruthams: dinam, ganam, yoni, rasi, rasyadhipathi, rajju, vedha,
vasya, mahendram, stree deergham. (rasi≈Bhakoota, rasyadhipathi≈Graha Maitri,
so several overlap our existing 8 under different names.)

### PAPA SAMYAM — this is almost certainly dad's individual-chart gate

Matches the user's observed behaviour exactly ("boy's family brings girl's
chart → he reads HER chart alone → 'her chart itself is not good, I won't
recommend even with more points'").

- **Papa grahas:** Sun, Mars, Saturn, Rahu, Ketu.
- **Papa houses:** **1, 2, 4, 7, 8, 12.**
- **Counted THREE times: from Lagna, from Moon, AND from Venus.**
- Produces a **papa (affliction) score per person, individually.**
- **Comparison rule (traditional):** the two loads should be equal, or the
  BOY's may be higher. **If the GIRL's papa exceeds the boy's → not
  recommended**, regardless of guna score. (Report as the classical
  convention; let the astrologer judge. Dad may apply it symmetrically.)
- This is the mechanism that produces a "reject on the individual chart
  alone" verdict — which no guna total can override.

**Our gap:** `_check_kuja_dosha` counts **Mars only, from Lagna only**. Papa
Samyam needs Sun/Saturn/Rahu/Ketu too, and from Moon + Venus as well.

### Rajju / Vedha as hard blockers
- We compute **Rajju** but render it as "Extended koots" *below* the 36-guna
  hero. In Telugu practice Rajju is checked **first** and same-Rajju is a
  rejection-grade signal (husband's longevity).
- **Vedha porutham is not computed at all.** Certain nakshatra pairs are
  mutually obstructive → traditionally reject regardless of score.

---

## 3b. The AFFLICTION SCREEN in detail (Stage 1 Part A) — dad's actual gate

⚠️ **Scope correction (2026-08-01):** A1/A2/A3 below were derived from the
user's illustrative examples and are only ~3 of ~12 real dimensions. The full
individual-chart screen is:

1. **Papa Samyam** (§3a) — the primary South Indian individual gate. ❌ missing
2. **Kuja/Manglik from Lagna + Moon + Venus.** ⚠️ we do Lagna only
3. **Ayurdaya** — longevity balance across the two charts; premature
   widowhood. ❌ missing
4. **Progeny capacity** — 5th house/lord, Jupiter, **D7 Saptamsha**; putra
   dosha = 5th lord in 6/8/12. ⚠️ we have H5 CSL only, no D7
5. **Mental/emotional stability** — Moon, Mercury, Jupiter afflictions
   (Moon+Saturn, Moon+Rahu/Ketu, Mercury+Rahu). ❌ missing
6. **Overall chart strength** — lagna & lagnesh affliction, debilitated lagna
   lord, Venus combust/debilitated, **Papakartari yoga** on 7th. ❌ missing
7. **Dasa Sandhi** check. ❌ missing
8. **A1 detachment / withdrawal from bonding.** ⚠️ partial
9. **A2 separation-proneness.** ⚠️ partial
10. **A3 Vaidhavya / harm-to-spouse.** ⚠️ partial
11. **Vedha porutham** (hard blocker). ❌ missing
12. **Rajju** as first-class blocker. ⚠️ present but de-emphasised

**Open question for dad (do not guess):** which of these he actually weighs,
in what order, and what he treats as an absolute reject.


Clarified 2026-08-01 by user: dad does NOT check "is marriage promised". He
screens each chart for **intrinsic marital affliction** — a tendency this person
carries into ANY marriage. If present, he declines to recommend the match no
matter how many gunas score. Observed behaviour: boy's family brings girl's
chart → he reads the GIRL's chart alone → "her individual chart is not good, I
wouldn't recommend marriage even with more points / good compatibility."

### A1 — Withdrawal from bonding / emotional unavailability
(the behaviour the user specifically remembered)
- **Ketu in / aspecting 7th** — canonical: detachment, no emotional connection,
  cannot express emotions to the partner, lack of mutual empathy/bonding.
- **Saturn in 7th** (esp. Saturn–Ketu conjunction) — coldness, restriction,
  duty-over-affection, delay + emotional distance.
- **Afflicted Moon** (with Saturn/Rahu/Ketu; debilitated) — impaired emotional
  bonding capacity.
- **Afflicted Venus** (combust, debilitated, with malefics) — impaired affection
  / relating capacity.
- **KP layer:** 7th CSL signifying **6/8/12** (detachment/loss houses) rather
  than 2/7/11.

### A2 — Separation / divorce proneness
- **7th lord in 6, 8, or 12.**
- 7th house/lord severely afflicted by **Mars, Rahu, Ketu, Saturn** *with a weak
  Venus*.
- **Rahu–Ketu across the 1–7 axis** (strongest separation signature).
- 7th lord combust / debilitated; Mars + another malefic on 1/4/7/8/12.
- Dual-sign 7th house/lord → multiple-marriage tendency.

### A3 — Harm to spouse / Vaidhavya (widowhood) yoga
- **Mars in 8th**; **Rahu in 7th/8th/12th.**
- **8th lord in 7th**, or **7th lord in 8th / 12th.**
- Maraka (2nd/7th) afflictions touching the spouse axis.

### MANDATORY framing rules for A1–A3
1. **No single placement decides it.** Every source insists the whole chart,
   its strength, the D9, and dashas must be weighed. One flag ≠ verdict.
2. **Always show mitigations** — benefic (Jupiter) aspect, dignified/exalted
   Venus, own-sign malefic, D9 strength, Manglik parihara. A flag WITHOUT its
   mitigation check is misleading.
3. **Never auto-reject a real person.** Output is a *structural tendency* +
   evidence, escalated to the astrologer's judgment. Keep the existing TIER-3
   "structural tendencies only — not a verdict for or against the match"
   disclaimer. This is both the correct astrology and the ethical line: these
   readings affect real people's marriages.
4. Present as: FLAG → evidence chain → mitigations present → net severity →
   plain-language line the astrologer can say to the family.

---

## 4. Dosha + cancellation quick-reference (for B3 / 2c)

**Manglik (Mangal dosha)** — Mars in 1/2/4/7/8/12 (from Lagna; also Moon, Venus).
Cancellations (parihara):
- Both partners Manglik → cancels.
- Mars in own sign (Aries/Scorpio) or exalted (Capricorn); Mars exalted in D9.
- Mars conjunct or aspected by **Jupiter** (or Mercury) → dosha subdued.
- **Saturn** aspecting the Manglik Mars.
- Specific house-sign combos (e.g. Mars in 2nd in Gemini/Virgo; 12th in
  Taurus/Libra; 4th in Aries/Scorpio).
- Jupiter–Venus in lagna or 7th.
- Yogakaraka Mars (Cancer/Leo lagna) → set the diagnosis aside.
- Age maturation (~28–32) softens raw Mars.

**Nadi dosha** — same Nadi. Exceptions that cancel: same rashi + different
nakshatra; same nakshatra + different pada; different rashi *and* nakshatra;
certain 7th-house planetary conjunctions; (and the usual authority-specific set).

**Bhakoot dosha** — 6/8, 2/12, 5/9 Moon-sign relation. Cancels if the two
Moon-sign lords are mutual friends, or both share the same nakshatra lord.

**Gana dosha** — worst is Deva–Rakshasa. Manushya–Rakshasa is *not* a hard 0
(directional exception for Manushya-boy + Rakshasa-girl).

---

## 5. Gap analysis vs current Match tab

Present today (from screenshots): KP 7th-CSL for both + denial houses + TIER
verdict; Ashtakoota 8 kootas; extended kootas (Mahendra/Stree Deergha/Rajju);
Rajju dosha; parental/in-laws signals; "if it happens will it last" (H8 CSL,
7th lord); best wedding window (joint AD overlap); Nadi/Gana/Manglik badges.

**Missing / to add (prioritized):**
1. **Stage 1 — per-person "individual marital promise" panel, shown FIRST**
   (dad's gate). Highest value. We already compute the 7th-CSL promise + D9 per
   person; this is mostly *re-composition & placement*, not new math.
2. **Manglik WITH cancellation reasoning** per chart (today it's a bare badge).
3. **Dosha-cancellation engine** — Nadi exceptions, Bhakoot cancellation, Gana
   exception — shown explicitly. (Biggest "astrologer appreciates" win.)
4. **Individual marriage-timing window** per person (not only the joint overlap).
5. **Separation/divorce-yoga screen** per chart.
6. **D9 side-by-side compatibility** (we compute D9 per person; add the cross).
7. **"What to tell the client" plain-language layer + copy-paste notes.**
8. **Funnel/gate visual** (Stage 1 pass/fail gating Stage 2) + borderline flags.
9. **Fix the Gana table bug** (Uttara Bhadrapada ↔ Shatabhisha swap) — separate
   approved PR; correctness prerequisite for anything that shows a guna number.

---

## 6. Sources
- KP 7th-CSL marriage method: astrochart.in KP approach; kpastrology.astrosage
  four-step theory.
- Individual promise + D9 primacy: astrotalk separation-yoga; jagannathhora
  navamsa-marriage; vaya.so 7th-in-navamsa.
- Doshas & cancellations: jagannathhora mangal-dosha-cancellation; astrosight
  dosha guides; astroyogi gana-koota (directional exception); anytimeastro
  tara/gana.
- Beyond-36-gunas checklist: atozpandit; astrotales; roxyapi gun-milan guide.

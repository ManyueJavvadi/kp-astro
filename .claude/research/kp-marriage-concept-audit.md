# KP Marriage Matching — Concept-Level Audit (2026-08-01)

Deep research pass across KP sources, then an audit of what our engine
actually implements. Research/diagnosis only — no code changed by this
document. Sacred-region changes below need explicit approval + dad's
validation.

---

## 🔴 FINDING 1 (CRITICAL) — we have "denial" defined backwards

**What we do** (`compatibility_engine._h7_sublord_promise`):

```python
MARRIAGE_DENIAL_HOUSES = {1, 6, 10, 12}
denial_intersection = sigs & MARRIAGE_DENIAL_HOUSES
has_denial = bool(denial_intersection)          # PRESENCE-based
```

Denial fires whenever the chain *touches* a denial house.

**What the sources say — denial is the ABSENCE of promise, not the
presence of a denial house.** Three independent sources, near-verbatim:

> "for marriage to take place either one of the above three significators
> **2 or 7 or 11** has to be signified by the seventh cuspal sublord for
> the promise of marriage to take place… If not, marriage will never take
> place." — CA Partha Pratim Mitra (LinkedIn)

> "Marriage can be denied if the 7th cusp sub lord signifies **only**
> negative houses (1, 6, 10) **without signification of any** of the
> marriage houses (2, 7, 11)."

> "…this applies **only when the 12th house signification stands alone
> without the supporting influence** of the marriage-promising houses
> (2, 7, 11)."

**Why this is the root cause of the verdict collapse.** A 4-step chain
spans 5–9 of 12 houses, so it almost always touches one of {1,6,10,12}.
Presence-based denial therefore fired on **9/9** charts measured, which
made every "good" verdict branch unreachable and flattened the whole
tab to "Caution". PR A1.13f decoupled the *symptom* (denial vetoing the
couple verdict). **This is the disease.**

**Correct rule:**
```
promise = sigs ∩ {2,7,11}
denial  = (promise is empty)            # NOT bool(sigs ∩ {1,6,10})
```
Houses 1/6/10 then grade the *quality* (friction / break risk), they do
not gate occurrence.

---

## 🔴 FINDING 2 — H12 is not a denial house in KP

Our constant includes 12. The comment justifies it as "isolation /
separation / loss". But KP reads the 12th house in the *marriage* context
as **bed pleasures / expenditure / distance**:

> "The 12th house governs expenditure, **bed pleasures**, and spiritual
> pursuits… the 7th lord in the 12th is **not automatically negative**.
> If the 7th cuspal sub-lord connects to 2-7-11, marriage occurs and the
> 12th house placement simply **describes the circumstances** (foreign
> spouse, expenditure, or distance) rather than denying the marriage."

> "The 5th house (romance), 8th house (physical union), and **12th house
> (bed pleasures) add secondary support to marriage.**"

The canonical denial trio is consistently **1, 6, 10**. H12 appears in a
denial role only in *combination* ("8 and 12 alongside 6 or 1 or 10 →
litigation after marriage"), i.e. as a modifier, never as a standalone
denier.

**Note:** removing 12 alone does NOT fix the collapse (measured: denial
still fired 9/9 without it) — Finding 1 is the real fix. But 12 is
doctrinally wrong in that set regardless, and it currently penalises
charts for a house that KP counts as *supporting* intimacy.

---

## 🟠 FINDING 3 — the denial houses are not equal

> "The **10th house is most important for denying** marriage, while the
> **6th house is least important**."

We treat {1,6,10,12} as a flat set. Weighting (10 > 1 > 6) is a real
refinement once Finding 1 is fixed.

Also: 1/6/10 are described as predicting **"divorce or break in
marriage"** — i.e. they speak to the *durability* of the marriage, not
whether it happens. That is a different question from promise, and we
currently conflate the two.

---

## 🟠 FINDING 4 — promise threshold may be stricter than canonical

We require **2 AND 7 AND 11** for `PROMISE_FULL`. Sources split:

- "If the 7th cusp sub-lord signifies all three (**or at least 7 and
  11**), marriage is promised."
- "**either one** of 2 or 7 or 11 has to be signified… for the promise of
  marriage to take place."

So the *minimum* promise bar in KP is **any one of 2/7/11**, with all
three being the strong case. Our graded tiers (Full/Partial/Weak) express
this reasonably — but only if Finding 1 is fixed, because today a Weak
promise + any denial-house touch reads as effectively denied.

---

## 🟡 FINDING 5 — missing concept: KPRM complementarity

The practitioner method ("KP Relationship Method" / scientific KP
matching) contains a principle we do **not** model at all:

> "One chart should have **balancing/supporting significations of the
> other's negative significations** and vice versa."

> "…find a boy chart with the mixed destiny but **not exactly as of
> hers** — to balance negative significations rather than matching
> superior destinies."

This is *complementarity*, not similarity. Our couple score rewards
resonance and cross-match (i.e. sameness/linkage) but has no notion of
one chart **covering the other's weakness**. Conceptually different, and
arguably the heart of KP matching.

**Related rule we also lack:**
> "Rejection occurs if either party shows complete negative marital
> destiny **or the partner's destiny is worse than the native's**."

A comparative-quality gate — structurally similar to Papa Samyam's
balance test, but KP-native.

---

## 🟡 FINDING 6 — compatibility significator set may be 2/5/7/11

The practitioner compatibility step compares both charts on:
- Moon sign **rulers and sub-lords**
- Lagna sign **rulers and sub-lords**
- **Day lord**
- Running Dasa/Bukthi
- **2, 5, 7, 11 significators** ← includes **5**

We use {2,7,11} for promise, and compute H5 separately (`h5_analysis_*`)
without folding it into the compatibility comparison. H5 = love/romance;
"if the 5th cuspal sublord denotes 7, 11 or 2, promise of love marriage
is sure."

We compare Ascendant + H7 sub-lord friendship, but **not Moon sign
lord/sub-lord**, and **not day lord**, between the two charts.

---

## ✅ WHAT WE GET RIGHT

- **7th CSL as the deciding factor** — correct and central.
- **4-step significator chain** (planet → star lord → sub lord → star
  lord of sub) — matches canonical KP hierarchy (Level 1 = house occupied
  by star lord … Level 4 = houses owned by the planet).
- **A/B/C/D strength tiers** — canonical, not invented.
- **Canonical cross-match** (each partner's CSLs reaching the other's
  marriage houses) — matches the KPRM cross-check.
- **Joint dasha/bhukti overlap for timing** — correct KP timing method.
- **Ruling planets** computed and used — correct.
- **KP kept primary, traditional layers subordinate and labelled** —
  matches KP doctrine (KPDP "explicitly excludes doshas").
- **Promise separated from couple fit** (PR A1.13d) — matches the
  practitioner flow (Step 1 native's destiny, Step 2 partner's destiny,
  Step 3 compatibility).
- **Sookshma-level precision windows** — beyond most KP software.

---

## PRIORITISED FIX LIST

| # | Fix | Severity | Sacred? |
|---|---|---|---|
| 1 | **Redefine denial as absence of 2/7/11**, not presence of 1/6/10/12 | 🔴 critical — root cause of verdict collapse | YES — `_h7_sublord_promise` |
| 2 | **Remove 12 from `MARRIAGE_DENIAL_HOUSES`**; treat as circumstance/bed-comfort modifier | 🔴 doctrinal error | YES |
| 3 | Split "promise of occurrence" from "durability/break risk" (1/6/10 grade the latter) | 🟠 conflation | YES |
| 4 | Weight denial houses (10 > 1 > 6) | 🟠 refinement | YES |
| 5 | Add KPRM **complementarity** (does one chart cover the other's weakness?) | 🟡 missing concept | new, additive |
| 6 | Add "partner's destiny not worse than native's" comparative gate | 🟡 missing rule | new, additive |
| 7 | Add Moon sign lord/sub-lord + day lord to the cross-chart comparison | 🟡 gap | new, additive |
| 8 | Consider H5 in the compatibility significator set | 🟡 gap | needs ruling |
| 9 | Cap the downgrade cascade (7 independent one-tier drops on a 4-level scale) | 🟡 design | moderate |

**Items 1–4 must be one PR with dad present** — they change every
verdict. Items 5–8 are additive and lower risk.

---

## THE ONE QUESTION FOR DAD

> When the 7th cuspal sub-lord signifies, say, H2 and H11 **and also** H6
> and H12 — is that a **denied/failed** marriage, or a **promised
> marriage with friction**?

The sources say the second (promise exists whenever 2/7/11 is touched at
all; 1/6/10 then describe break-risk). Our engine currently says the
first. His answer settles Findings 1–3 in one go.

---

## SOURCES
- CA Partha Pratim Mitra — *Promise of marriage and second marriage… in KP* (LinkedIn)
- astrochart.in — *Marriage Prediction: The KP Approach*
- bestkpastro.com — *Marriage Matching through Scientific KP System*
- kpastrology.astrosage.com — KP rules, four-step theory, fundamental principles
- kpastroapp.com — Relationships in KP astrology
- jagannathhora.com — Nadi dosha + KP verification; 5-8-12 formula; divorce indicators
- roxyapi.com — KP complete guide
- IndiaDivine — KPDP rules in marriage matching (Kuppuganapathi, KSK disciple)

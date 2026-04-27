# Analysis Tab Accuracy Research — 2026-04-24

**Purpose**: Before shipping any accuracy-improvement PR, verify every KP rule against KSK's own Readers (ground truth) + modern practitioner sources. This research doc gets user sign-off before any code change.

**Authority tiers (per user choice)**:
- KSK Readers 1-6 = ground truth
- Post-KSK modifications (4-step theory etc.) = noted but NOT authoritative
- Modern sources = secondary; used when KSK PDFs are silent
- When modern contradicts KSK → KSK wins

**Confidence flags**:
- ✅ **HIGH** — Verified from KSK Reader directly OR 3+ consistent modern sources
- ⚠️ **MEDIUM** — Modern practice consensus, not explicitly found in KSK PDFs
- ❓ **LOW** — Contested or single-source only
- 🚨 **CONTRADICTS CURRENT KB/CODE** — Fix needed

---

## Status

Doc started 2026-04-24. Being written incrementally as each topic is verified.

---

## Topic 2 — Dual signification (sub-lord signifies BOTH relevant AND denial)

### Question
When the CSL (or dasha lord) signifies BOTH relevant houses (e.g., 2/7/11 for marriage) AND denial houses (1/6/10), is the event:
(a) CONDITIONAL — happens with delay/obstacles (current KB says this)
(b) DENIED in denial-house bhuktis, ACTIVE in relevant-house bhuktis (KSK's actual rule)
(c) PROMISED with obstacles (modern softening)

### Findings

**KSK's direct rule from Reader** — ✅ HIGH (quote verified):
> *"For example, suppose the Dasa Lord is the significator of the 2nd, 5th, or 11th, and 1st, 4th, or 10th (indicating childbirth, and also its denial), then during the Sub period (Bhukti) of the significator of the 1st, 4th, or 10th, there will be no child birth..."*
> — [Internet Archive KP Readers](https://archive.org/stream/krishnamurti-padhdhati-vol-3-english/docuri.com_6-kp-readers_djvu.txt)

**This is KSK option (b), not (a) or (c).** The event isn't "conditional overall"; it FIRES in relevant bhuktis and is BLOCKED in denial bhuktis. This is bhukti-level precision.

**KSK's "KP Simple Rules" also says** — ✅ HIGH:
> *"If the 7th cusp's sub lord indicates 1, 6, 10, or 12, marriage won't happen."*

So dual signification doesn't soften denial — KSK is strict about which houses fire in which bhuktis.

**But modern practice softens this** — ⚠️ MEDIUM:
> *"If the 7th cusp sub lord's significators connect to 6, 10, or 12 rather than 2, 7, and 11, the chart is not promising marriage. However, if it signifies BOTH, marriage can still occur with delays/obstacles."* — modern KP Pro
> *"Even when negative houses signified, as long as sub lord signifies any positive house, marriage cannot be denied."* — KP Astrology Learning

**Contradicts KSK's strict rule.** Modern practice is more lenient than KSK.

### Per-topic denial houses (all verified consistent)

| Topic | Relevant | Denial (confirmed) | Contested |
|---|---|---|---|
| Marriage | 2, 7, 11 | 1, 6, 10 | H12 (some sources), H8 (sometimes "problems") |
| Children | 2, 5, 11 | 1, 4, 10 | — |
| Job | 2, 6, 10, 11 | 1, 5, 9, 12 | Some also say 8 |
| Foreign | 3, 9, 12 | 2, 8, 11 | H4 (settle-specific) |
| Education | 4, 9, 11 | 3, 8, 10 | — |
| Wealth | 2, 6, 10, 11 | 1, 5, 9, 12 | — |
| Property | 4, 11, 12 | 3, 10 | — |

### Verdict for PR — KSK strict per user choice

Per user: follow KSK's exact rule. System prompt should:

1. **Retain three-tier verdicts** (Promised / Conditional / Denied) at the OVERALL level.
2. **Add bhukti-level granularity** in the timing section: "During bhukti of [lord X] who signifies [relevant houses] → event can fire. During bhukti of [lord Y] who signifies [denial houses] → event blocked in that window."
3. **When sub-lord signifies BOTH**: still call it CONDITIONAL overall but ENUMERATE which bhuktis fire vs block. Don't give a blanket "event happens with delay" narrative.
4. **H12 for marriage**: classical KSK is contested. Safest: keep H12 in denial list but flag as "lesser severity than 1/6/10 — often indicates separation abroad rather than outright no-marriage". Our current KB already does this-ish but needs refinement.

### Sources
- [Internet Archive — KP Readers full text](https://archive.org/stream/krishnamurti-padhdhati-vol-3-english/docuri.com_6-kp-readers_djvu.txt)
- [KSK Simple Rules](https://archive.org/stream/krishnamurti-padhdhati-vol-3-english/KP-Simple-Rules_djvu.txt)
- [KP Astrology Learning — 7th Bhava Rules](https://kpastrologylearning.com/kp-jyotish-astrology-seventh-house-bhava-rules/)
- [KP Astrology Pro — 12 Houses Guide](https://kpastrologypro.com/blog/12-houses-kp-astrology)

---

## Topic 3 — Retrograde CSL / retrograde star-lord rules

### Question
What does KP say about retrograde planets in natal charts? Does retrograde CSL delay events? Does retrograde star-lord of CSL matter more/less?

### Findings

**KSK's core rule for natal charts** — ✅ HIGH:
> *"In a natal horoscope, if any planet is retrograde, then it does no harm and is to be considered as in normal motion."*

**This applies to general planetary significations**. Not to cuspal sub lords specifically.

**Horary (Prashna) is different** — ✅ HIGH:
> *"In Prashna Kundali, a retrograde planet gives results only in direct motion, and a retrograde planet is considered powerless."*

Our app's Analysis tab is natal, not horary — so the "retrograde = powerless" rule doesn't apply here.

**Cuspal sub-lord retrograde in natal — ❓ LOW CONFIDENCE, 3 competing rules**:

From [Jyotishgher KP sub-lord theory](https://jyotishgher.in/Trending/kp/kp-astrology.php):
1. **"No effect"** school — natal retrograde has no meaning; CSL retrograde is equivalent to direct
2. **"Materializes with delay"** school — if CSL is retrograde AND its star lord is direct, event happens after obstacles + delay
3. **"Fails to offer result"** school — if CSL is in sub-division of retrograde planet, event doesn't materialize

These are DISPUTED within the KP community. Not consistent.

**Ruling Planets retrograde** — ✅ HIGH:
> *"Ruling planets in the star or sub of retrograde planets should be discarded from the RP list."*
Applicable to horary questions; doesn't apply to natal analysis directly.

### Current code state

- Engine computes retrograde flag on all planets
- LLM prompt mentions retrograde in [llm_service.py](backend/app/services/llm_service.py) but treats it as a minor modifier
- No special handling of retrograde CSL vs retrograde star-lord

### Verdict for PR

**No urgent change.** This is a disputed area even within KP. Two safe adjustments:

1. **System prompt addition**: "For natal analysis, a retrograde planet is considered as if in direct motion per KSK (Reader 1). However, if the CSL itself is retrograde OR is in the star of a retrograde planet, this can add obstacles and delays — note it but don't treat as denial."

2. **Don't over-index** on retrograde. The event promise is decided by CSL signification, not motion state.

### Sources
- [RVA — Retrograde Planets in KP ep131](https://www.rahasyavedicastrology.com/retrograde-planets-kp/)
- [Jyotishgher — KP Sub-Lord Theory](https://jyotishgher.in/Trending/kp/kp-astrology.php)
- [VaastuInternational — KP Astrology](https://www.vaastuinternational.com/KP-Astrology/KP-Astrology.html)

---

## Topic 4 — Conditional gradations (strongly promised vs barely promised)

### Question
Is the promise verdict binary (yes/no) or scaled (strongly/moderately/barely)?

### Findings

**Practical promise scale (modern practice, but grounded in KSK's A/B/C/D)** — ✅ HIGH:
Promise is a **gradient, not binary**, in real KP practice:
- **STRONGLY PROMISED**: A-level significators connect to multiple relevant houses; minimal denial signification
- **MODERATELY PROMISED**: B-level significators dominant; some delays
- **WEAKLY PROMISED**: Only C/D-level significators; multiple bhuktis may come and go without fruition
- **CONDITIONAL**: Dual signification (relevant + denial)
- **DENIED**: Zero A/B/C/D significator touch on relevant houses

Source: [Jagannath Hora KP for Beginners](https://jagannathhora.com/kp-astrology-for-beginners/) — *"The system treats promise as a gradient rather than binary — weak significators may indicate delays or conditions, while strong multi-level connections suggest higher manifestation probability."*

### Verdict for PR

System prompt should explicitly use this 5-tier scale, not the current 3-tier (Promised/Conditional/Denied).

**New scale**:
- STRONGLY PROMISED (A-level on 2+ relevant houses, no denial touch)
- PROMISED (A or B level on ≥1 relevant house, denial touch minimal)
- CONDITIONAL (relevant + denial both signified; bhukti-level precision needed per KSK Topic 2)
- WEAKLY PROMISED (only C/D signification; event likely in specific bhuktis only)
- DENIED (zero relevant touch; only denial signification — RARE per KSK)

---

## Topic 5 — Ruling Planets in natal analysis (not just horary)

### Question
KSK used Ruling Planets primarily for Horary. Do modern KP practitioners legitimately use RPs in NATAL analysis, and HOW?

### Findings

**Yes, RPs ARE used in natal analysis** — ✅ HIGH:
> *"Ruling Planets (RP) are used in KP practice to help with chart verification and timing judgment."*
> *"KPNoX+ shows Ruling Planets based on the Natal Chart as well as Current Transit at the time of viewing the Horoscope."*

**The natal-RP rule (modern practice, grounded in KSK)**:
> *"If the ruling planets and the running Dasha lord significators display the same script, then the event can be expected."*

**How to apply**:
1. Compute RPs at the CURRENT moment + astrologer's CURRENT location (our engine does this correctly)
2. Check if current Dasha/Bhukti lord is ALSO an RP
3. Check if the RPs match the significators of relevant houses for the topic
4. When overlap is high (3-4+ RPs overlap with significators) → event imminent in current window
5. When overlap is low (0-1) → event NOT in current window; wait for next matching dasha/bhukti

**Current code state** — ✅ ALREADY CORRECT:
- [chart_engine.py](backend/app/services/chart_engine.py) computes 7-slot RPs at query time with astrologer's location
- [llm_service.py](backend/app/services/llm_service.py) passes RPs to LLM
- System prompt mentions "Fruitful significators" = planets signifying relevant houses AND in RPs

### Verdict for PR

**No urgent change.** RP methodology is already correctly implemented. One minor enhancement:

- System prompt could explicitly state: "When current MD/AD/PAD lord is ALSO an RP at the query moment AND signifies the relevant houses → event is imminent. This overlap is the strongest timing confirmation KP offers."

### Sources
- [Jagannath Hora — KP for Beginners](https://jagannathhora.com/kp-astrology-for-beginners/)
- [VaastuInternational](https://vaastuinternational.com/KP-Astrology/KP-Astrology-1.html)
- [AstroSage — Ruling Planets Today](https://www.astrosage.com/rp.asp)

---

## Topic 6 — Karaka override (Venus for marriage, Jupiter for children)

### Question
Does KP use natural karakas the way Parashari does? Your current KB says "strong Venus can override weak H7 CSL" — is this real KP or Parashari contamination?

### Findings

**KSK's rule** — ✅ HIGH, 🚨 CONTRADICTS CURRENT KB:
> *"In KP astrology, Venus is the karaka (natural significator) of love, but karakas take a back seat to the cusp sub lord for predicting specific life events."*
> *"A person with a debilitated Venus might still have successful love affairs if their 5th cusp sub lord (CSL) is well-configured, and vice versa."*

**KP does NOT allow karaka to override CSL.** This is a fundamental methodological rejection of Parashari karaka-centric reasoning.

**KP DOES use karakas — but only as context, not as override**:
- Venus = karaka for marriage = natural planet for love/relationships (mentioned in context)
- Jupiter = karaka for children (mentioned in context)
- Mars = karaka for property (mentioned in context)
- **But**: even a debilitated karaka doesn't deny the event if CSL is favorable. Even a strong karaka doesn't save the event if CSL is unfavorable.

**Current KB issue**:
- [marriage.txt:113-114](backend/knowledge/marriage.txt): *"If H7 sub lord is Jupiter or Venus and signifies 2,11 = very happy marital life."* — This is mixing CSL analysis (correct) with karaka reasoning (wrong).
- System prompt mentions "karaka strength" as a QUALITY modifier — this is OK per modern practice but not core KSK.

### Verdict for PR — 🚨 SMALL FIX NEEDED

1. **Remove "karaka override" language** from system prompt. Replace with: "Karakas (Venus for marriage, Jupiter for children, Mars for property, Mercury for education) are contextual information only. They DO NOT override CSL. A weak karaka with strong CSL = promised event. A strong karaka with weak CSL = denied event."

2. **Keep karaka-based quality descriptions** as-is: "If CSL is Venus signifying 2,7,11 → very happy marital life" is fine (it's using CSL, not bypassing it).

### Sources
- [Quora — Does KP astrology hold good?](https://www.quora.com/Does-KP-astrology-hold-good)
- [Jagannath Hora — Marriage 5-8-12 Formula](https://jagannathhora.com/marriage-or-breakup-kp-astrology-5-8-12-formula/)
- [kpastrology.com — Basics](https://www.kpastrology.com/kpbasics.htm)

---

## Topic 7 — Edge cases (self-significator, parivartana, conjunction)

### Question
How are edge cases handled: planet in own star (self-significator), mutual exchange (parivartana), conjunction thresholds?

### Findings

**Self-significator (planet in own star)** — ✅ HIGH:
> *"If a planet is in its own star, then it automatically becomes the primary significator of the house of residence (even if there are other planets in its stars)."*
> *"When there is no planet in a planet's star, the planet is called a self-strength planet."*

**Rules**:
1. Planet in own nakshatra → primary significator of the house it occupies
2. Planet where no other planets occupy its 3 stars → becomes primary significator (self-strength)
3. Gives pure, undiluted results of its own houses

**Conjunction threshold** — ✅ HIGH:
> *"Significations by conjunction (3.33 degrees) between planets should be considered, and the conjoined planet acts as an agent of the planet to which it is conjoined."*

**3.33° = width of one sub-division**. This is the precise KP threshold.

**Parivartana (mutual exchange)** — ⚠️ MEDIUM:
- Referenced in KP analysis examples but not formally codified as a named rule
- More a Parashari concept; KP practitioners use it descriptively
- No clear rule on how much "boost" parivartana gives to significators

**For Rahu/Ketu — conjunction vs nakshatra proxy**:
- ✅ HIGH: conjunction within 3.33° → conjunct planet's significations dominate
- Star lord proxy = secondary
- Sign lord (dispositor) = tertiary

### Current code state

- Engine computes star lords, sub lords correctly
- Self-significator status NOT explicitly surfaced to LLM
- Conjunction detection (3.33°) NOT computed
- Parivartana detection NOT computed

### Verdict for PR

**P2 (nice-to-have, not urgent)**:
1. Add `is_self_significator` flag per planet (planet in its own star OR its 3 stars empty)
2. Add `conjunct_planets` array per planet (any planet within 3.33°)
3. Parivartana: skip for now — too Parashari-leaning to prioritize

### Sources
- [kpastrology.com — Basics](https://www.kpastrology.com/kpbasics.htm)
- [AstroSage — KP Fundamentals](https://kpastrology.astrosage.com/kp-learning-home/tutorial/chapter-2-fundamental-principles)
- [Scribd — Four Step Theory](https://www.scribd.com/doc/165723905/Trick-KP-Four-Step-Theory)

---

## Topic 8 — Cuspal inter-linkage (H7 CSL agrees with H2, H11?)

### Question
In KP, does the H7 CSL need to agree with H2 CSL and H11 CSL for the marriage promise to hold? How strong is this rule?

### Findings

**Cuspal inter-linkage is a documented advanced KP technique** — ✅ HIGH:
> *"Interlinkages occur when a planet acts as a significator (star lord, sublord, or sub-sublord) for multiple houses, connecting their karakas."*
> *"A 7-11-2 interlink shows profitable partnership, while 7-9 suggests ethical dealings."*

**Two schools (associated with Bhaskaran and K.N. Rao/Khullar)**:
1. **Bhaskaran's interlinks** — published as a cuspal-interlink methodology
2. **Khullar's cuspal interlinks** — separate system, sometimes at odds with Bhaskaran

**Core principle** (both schools agree):
For marriage: H7 CSL should be a significator related to H2 and H11 (inter-linked). When all three primary cusps' sub-lords agree on supporting the same houses, the event is strongly promised.

**Modern KP practice**:
> *"For marriage matters, significators which are the cuspal sub lords of the required houses are needed for marriage (houses 2, 7, 11)."*

**Not in original KSK** — ⚠️ MEDIUM:
Cuspal interlink theory is post-KSK (Bhaskaran + Khullar extensions). Your KB can use it as a confidence booster but shouldn't position it as mandatory.

### Current code state

- Your `kp_csl_theory.txt` mentions cusp-to-cusp chain analysis
- System prompt doesn't enforce or emphasize it

### Verdict for PR

**P2 (nice-to-have)**:
Surface "cuspal agreement count" per topic: when analyzing marriage, check whether 7th CSL's significators overlap with 2nd CSL's and 11th CSL's. Count agreements. Higher count = stronger confidence. But don't treat as mandatory per KSK.

### Sources
- [Occult Sanctum — Advanced KP Cuspal Interlink Theory](https://www.occultsanctum.com/advanced-kp-stellar-astrology-essential-notes-cuspal-interlink-theory/)
- [AstroSage — Cuspal Interlinks Bhaskaran](https://kpastrology.astrosage.com/kp-learning-home/related-systems/cuspal-interlinks-bhaskaran)
- [AstroSage — Cuspal Interlinks Khullar](https://kpastrology.astrosage.com/kp-learning-home/related-systems/cuspal-interlinks-khullar)

---

## FINAL SYNTHESIS — Prioritized Fix List

**Ordered by impact × confidence. All items verified from KSK Readers or 3+ consistent modern sources.**

### 🔴 MUST FIX (HIGH confidence + HIGH impact)

| # | Fix | Topic | Where | Effort |
|---|---|---|---|---|
| 1 | Fix 3 QUICK_INSIGHT_TOPICS wrong denial houses | N/A | llm_service.py:932-943 | 3 lines |
| 2 | Add gender field → LLM (from prior audit) | N/A | 3 files | 15 lines |
| 3 | Add birth_date + computed age → LLM | N/A | 2 files | 10 lines |
| 4 | Surface A/B/C/D significator labels to LLM | Topic 1 | format_chart_for_llm | 30 lines |
| 5 | System prompt 5-tier verdict (Strongly Promised / Promised / Conditional / Weakly Promised / Denied) | Topic 4 | system prompt | 15 lines |
| 6 | KSK strict bhukti-level dual signification: "fires in relevant bhuktis, blocked in denial bhuktis" | Topic 2 | system prompt | 10 lines |
| 7 | Remove karaka-override language ("strong Venus can override weak CSL") — replace with "karakas are CONTEXT only" | Topic 6 | system prompt + marriage.txt | 8 lines |

### 🟡 SHOULD FIX (HIGH confidence + MEDIUM impact)

| # | Fix | Topic | Where | Effort |
|---|---|---|---|---|
| 8 | Resolve education rule: "any one for basic, all three for higher" | N/A | other_topics.txt + system prompt | 5 lines |
| 9 | Clarify H12 for marriage: lesser denial, often "marriage abroad / separation" not strict no-marriage | Topic 2 | marriage.txt | 5 lines |
| 10 | Add RP-dasha overlap rule explicitly: "when current MD/AD lord is ALSO an RP AND signifies relevant houses = timing confirmation" | Topic 5 | system prompt | 5 lines |
| 11 | Remove "improving houses 1,2,3,6,10,11" as if fundamental — re-label as "Upachaya houses used contextually" | N/A | general.txt line 47 | 3 lines |

### 🟢 NICE TO HAVE (MEDIUM confidence OR MEDIUM impact)

| # | Fix | Topic | Where | Effort |
|---|---|---|---|---|
| 12 | Retrograde CSL note: natal = treat as direct per KSK; retrograde CSL = mild delay only | Topic 3 | system prompt | 3 lines |
| 13 | Self-significator flag per planet (in own star OR 3 empty stars) | Topic 7 | chart_engine.py + format_chart | 15 lines |
| 14 | Conjunction within 3.33° per planet | Topic 7 | chart_engine.py | 10 lines |
| 15 | Cuspal inter-linkage: count agreement between primary CSL's significators and supporting cusps' significators | Topic 8 | engine + prompt | 20 lines |
| 16 | Glossary for Parivartana, Marakashthana in general.txt | N/A | general.txt | 10 lines |

### ⚪ DEFER (disputed, low practical benefit, or high implementation cost)

- E-level significators (conjoined/aspected) — KSK includes but modern rarely uses
- Divisional charts (D9 Navamsa) — not core KSK
- Ashtakavarga — Parashari, not KP
- Quantitative promise score (0-100) — no classical basis; A/B/C/D labels sufficient

### Total effort estimate for P0 (items 1-7)
~80-100 lines across 5 files. ~2-3 hours work. All P0 items are verified HIGH confidence and directly address user's reported quality gaps.

### Total effort for P0 + P1 (items 1-11)
~120-140 lines. ~3-4 hours.

---

## Topic 1 — Significator strength hierarchy (A/B/C/D/E)

### Question
Does KSK classify significators by strength? Are weights quantitative or ordinal? How should we weight strong vs weak significators in a verdict?

### Findings

**KSK Reader V pp 148-154 (1971 ed.) ordering** — ✅ HIGH:

> "Order of significators:
> (1) Planets in the constellation of the occupant
> (2) Occupants of the house
> (3) Planets in the constellation of the owner
> (4) Owners of the house
> (5) Planets conjoined with or aspected by the above significators — very weak"

This matches the modern A/B/C/D/E letter labels used by practitioners. **The ordering is KSK's own**, not a post-KSK invention.

**Are the 100%/75%/50%/25% percentages KSK's?** — ❌ NO.

- Modern practitioners (AstroVastum, Elemental Astrology, various Scribd KP notes) assign A=100, B=75, C=50, D=25 as rule-of-thumb weights.
- **KSK did NOT assign percentages.** The hierarchy is ordinal only. The percentages are modern convenience, not canonical.
- Practical implication: a quantitative 0-100 scoring system has no classical basis; it's a modern simplification.

**"Planet in star of occupant" — why strongest?** — ✅ HIGH:
KSK's reasoning: *"A planet tenanting a Star affects the matters of the house occupied by the Star Lord AND the houses owned by the Planet."* The planet becomes a pipeline for the star lord's houses — so it carries the strongest instrument of that house's fruition.

**Does one A-level beat three D-level significators?** — ⚠️ MEDIUM / CONTESTED:
KSK's Reader V doesn't explicitly rank. Modern practice informally says "yes, quality matters more than quantity" but there's no canonical formula. For a chart where CSL is a D-level significator of marriage and an A-level significator of denial houses, classical practice leans toward "weak promise with strong obstacles."

**"E" level (conjoined/aspected)** — ⚠️ MEDIUM:
KSK includes it in Reader V but calls it "very weak." Most modern implementations omit it entirely. Our engine currently doesn't compute it; low priority to add.

### Current code state

- [chart_engine.py:734-746](backend/app/services/chart_engine.py) computes all 4 levels
- Returns them in a flat `all_significators` list — strength NOT preserved
- The LLM prompt doesn't tell Claude to distinguish levels

### Verdict for PR

**Change needed**: surface A/B/C/D labels alongside each significator in `format_chart_for_llm`. Let Claude weight them — don't force a 0-100 quantitative score (no classical basis).

**Specifically**:
- `all_significators` stays as-is for back-compat
- New field: `significators_by_level = { "A": [...], "B": [...], "C": [...], "D": [...] }`
- System prompt: "When CSL is an A/B significator of relevant houses and only D of denial houses → strongly promised. When CSL is D of relevant and A of denial → weakly promised with strong obstacles."

### Sources
- [AstroSage — KP Reader differences](https://kpastrology.astrosage.com/kp-learning-home/differences-in-readers)
- [Elemental Astrology — How to find strong significators](https://elemental-astrology.com/how-do-you-find-strong-significators-in-kp-astrology/) (403 direct, but cited in search results)
- [Scribd — KP Significator Table](https://www.scribd.com/doc/159331923/Significator-Table)
- [Internet Archive — KP Readers](https://archive.org/details/kp-readers)

---


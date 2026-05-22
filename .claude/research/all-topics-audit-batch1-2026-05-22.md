# All-Topics KP Coverage Audit — BATCH 1
## Career · Business · Wealth/Income · Education · Litigation · Money-Recovery

**Date**: 2026-05-22
**Author**: Phase 1 audit (read-only, no code changes)
**Benchmark**: Marriage tab depth (44KB dedicated KB + 60+ rules + 7 engine detectors + RULES 33/44/45/46 protective framing)
**Status**: AUDIT ONLY — awaiting user approval before PR sequence

---

## Executive summary

Of the 6 domains in Batch 1, **only career meets the marriage benchmark.** Business is a critical
production-grade gap (engine knows the houses but KB doesn't exist, topic isn't routed, AI gets
zero topic-specific knowledge). Litigation and money-recovery are at 5-10% of marriage depth.
Wealth and education are at 15-20% of marriage depth.

| Domain | Engine | KB | Topic routing | `detect_topic` | Pattern D2 | Protective framing | Grade |
|---|---|---|---|---|---|---|---|
| **Career / job** | ✅ [10,2,6,11] | ✅ 32KB (job + profession) | ✅ | ✅ | ✅ | 🟡 partial | **B+** |
| **Business** | ✅ [7,2,10,11] | 🔴 ~30 lines scattered | 🔴 MISSING | 🔴 MISSING | ✅ (variant) | 🔴 | **F** |
| **Wealth/income** | ✅ [2,6,10,11] | 🟡 90 lines (other_topics) | ✅ | ✅ wealth only | ✅ | 🟡 partial | **C-** |
| **Education** | ✅ [9,4,11] | 🟡 60 lines (other_topics) | ✅ | ✅ | ✅ | 🟡 partial | **C** |
| **Litigation** | ✅ [6,8,12] | 🔴 25 lines (other_topics) | ✅ | ✅ | 🔴 | 🔴 | **D** |
| **Money recovery** | 🔴 not its own topic | 🔴 1 line | 🔴 | 🔴 | 🔴 | 🔴 | **F** |

**Headline**: 4 of 6 domains in this batch need significant work to reach "any astrologer can blindly
trust the output" standard. Business is the single biggest gap — it's a top-3 question category for
real-world astrologers and we have zero dedicated KB for it.

---

## How each domain is scored

Each domain is graded across 5 dimensions (mirrors what makes Marriage Match production-grade):

1. **Engine support** — Are the right houses + Pattern D2 detector wired up?
2. **Knowledge base depth** — Dedicated `.txt`/`.md` file? How many lines? How many distinct doctrines covered?
3. **Topic routing** — Does `TOPIC_TO_FILE` route to the right file?
4. **Topic detection** — Does `detect_topic()` recognise this domain in keywords/Haiku detection?
5. **Protective framing** — Are sensitivity rules (RULE 15 / 44 / 45 / 46) tuned for the topic-specific risks (e.g., never name jail timing for litigation; never name death for health)?

A "complete" topic has all five.

---

## Detailed per-domain audit

### 1. CAREER / JOB — **Grade B+ (closest to marriage parity)**

#### What's there
- Engine: `HOUSE_TOPICS["job"] = [10, 2, 6, 11]` ✓ correct
- KB: `job.txt` (325 lines, 12 sections) + `profession_detailed.md` (320 lines) = 645 lines total
- Routing: `TOPIC_TO_FILE["job"|"career"|"profession"] = "job.txt"` ✓
- Detection: keyword + Haiku both cover "job/career/work/promotion"
- Pattern D2: ✓ via `TOPIC_HOUSE_MAP["career"]`
- Deep-dive: `profession_detailed.md` loaded via `TOPIC_DEEP_DIVE["job"|"career"|"profession"]`

#### job.txt section breakdown (good)
1. Relevant houses (H10 primary gate)
2. H10 cusp sub lord analysis
3. H6 cusp (service house)
4. Service vs Business distinction (uses H6 vs H7 differentiator)
5. Field of work by planet (9 planets covered)
6. Tech/IT specifics
7. Dasha timing for career events
8. Complete analysis steps
9. Government vs Private vs Self-employed (Sun = govt critical)
10. Promotion vs Job change vs Stagnation
11. Industry mapping by planet combinations
12. Pushback discipline

#### Gaps identified
| Gap | What's missing | Why it matters |
|---|---|---|
| **Job loss / firing** | No section on H10 + H12 + H8 firing-from-job signatures. Voluntary exit is covered (§10) but involuntary termination isn't | Real client question: "Will I lose this job?" — currently the AI has no doctrine to consult |
| **Layoff cycles** | No mass-layoff / company-shutdown / merger-disruption analysis | 2024-26 IT layoffs are a top-asked question; we have no doctrine |
| **Salary growth (separate from promotion)** | H2 + H10 + H11 specifically for income jumps, not just role change | Salary hike without promotion is a separate KP signature |
| **Notice period / handover** | No timing doctrine for resignation execution | Client wants timing of departure, not just decision |
| **Appraisal cycles** | No annual-review prediction signatures | Predictable question every March-April in IT |
| **Career break / sabbatical** | No structured doctrine | Common ask from 35-50 demographic |
| **Return to workforce after gap** | No doctrine | Career-restart after maternity/caregiving |
| **Income tax trouble** | KP doctrine EXISTS (H7+H8+H12 with H10 sub lord) but NOT in our KB | Concrete KP rule from kpastrologylearning.com — easy add |

#### Pattern D2 status
✅ Wired for `career` and `career_business`. Job-offer-rescinded scenarios are detected.

#### Protective framing
🟡 Partial — RULE 44 (capability vs manifestation) is universal so it applies. No career-specific
sensitivity tier (e.g., "never tell a 28-year-old their career is over").

#### Recommended fixes
- **PR A2.1** — Add §13 to job.txt: job loss / layoff / firing doctrine + KP citations
- **PR A2.2** — Add §14: salary growth (independent of promotion) + appraisal cycle signatures
- **PR A2.3** — Add §15: career break / sabbatical / return-to-workforce + income tax trouble rule

**Effort**: 4-6 hours total. No engine changes needed.

---

### 2. BUSINESS — **Grade F (worst gap in the batch)**

#### What's there
- Engine: `HOUSE_TOPICS["business"] = [7, 2, 10, 11]` ✓ exists but nothing routes to it
- KB: ~30 lines scattered (job.txt §4 has service-vs-business distinction; other_topics.txt §9 has 4 lines on "business / self-employment wealth")
- Routing: **🔴 NOT in `TOPIC_TO_FILE`** — a "business" question routes to `general.txt` (no business-specific KB)
- Detection: **🔴 "business" is not a `detect_topic` keyword** — Haiku will guess `job` or `wealth` or `general`
- Pattern D2: ✅ as `career_business` (relevant: {2,7,10,11}, denial: {5,8,12})

#### What KP doctrine actually exists (from web research, not in our KB)
Verbatim from KP Astrology Learning (canonical source):

**Partnership rules (H7 cusp sub lord)**:
- "Signifies 6 and 11 → lasting business partnership"
- "Signifies 6 and 12 → partnership ends"
- "Signifies 5 and 11 → strong lasting bond"
- "Signifies 5, 8, 12 → partner profits, you lose" ← **CRITICAL for the user's example (business partner cheating)**
- "Mercury sub lord with 11 → multiple partners with strong bond"
- "Venus connection → harmonious partnership"

**Business profession (H10 cusp sub lord)**:
- "If H10 sub lord signifies 7 → profession is business"
- "If H10 sub lord signifies 6 → profession is service"
- "Dual sign + both H6 and H7 → service AND business simultaneously"
- "H10 sub lord signifies 2 or 10 → earns by self-exertion (self-employment)"

**Income tax / regulatory trouble (H10 sub lord)**:
- "H10 sub lord with H7 + H8 + H12 → income tax trouble"
- "H10 sub lord is Saturn signifying H11 → earns money through illegal ways"
- "H10 sub lord only signifies H7 → public activities without material gain"

#### Gaps identified (everything is a gap)
| Gap | What's missing | Why it matters |
|---|---|---|
| **Starting a business** | No new-venture timing doctrine | Top-3 client question |
| **Partnership setup** | No partner-selection guidance, no H7 cross-match for business partners | Massive miss — there's literally a KP rule for "your partner profits while you lose" we don't have |
| **Partnership dissolution** | No exit timing, no clean vs messy split signatures | Real-world critical |
| **Business expansion** | No multi-branch / franchise / scale doctrine | Big-business clients |
| **Business loss** | No profit-vs-loss verdict framework | Most asked question after "should I start" |
| **Bankruptcy / shutdown** | No structured signatures | Sensitive but real |
| **Business partner cheating / fraud** | The user's specific example — currently NO doctrine | Combines H7 (partner) + H6 (theft/disputes) + H8 (loss) + H2 (own wealth) — needs compound reading |
| **Business sale / exit** | No buyer-finding doctrine | Exit-planning clients |
| **Business inheritance / succession** | No family-business hand-off doctrine | Common in Indian businesses |
| **Family business vs new venture** | No distinguishing signatures | Important framing |
| **Government tender / contract win** | No litigation-adjacent business doctrine | Govt-business clients |

#### Pattern D2 status
✅ Detector exists (`career_business`). Engine-side is ready.

#### Protective framing
🔴 Zero business-specific protective framing. Need:
- "Should I quit my job to start a business?" framing (decision support under uncertainty)
- "Partner cheated me, will I get the money back?" framing (combines H6 recovery + emotional)
- Bankruptcy = same sensitivity tier as health crisis (financial ruin = life-impact)

#### Recommended fixes — this is the biggest single-PR opportunity in the batch
- **PR A2.4** — Create `business.txt` (~30KB target — match marriage_matching depth)
  - §1 Houses for business (H7 primary, H10 profession, H11 gains, H2 wealth, H6 service overlap)
  - §2 Starting a new venture (timing, joint period, ruling planet check)
  - §3 Partnership analysis (lasting vs dissolution, partner profile from H7 sub lord)
  - §4 Partner cheating / fraud recovery (compound H6+H7+H8+H2 reading) **← user's example**
  - §5 Profit vs loss verdict (H11 favorable, H8/H12 unfavorable, dasha trigger)
  - §6 Business expansion (H11 + H4 multiple, dual sign in H10 chain)
  - §7 Business loss / bankruptcy signatures
  - §8 Family business succession (H4 inheritance + H2 + H11)
  - §9 Type classification (sole proprietor / partnership / family / corporate)
  - §10 Pushback discipline + protective framing
- **PR A2.5** — Wire engine: add `business` to `TOPIC_HOUSE_MAP` (separate from `career_business`), add business-specific helper functions in a new `business_engine.py` mirroring `compatibility_engine.py`:
  - `business_promise_verdict()` — H7 + H10 + H11 + H2 multi-cusp confirmation
  - `partnership_compatibility_check()` — for partner selection / existing partnership
  - `partner_cheating_signal()` — H6+H7+H8+H2 compound detector
  - `business_loss_pattern_detector()` — analog to Pattern D2 for business
- **PR A2.6** — `TOPIC_TO_FILE`: add `business / startup / venture / partnership` → `business.txt`
- **PR A2.7** — `detect_topic()` keywords: add `start a business / new venture / partnership / sole proprietor / franchise / shut down business / partner cheated / business loss / boom in business`
- **PR A2.8** — System prompt: add RULE 47 (BUSINESS DOCTRINE — H7+H10 primary, partner cheating compound reading mandatory when keywords detected)

**Effort**: 20-30 hours total. Most of any batch-1 PR. **Highest single-PR ROI.**

---

### 3. WEALTH / INCOME — **Grade C-**

#### What's there
- Engine: `HOUSE_TOPICS["wealth"] = [2, 6, 10, 11]` ✓
- KB: 90 lines spread across other_topics.txt §4 (50 lines) + §9 (40 lines wealth-type classification)
- Routing: `TOPIC_TO_FILE["wealth"|"finance"] = "other_topics.txt"` ✓ (but file covers 6 topics)
- Detection: ✓ "money / wealth / savings / investment" keyword
- Pattern D2: ✓ wired

#### What's covered (other_topics.txt §4 + §9)
- ✅ KSK strict wealth doctrine: H2 + H6 + H11 trinity (not 2/6/10/11)
- ✅ Earned vs inherited vs windfall vs property vs business wealth classification
- ✅ H5 speculation doctrine
- ✅ Loan/debt exposure (4 lines)
- ✅ Money owed to you (1 line)
- ✅ Cheated detection (H6 + H12)

#### Gaps identified
| Gap | What's missing | Why it matters |
|---|---|---|
| **Salary growth doctrine** | Lives in career section but H2+H11 specifically for income hikes is not surfaced | Different question than promotion |
| **Investment returns** | No stocks/MF/crypto specific signatures (H5 is mentioned for speculation generally but not investment classes) | 2025-26 retail-investor explosion in India |
| **EMI burden / loan repayment** | No specific doctrine on repayment ability or default risk | Real concern post-COVID |
| **Sudden gains (lottery, inheritance)** | H8 + H11 mentioned in passing but not as structured doctrine | High-emotion question |
| **Sudden losses (theft, accident, fraud)** | H8 + H12 only as "expenditure" | The user's "business partner cheated" example — should generate a structured verdict |
| **Bankruptcy signatures** | Nothing | Top-of-mind for indebted clients |
| **Foreign income / NRI remittance** | Not addressed | Big Indian demographic |
| **Multiple income sources** | Not addressed | Gig economy / freelance explosion |
| **Asset depreciation / property loss** | Property section exists but loss isn't covered | Real |
| **Tax dispute / income tax notice** | KP rule EXISTS (H10 sub lord + H7+H8+H12) — not in our KB | Concrete addressable gap |
| **Retirement income / pension** | Not covered | 55+ demographic |

#### Pattern D2 status
✅ Wired for `wealth` (relevant {2,6,11}, denial {5,8,12}).

#### Protective framing
🟡 Partial — no doctrine on "should I take this loan / make this investment" decision support.
RULE 29 (decision support) is universal but doesn't have wealth-specific patterns.

#### Recommended fixes
- **PR A2.9** — Extract wealth + income into dedicated `wealth.txt` (~20KB target). Cover all 12 gaps above.
- **PR A2.10** — Engine: add `wealth_subtype_classifier()` (earned/inherited/windfall/business/property/foreign), `loan_repayment_capacity()`, `theft_recovery_signal()`
- **PR A2.11** — `detect_topic()` add: `salary / loan / debt / EMI / investment / lottery / inheritance / theft / tax notice / bankruptcy / retirement / pension / NRI income`
- **PR A2.12** — RULE 48 (WEALTH DOCTRINE — H2/H6/H11 strict, never use H10 for accumulation, decision-support framing for "should I invest in X")

**Effort**: 10-15 hours.

---

### 4. EDUCATION — **Grade C**

#### What's there
- Engine: `HOUSE_TOPICS["education"] = [9, 4, 11]` ✓
- KB: 60 lines in other_topics.txt §1 (well-structured tier framework actually)
- Routing: `TOPIC_TO_FILE["education"] = "other_topics.txt"` ✓
- Detection: ✓ keyword + Haiku
- Pattern D2: ✓ (and separate `education_higher` variant)

#### What's covered (other_topics.txt §1)
- ✅ EDUCATION PROMISE TIER 1-4 (any-level / school / college / doctorate)
- ✅ Denial houses H3 H8 H10 H12
- ✅ KSK strict bhukti rule
- ✅ Competitive exam doctrine (H4+H6+H9+H10+H11)
- ✅ H4 vs H9 distinction
- ✅ Timing per planet (Jupiter / Mercury / Moon / Sun dasha)
- ✅ Barren signs (Aries/Gemini/Leo/Virgo) for H9

#### Gaps identified
| Gap | What's missing | Why it matters |
|---|---|---|
| **Exam result horary** | No dedicated rules for "will I pass" with specific date | High-volume question (results day) |
| **Specific exam categories** | No CAT/UPSC/GRE/SAT/JEE specific signatures | Indian competitive exam culture |
| **Failure recovery** | No "what if I failed, what's next" doctrine | Emotional sensitivity |
| **Abroad education** | Only foreign.txt covers it generally; no education-specific abroad H9+H12+H11 framework | Massive Indian demographic — top question |
| **Subject / specialization choice** | Some hints in foreign.txt but no structured doctrine | Important for 12th-grade clients |
| **Scholarship probability** | Not addressed | Often paired with abroad-education question |
| **Admission fights / interview success** | No doctrine on specific interview events | College/PhD admissions |
| **Failure due to addiction / distraction** | No doctrine linking H8 + addictions | Common parent concern |
| **Tutor / coaching effectiveness** | Not addressed | Pre-exam clients |
| **Online vs offline learning** | Not addressed | Post-COVID world |
| **Drop-out doctrine** | Briefly mentioned (H8 interruption) but no structured framework | Mental health overlap |

#### Pattern D2 status
✅ Both `education` and `education_higher` are wired.

#### Protective framing
🟡 Partial — no "if exam fails" framing. Universal RULE 44 (capability vs manifestation) helps but doesn't replace topic-specific doctrine.

#### Recommended fixes
- **PR A2.13** — Extract education into dedicated `education.txt` (~15KB target). Cover all 11 gaps above.
- **PR A2.14** — Engine: add `exam_pass_probability()` (for horary-style exam questions), `scholarship_likelihood()`
- **PR A2.15** — `detect_topic()` add: `pass exam / fail exam / abroad study / GRE / GMAT / CAT / UPSC / scholarship / drop out / college admission / PhD`
- **PR A2.16** — Add RULE 49 (EDUCATION TIER — match tier to question; never use TIER 4 doctorate doctrine for 10th-grade question)

**Effort**: 8-12 hours.

---

### 5. LITIGATION / COURT CASES — **Grade D (severe gap)**

#### What's there
- Engine: `HOUSE_TOPICS["litigation"] = [6, 8, 12]` ⚠ uses denial set as relevant — wrong wiring
- Engine `TOPIC_HOUSE_MAP["litigation"] = {relevant: {6,11}, denial: {7,8,12}, primary_cusp: 6}` ✓ correct here
- KB: 25 lines in other_topics.txt §5
- Routing: `TOPIC_TO_FILE["litigation"] = "other_topics.txt"` ✓
- Detection: ✓ "court / case / lawsuit"
- Pattern D2: ✓ via TOPIC_HOUSE_MAP

#### What's covered (other_topics.txt §5)
- H6 = disputes (primary), H1 = native's case, H11 = winning, H7 = opponent
- Win: H6 sub lord signifies H1+H6+H11 OR H2 sub lord signifies H6+H11
- Loss: dasha activates H12 + H7 = opponent wins
- Timing per planet (Saturn = long, Mars = quick, etc.)
- Appeal success: H3 + H6 + H11

#### Gaps identified
| Gap | What's missing | Why it matters |
|---|---|---|
| **Civil vs criminal case distinction** | No separate signatures | Very different KP framing |
| **Plaintiff vs defendant role** | KP changes the reading based on which side you're on | Critical |
| **Jail / imprisonment risk** | KP rule EXISTS (H12 cusp sub lord = Rahu signal, plus H6+H8+H12 affliction) — not in our KB | Life-impact sensitivity tier 3 |
| **Bail probability** | Not addressed | Real-time question for arrested clients |
| **Settlement vs trial decision** | No doctrine | Common ask |
| **Appeal success** | One line in current KB; could be a whole section | Post-loss clients |
| **Land/property dispute** | Not differentiated from generic litigation | Indian context — extremely common |
| **Inheritance dispute** | Not addressed | Common in joint families |
| **Money recovery suit** | Overlaps with money_recovery (also missing) | User's example overlaps here |
| **Divorce litigation** | Currently in divorce.txt but not cross-linked | Compound topic |
| **Domestic violence case** | Not addressed | Sensitive |
| **Fraud / cheating case** | Not addressed | Overlaps with business partner cheating |
| **Defamation suit** | Not addressed | Public-figure clients |
| **Verdict timing window** | Generic "Saturn = lengthy" — no calendar-window scanning | Need to scan upcoming dashas for verdict-supportive periods |
| **Lawyer effectiveness** | Not addressed (H3 sub lord = courage/effort?) | Often asked |

#### Pattern D2 status
✅ Wired but worth reviewing — Pattern D2 for litigation means "case fires but verdict reverses" — should be highlighted as a structural risk.

#### Protective framing
🔴 Zero litigation-specific protective framing. **Critical safety gap:**
- Predicting criminal-case verdict could constitute legal opinion
- Predicting jail dates is on the same sensitivity tier as predicting death
- Settlement decisions affect families for decades
- Need: "this is a structural reading, not legal advice; always consult a lawyer"

#### Recommended fixes
- **PR A2.17** — Extract litigation into dedicated `litigation.txt` (~12KB target). Cover all 15 gaps above.
- **PR A2.18** — Engine: add `litigation_verdict_probability()`, `jail_risk_signal()`, `appeal_window_scanner()`, `settlement_vs_trial_recommender()`
- **PR A2.19** — `detect_topic()` add: `criminal case / civil case / land dispute / inheritance dispute / jail / bail / divorce litigation / fraud case / appeal / settlement / lawyer`
- **PR A2.20** — Add RULE 50 (LITIGATION SENSITIVITY — Tier 3 protective framing, never name jail dates, always frame as structural-not-legal-advice, mandatory disclaimer)

**Effort**: 12-18 hours. **Sensitive — needs careful review by user before shipping.**

---

### 6. MONEY RECOVERY (lent money, partner cheating, theft) — **Grade F**

#### What's there
- Engine: 🔴 not its own topic in `HOUSE_TOPICS`
- KB: 🔴 **ONE LINE** in other_topics.txt §4: "H6 sub lord signifying H2, H6, H11 AND no connection to Saturn → entangled money returned."
- Routing: 🔴 no entry; rolls into `wealth`
- Detection: 🔴 no specific keyword; will detect as `wealth` or `litigation` or `general`
- Pattern D2: 🔴 nothing

#### What KP doctrine actually exists (from canonical sources, not in our KB)

**H6 cusp sub lord (KP Astrology Learning verbatim)**:
- "Retrieving trapped money: 6th cusp's sub lord signifies 2, 6, and 11, excluding Saturn" → money returns
- "Monetary receipts: 6th cusp's sub lord signifies 2, 6, and 11" → desired money arrives
- "Saturn connected to H6 sub lord → money recovery difficulty"

**H8 cusp sub lord on borrowing/lending**:
- "When 8th cusp's sub lord signifies 5, 6, 8, and 12 → borrowing from everyone occurs"
- "If signifies 2, 10, or 11 → the borrowed money is returned"
- "Signifying 6 and 11 → receiving a cheque AND the lender's loss" ← **critical for the cheating scenario**

**H7 cusp sub lord on partnership-related loss**:
- "Signifies 5, 8, 12 → partner profits, you lose"

So a "business partner cheated me, will I get the money back?" question needs to compound:
- H6 sub lord (recovery probability) + Saturn check
- H7 sub lord (partner intent) + 5/8/12 check
- H8 sub lord (loss recovery channel)
- H2 (the lent money) + H11 (will it come back) chain
- Dasha trigger (recovery PADs scanning)

#### Gaps (everything)
- All of the above doctrine is missing from our KB
- No engine helper to compound H6 + H7 + H8 + H2 for cheating-recovery
- No dasha-scanner to identify "money recovery window"
- No keyword detection → questions land in `wealth` and get generic answer
- No protective framing (recovery questions are emotional + legal hybrid)

#### Recommended fixes
- **PR A2.21** — Add `money_recovery.md` (~8KB) covering: lent money (H6+H2+H11), partner cheating (H7+H6+H8+H2 compound), theft (H8+H12+H2), recovery dasha-window scanning, Saturn-as-blocker doctrine
- **PR A2.22** — Engine: add `money_recovery_engine.py` with:
  - `lent_money_recovery_verdict()` — H6 sub lord + Saturn check
  - `partner_cheating_compound_reading()` — 4-house compound (the user's example)
  - `theft_recovery_signal()` — H8 + H12 analysis
  - `recovery_window_scanner()` — scan upcoming ADs for H6+H2+H11 alignment
- **PR A2.23** — `TOPIC_TO_FILE["money_recovery" | "lent_money" | "partner_cheated"] = "money_recovery.md"`
- **PR A2.24** — `detect_topic()` add: `money recovery / lent money / partner cheated / partner fraud / get my money back / refund / EMI default / theft`
- **PR A2.25** — Add RULE 51 (MONEY RECOVERY COMPOUND READING — when question detected, mandatory 4-house compound reading)

**Effort**: 10-14 hours. **High emotional impact — get this right.**

---

## Cross-cutting findings (apply to every domain in batch + future batches)

### A. The "other_topics.txt" anti-pattern

Six major life domains (education, children, property, wealth, litigation, vehicle) are crammed into
one 23KB file. This causes:
- Token budget waste — every wealth question loads all the litigation rules
- Hard to extend — adding 20 more lines to litigation requires editing a file shared by 5 other topics
- Hard to grade — can't see at a glance how much depth each topic has
- Cache invalidation — any change to other_topics.txt invalidates the cached block for all 6 topics

**Recommendation**: extract every topic to its own file. This is a one-time refactor (PR A2.0) that
unlocks all per-topic depth work. **Should ship FIRST before any other PR in this batch.**

### B. The `TOPIC_TO_FILE` mapping is the funnel — anything not there is invisible

If a topic isn't in `TOPIC_TO_FILE`, the Haiku detector won't be told about it, the topic-specific KB
block won't load, and the question lands in `general.txt` (which is universal KP principles, not
topic doctrine). The current 25-topic map needs to grow to ~60+ to cover the universe.

### C. `detect_topic()` is the second funnel — keywords matter

Even if `TOPIC_TO_FILE` has the topic, if `detect_topic`'s keyword + Haiku prompt doesn't list it,
the Haiku will pick "general" or "wealth" by default. Every new topic needs both `TOPIC_TO_FILE`
entry AND `detect_topic` keyword update.

### D. Engine Pattern D2 detector is reusable — add new topics cheaply

`TOPIC_HOUSE_MAP` in `csl_chains.py` is the single source of truth for Pattern D2. Adding a new
topic (e.g., `money_recovery`) is just one dict entry. Engine support comes free.

### E. Protective framing rules (RULE 15 / 44 / 45 / 46) need topic-specific tuning

Currently all topics inherit the same protective framing. But:
- Litigation needs "never name jail date" + "structural not legal advice"
- Money recovery needs "structural probability not guaranteed return"
- Business partner cheating needs combined emotional + legal protective framing
- Child longevity needs the strongest possible framing (Tier 3)

A future RULE 52 should be a **per-topic sensitivity router** — given the detected topic, inject the
right protective framing.

### F. Compound questions are the norm, not the exception

Real questions rarely fit one topic:
- "Should I quit my job to start a business?" = career + business + decision support
- "Will my partner return the money or do I file a case?" = money recovery + litigation + decision
- "Should we spend ₹40L on the child's surgery?" = health + children + wealth + decision

Each compound needs a multi-axis reading. Currently `RULE 14 — MULTI-FACTOR QUERIES` exists but is
universal — needs topic-aware compound recipes. **Suggest adding a `compound_topics.md` KB that lists
the top 20 compound patterns and how to read each.**

---

## Recommended PR sequence for batch 1

If user approves, ship in this order (each PR independently verifiable + revertable):

```
A2.0  — REFACTOR: extract other_topics.txt into 6 separate files (no doctrine change)
A2.1  — career: job loss / layoff doctrine
A2.2  — career: salary growth + appraisal cycles
A2.3  — career: career break + tax trouble rule
A2.4  — business: create business.txt (BIG ONE)
A2.5  — business: business_engine.py (compound detectors)
A2.6  — business: TOPIC_TO_FILE entries
A2.7  — business: detect_topic keywords
A2.8  — business: RULE 47 doctrine
A2.9  — wealth: extract + expand to 20KB
A2.10 — wealth: subtype classifier + loan/theft helpers
A2.11 — wealth: detect_topic keywords
A2.12 — wealth: RULE 48 doctrine
A2.13 — education: extract + expand to 15KB
A2.14 — education: exam_pass + scholarship helpers
A2.15 — education: detect_topic keywords
A2.16 — education: RULE 49 tier-matching
A2.17 — litigation: extract + expand to 12KB
A2.18 — litigation: verdict / jail risk / appeal helpers
A2.19 — litigation: detect_topic keywords
A2.20 — litigation: RULE 50 sensitivity framing (CRITICAL — user review before merge)
A2.21 — money_recovery: create money_recovery.md
A2.22 — money_recovery: engine (4-house compound)
A2.23 — money_recovery: TOPIC_TO_FILE entries
A2.24 — money_recovery: detect_topic keywords
A2.25 — money_recovery: RULE 51 compound reading
```

**Total**: 26 PRs (1 refactor + 25 topic-specific).
**Estimated effort**: 75-120 hours of careful work.
**Recommended cadence**: 2-4 PRs per session.

---

## Sensitivity tier notes (from your child-surgery example)

Every PR above should classify its outputs into the sensitivity tier system. Tentative tiers:

- **Tier 1 (factual)**: career promotion, salary growth, education completion, wealth accumulation
  → Standard output format, normal protective framing
- **Tier 2 (life-impact)**: career loss, business failure, divorce, education failure, partner cheating
  → Add capability-vs-manifestation framing, falsifiable timing, decision support
- **Tier 3 (life-or-death)**: jail risk, surgery outcome, longevity, child illness, suicide risk
  → MAXIMUM framing: never name dates for negative outcomes, always show both branches,
    always recommend professional consultation, never the only source

A future PR (call it A2.X-sensitivity) should add the **per-topic sensitivity router** that
auto-injects the right tier framing.

---

## What's NOT in this audit (out of scope for Batch 1)

These domains are in subsequent batches:
- Batch 2: Health / mental health / hospitalization / longevity (Tier 3 heavy)
- Batch 3: Marriage adjacent — children, second marriage, spouse longevity, in-laws, parents
- Batch 4: Property, foreign, vehicle, pilgrimage, visa
- Batch 5: Spiritual, occult, fame, politics, sports, missing person, decision support

---

## What I need from you before proceeding

1. **Approve the methodology** — broad-and-comprehensive across all topics (vs deep-on-3)
2. **Approve the per-topic format** — 5-dimension grading + canonical KP doctrine cited + PR proposals
3. **Pick a starting PR sequence**:
   - Option A: ship A2.0 (refactor) first, then highest-impact (business A2.4-A2.8) — recommended
   - Option B: ship litigation first (biggest sensitivity gap)
   - Option C: ship money_recovery first (your specific example)
4. **Confirm sensitivity tier framework** — should I bake it into every batch?

Reply with answers to any/all and I'll move to Phase 2 (web research + audit) for Batch 2,
OR start implementing PR A2.0 if you want me to begin shipping Batch 1 fixes.

---

## Sources (canonical KP) used in this audit

- KP Astrology Learning — H6/H7/H8/H10 cusp sub lord rules (kpastrologylearning.com)
- AstroSage KP — overview + verdict logic (astrosage.com/kpastrology)
- KP Tripathi — financial astrology + 2nd marriage rules (kptripathi.net)
- Divine Creation India — How to Judge Longevity (Krishnamurti publication)
- RVA Forum — recovery from disease KP significators (ask.rahasyavedicastrology.com)
- AstroSubhash — KP Prashna for disease recovery
- Astrology Expert — sub-lord theory job/promotion (astrology-expert.com)
- Vaastu International — KP litigation case studies (vaastuinternational.com)
- KP Astrology Pro — 12 houses guide (kpastrologypro.com)
- Mindset Sutra — KP system rules

Every gap-fix PR will cite these sources verbatim in the new KB files (per Marriage Match precedent).

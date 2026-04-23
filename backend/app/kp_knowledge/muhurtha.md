# KP Muhurtha — Grounded Rules for the AI

This file is the authoritative knowledge base for any AI-assisted
Muhurtha analysis. When the astrologer asks "why is this window the
best?" or "can my daughter's wedding happen this Tuesday?", the AI
must cite these rules — never general internet astrology and never
invent rules.

Sources:
- `.claude/research/muhurtha-audit.md` (curated research 2026-04-22)
- Muhurtha Chintamani (Daivajna Ramacharya, 16th c.) — Panchanga
  Shuddhi, per-event rules, doshas
- KSK (K.S. Krishnamurti) Reader Volumes 4-6 — Lagna sub-lord
  signification, Ruling Planets, KP house groups
- Kanak Bosmia's KPRM (KP Relationship Method) — KPDP rules 6-10
  for multi-chart cross-checks
- B.V. Raman's *Muhurtha* — practitioner authority on modern
  electional usage

---

## 1. The Core KP Rule

> **The sub-lord of the Ascendant (Lagna CSL) at the moment of event
> commencement must signify the houses relevant to that event, and
> must NOT signify denial houses.**

This is the deciding factor. Panchang values (tithi, nakshatra, yoga,
vara, karana) are supportive — they never override a contradicting
Lagna SL. Conversely, no amount of good Panchang fixes a Lagna SL
that signifies the event's denial houses.

**"Signifies" — 4-step KP definition**:

For a planet P to signify a house H, at least one of these must be
true:

1. P is **occupying** H (or its cusp sub-lord's house)
2. P is the **ruler** (sign lord) of H
3. P's **nakshatra lord** occupies or rules H
4. P's **nakshatra lord's nakshatra lord** occupies or rules H
   (3-layer chain — KSK Reader 4)

Houses signified = union of all houses reached by this 4-step
expansion. The Lagna SL signifies typically 2-5 houses after expansion.

---

## 2. KP House Groups per Event

These are the canonical event → house mappings used by KP practitioners.
The **primary house** is mandatory; **supporting houses** strengthen;
**denial houses** if signified = avoid/defer.

| Event | Primary | Supporting | Denial |
|---|---|---|---|
| Marriage (vivaha) | 7 | 2, 11, 5 | 1, 6, 10, 12 |
| Business launch | 10 | 2, 6, 11 | 5, 12 |
| Griha pravesh (house-warming) | 4 | 11, 2 | 3, 10, 8 |
| Travel (short) | 3 | 9, 12 | 4, 8 |
| Travel (long / foreign) | 9 | 3, 12 | 2, 8 |
| Education start | 4 | 9, 11 | 3, 12 |
| Vehicle purchase | 4 | 3, 11 | 8, 12 |
| Medical — surgery/recovery | 1 | 5, 11 | 6, 8, 12 |
| Legal action filing | 6 | 11, 3 | 5, 12 |
| Investment deploy | 2 | 5, 11 | 8, 12 |
| Property (purchase) | 4 | 11, 2 | 3, 10, 12 |
| Property (sale) | 3 | 10, 11 | 4, 8 |
| Loan disbursement (receive) | 6 | 2, 11 | 10, 12 |
| Loan repayment (close) | 12 | 11, 3 | 6, 8 |
| Upanayana | 9 | 4, 11 | 3, 6, 12 |
| Annaprashana | 2 | 5, 11 | 6, 8, 12 |
| Vidyarambha | 4 | 9, 5 | 3, 12 |
| Namakarana | 5 | 2, 11 | 6, 8, 12 |
| Pratishta (installation) | 4 | 9, 11 | 6, 12 |

Notes:
- For general / unspecified events: primary 1, supporting 2+11, denial 6+8+12.
- For hybrid events (e.g., "wedding reception at new house" = marriage +
  griha pravesh), take the union of primary + supporting, and the union
  of denial; weight by event priority.

---

## 3. Panchanga Shuddhi — 5-Fold Purity

Even when Lagna SL is correct, these 5 Panchang layers are expected to
be clean. A Panchang that's *contradictory* (e.g., Tithi 14 + Vishti
Karana on Vyatipata Yoga) cannot be salvaged by a good Lagna SL alone;
KSK still prefers a clean Panchang over a borderline one.

### 3.1 Tithi

- **Good**: 2 (Dwitiya), 3 (Tritiya), 5 (Panchami), 7 (Saptami), 10
  (Dashami), 11 (Ekadashi), 13 (Trayodashi)
- **Avoid**: 4 (Chaturthi), 6 (Shashti), 8 (Ashtami), 9 (Navami — Nandaa),
  12 (Dwadashi), 14 (Chaturdashi), 15/30 (Purnima/Amavasya)
- **Tithi Shunya** (void tithis per masa) — these tithis have no astral
  support in the respective lunar month and should be avoided for
  auspicious starts. See Panchang KB §Tithi Shunya.

### 3.2 Nakshatra — by class

Classical 10-class taxonomy (Muhurtha Chintamani):

| Class | Nakshatras | Best for |
|---|---|---|
| **Dhruva** (fixed) | Rohini, U-Phalguni, U-Ashadha, U-Bhadrapada | Foundations, installations, long-term contracts, temple installation, coronation, housing |
| **Chara** (movable) | Swati, Punarvasu, Shravana, Dhanishta, Shatabhisha | Vehicles, travel, changing residence, trade |
| **Kshipra** (swift) | Ashwini, Pushya, Hasta, Abhijit (28th) | Education, medicine, short travel, sports, quick transactions |
| **Mridu** (mild/soft) | Mrigashira, Chitra, Anuradha, Revati | Marriage, arts, music, dance, jewelry, romance, fine-dining launches |
| **Mishra** (mixed) | Krittika, Vishakha | Both benefic and malefic effects; use with care |
| **Ugra** (fierce) | Bharani, Magha, P-Phalguni, P-Ashadha, P-Bhadrapada | Demolition, violent acts, debt collection, exorcism — AVOID for auspicious events |
| **Tikshna** (sharp) | Ardra, Ashlesha, Jyeshtha, Moola | Surgery, tantrik acts, incantations — AVOID for general events |

Mouth-direction classification (for construction, digging, lifting):

| Direction | Nakshatras | Use |
|---|---|---|
| **Adho-mukha** (downward) | Bharani, Krittika, Ashlesha, Magha, Vishakha, Jyeshtha, Moola, P-Ashadha, P-Bhadra | Digging, wells, mines, underground work |
| **Urdhva-mukha** (upward) | Rohini, Ardra, Pushya, Uttara-Phalguni, U-Ashadha, U-Bhadra, Shravana, Dhanishta, Shatabhisha | Flag hoisting, coronation, climbing, construction upward |
| **Tiryang-mukha** (sideways) | Punarvasu, Anuradha, Hasta, Mrigashira, Revati, Chitra, Swati | Travel, laying boundaries, road work, pipelines |

### 3.3 Yoga

Of the 27 yogas, these 9 are classically malefic and must be avoided
for muhurtha: **Vishkambha, Atiganda, Shula, Ganda, Vyaghata, Vajra,
Vyatipata, Parigha, Vaidhriti**.

Of the benefic 18, the especially good for muhurtha: Siddhi,
Shubha, Shukla, Brahma, Aindra, Siva, Harshana.

### 3.4 Vara (weekday) — per event

| Event | Best weekdays | Avoid |
|---|---|---|
| Marriage | Mon, Wed, Thu, Fri | Sat, Sun, Tue |
| Travel | Mon, Wed, Thu | Tue, Sat (travel-loss days) |
| Business launch (trade) | Wed (Merc), Thu (Jup) | Sat, Tue |
| Business launch (arts/luxury) | Fri (Ven), Thu | Sat |
| Medical / surgery | **Tue (Mars)** — preferred for surgical courage | (varies; avoid Wed for surgery — Mercury is too fluid) |
| Foundation / construction | Mon, Thu | Sat, Sun |
| Loan (receiving) | Wed, Thu | Sat |
| Loan (repaying) | Wed, Thu | Sat, Sun |
| Vehicle purchase | Mon, Wed, Thu, Fri | Tue, Sat |
| Griha pravesh | Mon, Wed, Thu, Fri | Tue (heat), Sat (decay), Sun (arguments) |
| Education | Wed (Merc) | Sat |
| Legal filing | Tue (Mars fights), Sat (Saturn delays in the client's favour) | Wed (slippery) |

**Important**: our engine's global "good weekdays = M/W/Th/F" is a simplification.
The per-event table above overrides when an event type is specified.

### 3.5 Karana

- **Avoid absolutely**: Vishti (Bhadra) — causes obstacles, accidents,
  delayed outcomes
- **Fixed karanas**:
  - Shakuni, Chatushpada, Naga — avoid for auspicious events (classical
  Muhurtha Chintamani rule for marriage explicitly)
  - Kimstughna — neutral / mildly favourable

---

## 4. Doshas — The Full Catalogue

### 4.1 Panchaka Dosha

Moon in nakshatras 22-26 (Dhanishta 3rd pada through Revati). Blocks
specific event classes:

| Sub-type | Trigger | Blocks |
|---|---|---|
| **Mrityu Panchaka** | Panchaka + Saturday | Death-like outcomes — avoid all auspicious events |
| **Agni Panchaka** | Panchaka + Tuesday | Fire-related — avoid welding, cooking, fireworks, electrical; avoid vivaha, yatra |
| **Roga Panchaka** | Panchaka + Sunday | Illness — avoid surgery, hospital visits, medical starts |
| **Raja Panchaka** | Panchaka + Monday | Authority — avoid legal, government-office visits, coronation |
| **Chora Panchaka** | Panchaka + Thursday | Theft — avoid money-movement, vault-opening, safe-deposit |

For **marriage**, **griha pravesh**, **yatra**, **vahana kraya**, and
**dhanya sangraha** (grain collection) — Panchaka is unconditionally
blocking regardless of sub-type.

**Exception**: if Lagna SL strongly signifies the event's primary house
and the moment is otherwise flawless, KP practitioners accept Panchaka
with caveat. But classical texts do not allow this.

### 4.2 Tithi Shunya (void tithis)

Certain tithis in certain masas have no astral support. Use the per-masa
table in `panchang.md` §Tithi Shunya. These void tithis cannot host
auspicious starts regardless of other Panchang quality.

### 4.3 Bhadra (Vishti Karana)

7th karana of each half-tithi cycle. Classical: no auspicious event may
start in Bhadra. Even KP respects this hard.

### 4.4 Visha Ghatika (poison window)

A 48-minute (2-ghati) window within each nakshatra, different per
nakshatra, when starting anything is inauspicious. Sometimes called
Yama Ghantam (when from Moon's perspective). Separate from Varjyam.

Rough rule: the Visha Ghatika occurs at nakshatra-elapsed percentages
specific to each nakshatra (classical table — 24 ghatikas per nakshatra;
Visha occupies specific 2-ghati slots — e.g., for Rohini it's the 4th
ghati).

### 4.5 Varjyam (avoid) and Amrit Kala (nectar)

- **Varjyam**: a 96-min slot in each nakshatra, DO NOT start anything
  (includes answering phone calls, signing, payments). Derived from
  nakshatra-elapsed fraction (per-nakshatra table in Panchang KB).
- **Amrit Kala**: opposite — a 96-min slot, ANYTHING started here is
  blessed. Occurs specific ghatis after nakshatra onset.

Our Panchang engine computes both. Muhurtha engine should score:
- In Amrit Kala → +20
- In Varjyam → −25

### 4.6 Kartari Dosha (scissor)

When malefics flank the muhurtha Moon or Ascendant (e.g., malefic in
sign before + sign after), the event is "cut by scissors". Avoid.

Formal check: for planet M (Moon or Lagna), count signs from M clockwise
and counterclockwise — if malefics exist on both sides within 3 signs,
Kartari is active.

### 4.7 Ekargala Dosha

Sun and Moon in the same sign at muhurtha moment = Ekargala. Blocks
auspicious starts. Peak on Amavasya.

### 4.8 Nakshatra Vedha

Each nakshatra has a pairing ("vedha pair"); when Moon is in nakshatra
A, starting an event while A's vedha partner is transiting certain
cusps blocks the effect. Primarily relevant to advanced muhurtha
chintamani rules; not commonly enforced in modern KP practice.

### 4.9 Combustion of Venus / Jupiter (for vivaha)

Classical marriage rule: no muhurtha while **Venus is combust (asta)**
or **Jupiter is combust (asta)**. Combustion = within 9° of Sun for
Venus, 11° of Sun for Jupiter.

### 4.10 Chandrashtamam (8th-from-Moon)

For a given participant, if the muhurtha moment's Moon is in the 8th
rashi from their natal Moon — hard reject. Applies per person, not per
event. Classical explicit rule.

### 4.11 Janma Tara

Moon in the participant's own birth nakshatra at muhurtha moment =
Janma Tara (1st of the 9-tara cycle). Avoid for that person.

### 4.12 Gandanta

Junctions of water signs and fire signs (end of Cancer + start of Leo,
etc.) + specific nakshatra pada junctions. Inauspicious for births,
muhurthas, and transits. Classical.

---

## 5. Lagna Shuddhi

### 5.1 Lagna Type Preference by Event

Indian zodiac signs fall into three types:

- **Movable (Chara)** — Aries, Cancer, Libra, Capricorn. Good for:
  travel, sales, launches, purchasing vehicles, beginnings that move.
- **Fixed (Sthira)** — Taurus, Leo, Scorpio, Aquarius. Good for:
  foundations, griha pravesh, installations, contracts meant to last,
  coronations.
- **Dual (Dwisvabhava)** — Gemini, Virgo, Sagittarius, Pisces. Good for:
  education, partnerships, diplomacy, communications, intermediary
  work.

Our engine should weight Lagna type per event (+15 for matching,
−10 for mismatching on critical events like griha pravesh).

### 5.2 Lagna Lord Placement

- Lagna lord in 1/4/5/7/9/10/11 → strong muhurtha
- Lagna lord in 6/8/12 → weak; avoid
- Lagna lord retrograde → −15 (already in engine)
- Lagna lord combust → -15 additional

### 5.3 8th House Occupancy

Classical absolute rule: **no planet in the 8th house** at muhurtha
moment. If a malefic (especially Saturn, Mars, Rahu) is in the 8th
cusp within ±5°, hard reject.

### 5.4 Navamsa Lagna (Vivaha)

Specifically for marriage — the D9 Lagna should also be clean. If the
D9 Lagna sign is heavily afflicted (malefic aspects, 6/8/12 placement
of D9 lagnesh), defer. Not enforced in our engine today.

---

## 6. The 30 Muhurtas of the Day

The day (sunrise → sunset) is divided into 15 muhurthas of ~48 minutes
each; the night (sunset → next sunrise) similarly. Each has a name
and quality:

| # | Day | Night |
|---|---|---|
| 1 | Rudra | Shiva |
| 2 | Ahi | Ajapada |
| 3 | Mitra | Ahirbudhnya |
| 4 | Pitru | Pushan |
| 5 | Vasu | Ashwini |
| 6 | Vara | Yama |
| 7 | Visvadeva | Agni |
| 8 | **Abhijit** (centre, solar noon) | Brahma |
| 9 | Vidhi | Chandra |
| 10 | Sutamukhi | Aditi |
| 11 | Puruhuta | Jiva |
| 12 | Vahini | Vishnu |
| 13 | Naktanakara | Sumukhi |
| 14 | Varuna | Shakra |
| 15 | Aryaman | Ananta |

**Abhijit Muhurta** = the 8th day-muhurtha, centred on solar noon,
universally auspicious EXCEPT on Wednesday. A 48-min window where a
moderately weak muhurtha can still succeed.

---

## 7. Ruling Planets (RPs) at the Muhurtha Moment

The 5 RPs at any given moment + location:

1. **Day Lord (Vara)** — the planet of the weekday
2. **Moon's sign lord**
3. **Moon's star (nakshatra) lord**
4. **Ascendant (Lagna) sign lord**
5. **Ascendant (Lagna) star lord**

Some practitioners include a 6th — **Ascendant sub-lord** — and a 7th —
**Moon's sub-lord**. For DevAstroAI we use the 5-RP version (KSK's
canonical set).

### 7.1 RP Resonance Thresholds

For a muhurtha moment to "favour" a participant, the RPs of the moment
must overlap the participant's natal significators for the event's
house group.

| RPs resonating | Strength |
|---|---|
| 5 / 5 | Extremely rare, peak fructification window |
| 3-4 / 5 | Strong; acceptable for marriage, business |
| 2 / 5 | Acceptable only if DBA also confirms |
| ≤ 1 / 5 | Weak; find another window |

For multi-chart muhurtha, require **min across participants ≥ 2**
unless the event has a clear primary stakeholder.

---

## 8. Multi-Chart (Combined) Muhurtha

This is the methodology for events that must suit multiple participants
simultaneously — marriage (bride+groom), business opening (all partners),
family travel (all members), griha pravesh (whole household).

### 8.1 Hard Filters (any participant fails → reject window)

1. **Chandrashtamam** — Moon in 8th rashi from their natal Moon
2. **Janma Tara** — Moon in their janma nakshatra
3. **Badhakesh active** — any current DBA lord is their natal badhakesh
4. **Marakesh active** — any current DBA lord is their natal marakesh
5. **Venus/Jupiter combust** (vivaha only)

### 8.2 Soft Scoring (0-100 per participant)

For each participant at the candidate moment:

| Factor | Points |
|---|---|
| RP resonance count × 10 | 0-50 |
| DBA grade (A/B/C/D mapping 30/20/10/0) | 0-30 |
| Tarabala class (Sampat/Kshema/Sadhaka/Mitra/Atimitra = good, others = partial) | 0-20 |

### 8.3 Aggregation by Event

| Event | Aggregation | Notes |
|---|---|---|
| Marriage | `min(bride, groom)` | Both must be ≥ threshold; no one-sided wins |
| Business (equal partners) | `min(all)` | All must pass |
| Business (primary + silent) | `0.6·primary + 0.4·avg(others)`, require primary ≥ 70 | Weighted |
| Family travel | `0.5·head + 0.5·avg(others)`, require head ≥ 70, all ≥ 50 | Heavy weight on primary |
| Griha pravesh | `0.5·breadwinner + 0.5·avg(others)` | Same as travel |
| Medical procedure | `patient_score × 0.8 + attending_score × 0.2` | Patient primacy |

### 8.4 Dasha Parallel Rule

For marriage specifically: **bride and groom should not be running the
same Mahadasha lord in parallel**. If unavoidable, groom's dasha should
chronologically precede bride's by at least a few months. This is a
classical Muhurtha Chintamani rule.

### 8.5 Extend-Window Rule (classical)

If NO candidate window in the client's requested range passes all hard
filters, the correct astrological answer is:

> "No qualifying muhurtha exists in your window. The next qualifying
> date is [X], which is [N] days away. If possible, wait."

This is NOT "best of bad". Classical muhurtha explicitly allows — and
encourages — deferral. The user's dad's exact practice. The tool must
surface the blocking reason (e.g., "groom's Chandrashtamam runs from
Apr 25 – May 2; your whole range is inside it").

---

## 9. Event-Specific Playbooks

### 9.1 Marriage (Vivaha)

- **Solar month rule**: Sun must be in Mesha, Vrishabha, Mithuna,
  Vrischika, Makara, or Kumbha. Sun in Karka, Simha, Kanya, Tula,
  Dhanus, Meena → avoid.
- **No marriage while Venus or Jupiter is combust** (asta).
- **Lagna**: any except 6/8/12 of either partner's natal. Fixed/dual
  preferred over movable.
- **Moon**: in 1/3/4/5/7/8/9/10/11 from Lagna of muhurtha. Avoid 6, 12
  and malefic-influenced 2.
- **Jupiter aspect** on muhurtha Lagna, Moon, or 7th cusp strengthens
  the marriage.
- **Panchang**: Rohini, Mrigashira, Hasta, Anuradha, Swati, Magha,
  U-Phalguni, U-Ashadha, U-Bhadrapada, Revati are preferred
  (Muhurtha Chintamani marriage nakshatras).
- **Avoid**: Bharani, Krittika, Ashlesha, Magha pada 4, Jyeshtha, Moola,
  all Ugra + Tikshna classes.

### 9.2 Business Launch / Shop Opening

- **Lagna SL** signifies 2, 6, 10, 11. Must not signify 5, 12.
- **10th cusp SL** signifies 10 itself or 11 or 2 (ideal) — this is the
  "success of business" cusp.
- **Jupiter or Mercury** aspecting the muhurtha Lagna is positive.
- **Retail/trade**: prefer Mercury hora (Wed, or the 1st/8th/15th/22nd
  horas on other days). Prefer Mercury-ruled nakshatras (Ashlesha,
  Jyeshtha, Revati).
- **Food/restaurants**: prefer Venus hora, Moon hora. Pushya, Rohini,
  Mrigashira, Chitra nakshatras.
- **Tech/modern**: Mercury, Rahu (unconventional) favoured. Avoid only
  if Rahu is in exact conjunction with muhurtha Moon.

### 9.3 Griha Pravesh

- **Masa**: Magha, Phalguna, Vaishakha, Jyeshtha. Avoid Chaitra,
  Pausha, Ashadha, Bhadrapada, Ashvina, Kartika (per Muhurtha
  Chintamani).
- **Nakshatra**: Anuradha, Uttara-Phalguni, U-Ashadha, U-Bhadrapada,
  Rohini, Mrigashira, Chitra, Revati, Dhanishta, Shatabhisha.
- **Lagna**: fixed Lagna preferred (permanence). Lagna lord in
  1/4/9/11. Jupiter in kendras strengthens.
- **Avoid**: Panchaka, Bhadra, Krishna Paksha's last quarter
  (Shashti-Ashtami of Krishna), Rahu Kalam.
- **Weekday**: Mon, Wed, Thu, Fri.

### 9.4 Travel (Yatra)

- **Direction** matters (Disha Shula — forbidden direction per day):
  - Mon: East · Tue: North · Wed: North · Thu: South · Fri: West · Sat: East · Sun: West
  - Avoid travelling TOWARD the forbidden direction. If unavoidable,
    specific remedies (e.g., drink yogurt before leaving on Wed for a
    North journey) apply.
- **Nakshatra**: Chara class (Swati, Punarvasu, Shravana, Dhanishta,
  Shatabhisha) especially suited. Also Ashwini, Mrigashira, Punarvasu,
  Pushya, Hasta, Anuradha, Shravana, Revati.
- **Lagna**: movable preferred.
- **Avoid**: Moon in 4 (staying at home), 8 (danger), 12 (loss). Bhadra.
  Panchaka (except for Chora Panchaka, which is specifically dangerous
  for carrying valuables).

### 9.5 Surgery / Medical Procedure (Shastrakarma)

- **Nakshatra**: Tikshna class (Ardra, Ashlesha, Jyeshtha, Moola) —
  classically RECOMMENDED for surgery because their "sharpness" is
  the correct tool-energy. Modern practitioners sometimes avoid them
  for fear; we prefer them for precision surgery.
- **Weekday**: **Tuesday (Mars)** is preferred — Mars rules blades,
  cutting, precision.
- **Lagna SL**: must signify 1 (body/life) and 11 (recovery).
  Must NOT signify 8 (death) and 12 (hospital admission/permanent
  loss).
- **Moon**: must NOT be in the sign corresponding to the body part
  being operated on (e.g., avoid Moon in Leo for heart surgery,
  Moon in Virgo for intestinal surgery — the Kalapurusha rule).
- **Avoid**: Amavasya, eclipse days (±3 days), Panchaka, Bhadra, combust
  Moon.

### 9.6 Vehicle Purchase

- **Nakshatra**: Chara class preferred. Also Ashwini, Mrigashira, Pushya,
  Hasta, Anuradha, Revati.
- **Lagna SL** signifies 4 (vehicle), 3 (short journeys), 11 (gains).
  Avoid 8 (accident), 12 (loss/theft).
- **Weekday**: Mon, Wed, Thu, Fri.
- **Avoid**: Bhadra, Panchaka.

### 9.7 Education Start (Vidyarambha, starting a new course)

- **Nakshatra**: Ashwini, Mrigashira, Punarvasu, Pushya, Hasta, Chitra,
  Swati, Anuradha, Shravana, Revati.
- **Lagna SL** signifies 4 (education) and 9 (higher learning).
- **Mercury** well-placed strengthens studies; Jupiter for wisdom.
- **Weekday**: Wednesday (Mercury) ideal.

### 9.8 Property Purchase

- Same as Griha Pravesh for final possession; for agreement signing,
  prefer Lagna SL signifying 4 (property) and 11 (gains), NOT 3 (sale
  from seller's POV can be a trap) or 12 (loss).
- **Fixed Lagna** preferred for permanence.

---

## 10. KP Divergence from Classical

Points where KP practitioners (especially KSK school) diverge from
strict Muhurtha Chintamani:

1. **KSK Reader 4, pg. 168-170**: "When the sub-lord of the Lagna
   signifies 2, 7 and 11, the marriage succeeds — regardless of
   whether the Panchang classifies the tithi as Rikta or not."
   KP prioritizes sub-lord; classical prioritizes Panchang.
2. KP **ignores** most soft Panchang tests when sub-lord strongly
   confirms. Our engine respects both (additive scoring) — which
   aligns with modern hybrid KP practice.
3. KP **respects** Rahu Kalam and Yamagandam as hard avoidances
   (anecdotally — KSK wrote that while these are "traditional", the
   sub-lord's signification is still primary. Modern KP practitioners
   treat them as soft to hard depending on event severity).
4. KP **does not use** Choghadiya as scoring input (Choghadiya is a
   Panchang concept, not KP). Our engine respects this.
5. KP **uses** Tara Bala and Chandrabala — they are Panchang-classical,
   but KSK retained them for participant-specific checks.

---

## 11. Scoring Ranges (for the LLM)

| Aggregate score | Quality | Advice |
|---|---|---|
| ≥ 95 | Excellent | "This is a rare, fully-aligned window. Recommend proceeding." |
| 65-94 | Good | "Strong window. Proceed with standard preparation." |
| 35-64 | Fair | "Usable with remedies; consider waiting if a better window is near." |
| < 35 | Weak | "Defer if possible. Look beyond the client's range." |

---

## 12. AI Response Rules

When a user asks about a muhurtha window, the AI MUST:

1. **Cite the Lagna SL** and the houses it signifies (from the window
   data). This is the first sentence of any analysis.
2. **Name the dominant Panchang factor** (tithi / nakshatra / yoga)
   and say whether it supports or contradicts.
3. **For multi-chart queries**, show a per-participant breakdown:
   Chandrashtamam pass/fail, Tarabala class, DBA status, RP count.
4. **If hard-filtered for any participant**, say explicitly which
   participant failed which filter.
5. **Never recommend a window scored <35** without flagging it.
6. **If the tool returns an `extend_suggestion`**, surface it
   prominently and explain what blocks the client's range.
7. **Never invent classical rules**. If an event type isn't in
   this KB, reason from the closest analogue + primary-house KP logic.

---

## 13. Cross-References

- `panchang.md` — for all Panchang-layer rules (tithi, nakshatra, yoga,
  karana, kalam, Varjyam, Amrit Kala, Panchaka)
- `horary.md` — Ruling Planets methodology overlaps
- `.claude/research/muhurtha-audit.md` — implementation plan + gap
  analysis

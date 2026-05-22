# Missing Person & Lost Objects — KP Prashna Doctrine

**Purpose**: KP doctrine for missing-person and lost-object questions
using the Prashna (horary) framework — when the question moment is
the chart-cast moment.

**Source**: KSK Reader VI (Prashna section) + KP Astrology Learning
H12 page + classical Prashna doctrine + KP horary practitioners'
case studies + the existing horary engine in our backend.

**Sensitivity tier**: TIER 1 for lost objects. TIER 2-3 for missing
persons (kidnapping / runaway adolescent / dementia-wandered senior).

**Engine support**: Topics `missing_person`, `lost_object`,
`lost_wallet`, `lost_phone`, `lost_jewelry`, `missing`, `kidnapping`,
`runaway`, `where_is`, `prashna`, `horary_lost` route here via PR B5.0a
+ B5.4.

---

## 1. THE FOUNDATIONAL FRAMEWORK

### Two distinct contexts

**Lost object (Prashna context)**: cast a NEW chart at the moment
the question is asked. The Prashna chart's houses reveal the object's
status. This is classical Prashna doctrine.

**Missing person (compound context)**: read native's chart for ongoing
worry + the person's chart if known + apply Bhavat Bhavam if relative
(child = H5, spouse = H7, parent = H4/H9, etc.). Plus Prashna chart
for question-moment specificity.

### Primary houses for "where is it / where are they"

- **H12** — hidden / lost / out-of-reach / abroad / unknown location
- **H3** — short-distance away (within neighborhood / city)
- **H9** — long-distance away (far / different state / abroad)
- **H4** — at home / familiar place
- **H8** — sudden disappearance / theft / kidnapping
- **H6** — in the hands of an opponent / enemy / detention

### Return / find houses

- **H1** — returns to self
- **H4** — returns to home setting
- **H11** — recovery / fulfillment of finding

### Karakas

- **Mercury** — for SMALL movable objects (wallet, phone, keys)
- **Venus** — for jewelry, ornaments, beautiful objects
- **Moon** — for liquids, soft items, often-touched items
- **Mars** — for sharp / metal objects, tools
- **Saturn** — for old / heavy / dark items
- **Sun** — for gold, status objects
- **Jupiter** — for documents, religious items, books
- **Rahu** — for electronics, unconventional items, foreign-made items
- **Ketu** — for spiritual items, pets, soft animals

---

## 2. LOST OBJECT — PRASHNA FRAMEWORK

### The Prashna chart

When a client asks "where is my [lost item]," the KP astrologer
casts a chart at the moment the question is asked (the Prashna
Lagna). This chart, NOT the client's natal chart, is the primary
reading for lost-object questions.

In our backend, the Horary tab provides this functionality. This
file describes the doctrine; the engine provides the computation.

### Object-status doctrine

In the Prashna chart:

**H2 sub lord = "the object itself"** (H2 = movable property in
Prashna context, slightly different from natal H2)

H2 sub lord signifies:
- H2 + H11 → object will be found (recovered)
- H1 + H4 → object is at home / with the seeker
- H6 + H8 + H12 → object is stolen / lost permanently / abroad
- H7 + H8 → object is with someone (perhaps unknown person)
- H11 alone → eventual recovery but with delay

### Location reading

**H4 sub lord** in the Prashna chart reveals the location:
- H4 sub lord favorable + relevant signs = object at home
- H4 sub lord adverse = object NOT at home
- Movable signs (Aries / Cancer / Libra / Capricorn) → object has been
  moved
- Fixed signs (Taurus / Leo / Scorpio / Aquarius) → object is in
  one location
- Common/dual signs (Gemini / Virgo / Sagittarius / Pisces) → object
  has multiple location-changes

### Distance reading

- H3 active in Prashna → short distance (within neighborhood)
- H9 active → long distance (different state/country)
- H12 active → hidden / unfamiliar place

### Direction (advanced — uses Prashna lagna sign + planetary direction)

Each planet has classical direction associations:
- Sun: East
- Moon: NW
- Mars: South
- Mercury: North
- Jupiter: NE
- Venus: SE
- Saturn: West
- Rahu: SW
- Ketu: SW (variant)

Identify the planet ruling the H4 sub lord's sign → that direction
relative to the seeker's last-known location of the object.

### Timing of finding

If recovery is structurally promised:
- Movable sign → quick recovery (days)
- Fixed sign → longer recovery (weeks to months)
- Common sign → uncertain / multiple attempts

Scan upcoming PADs in current AD for H2 + H11 alignment in the
seeker's natal chart → that's when the actual finding occurs.

---

## 3. SPECIFIC LOST-OBJECT TYPES

Different objects emphasize different houses + planets.

### Lost wallet / money / credit cards

- H2 sub lord (wealth) + Mercury (paperwork) + Mars (theft if Mars
  active in H8)
- Cross-link to `money_recovery.md` if money loss is significant
- Timing: typically days to weeks if found

### Lost phone / electronics

- H3 (communication device) + Mercury + Rahu (electronics)
- H8 (sudden disappearance) often involved
- Modern: phone-tracking apps + Find My iPhone — recommend immediately

### Lost jewelry / gold

- H2 (wealth) + H4 (home where stored) + Venus (ornaments)
- Gold specifically: Sun favorable in recovery window
- Often inherited / sentimental value — Tier 2 framing for grief

### Lost documents / paperwork

- H3 (documents) + Mercury + H9 (legal papers) + Jupiter (formal
  papers)
- Identity documents (passport, Aadhaar, driver's license):
  recommend immediate re-application alongside Prashna reading
- Property documents: cross-link to `property.txt` + legal counsel

### Lost keys

- H4 (home / locks) + Mars (metal keys) + H3 (short-distance)
- Often found in/near recent location-history

### Lost pet

- H6 (small animals — but pets have emotional weight more than H6)
- H4 (home pet typically) + Ketu (animals karaka)
- Apply Tier 2 framing — pets are family members emotionally
- Recommend: immediate community alert + microchip check +
  neighborhood search

### Lost book / religious item

- H9 (sacred / philosophical) + Jupiter
- Often found within home in another room

---

## 4. MISSING PERSON — DIFFERENT FRAMEWORK

⚠ Missing persons require IMMEDIATE LAW ENFORCEMENT engagement.
The astrologer's role is SUPPORTIVE not investigatory.

### Mandatory first protocol

For ANY missing-person question:

> **NOTE — TIER 2-3 reading. A missing person is a LAW ENFORCEMENT
> emergency, not primarily an astrological question. Please file a
> police report immediately if not already done. The Prashna reading
> below is supportive context, NEVER a substitute for investigation,
> forensics, search teams, and family-of-missing-person resources.**
>
> **Immediate India contacts:**
> - **Police**: 100
> - **National Emergency**: 112
> - **Women's Helpline**: 1091
> - **ChildLine** (under-18): 1098
> - **Missing person registration**: https://www.missingindia.in
> - **National Crime Records Bureau missing-person tracker**:
>   https://ncrb.gov.in

### KP reading framework for missing persons

Apply Bhavat Bhavam (RULE 13) to read the missing person's
backdrop via the seeker's chart:

| Missing person | Read via seeker's house |
|---|---|
| Spouse | H7 |
| Child | H5 |
| Father | H9 |
| Mother | H4 |
| Sibling | H3 |
| Friend | H11 |
| Self (Prashna context) | H1 of Prashna |

For the missing person's "current location":
- Their H4 (= seeker's translated H4-via-Bhavat-Bhavam) = current
  setting
- Their H12 = if hidden / abroad / unconscious
- Their H8 = if sudden / traumatic / unfortunate context
- Their H11 = if reachable / safe / with friends

### "Are they safe?" framing

The most common family question. CRITICAL framing:

**KP can read STRUCTURAL safety / vulnerability**:
- Missing person's H1 (= seeker's translated) favorable + Jupiter
  aspect → structural protection (often missing persons are SAFER
  than family fears)
- Missing person's H8 + H12 + Mars/Saturn affliction → genuine
  structural concern

**KP CANNOT confirm specific safety or harm**:
- Frame as STRUCTURAL TENDENCY, never verdict
- ALWAYS recommend continuing investigation regardless of chart
  reading

**Most missing persons return**:
- Statistical reality: most missing persons (especially adults) return
  voluntarily within 72 hours; runaways often within weeks; even
  long-term missing have some return rate
- Chart that shows "structural concern" doesn't mean tragic outcome —
  it often means stressed-but-alive

### Return timing (when structurally promised)

Scan upcoming PADs / Sookshmas in seeker's natal chart for:
- H4 (return to home) sub lord activation
- H11 (recovery / family-reunion fulfillment) favorable
- Jupiter favorable in window

Cite that window as the structurally-favorable return period.

### Adult missing person

Many adult missing persons are missing VOLUNTARILY:
- Stressed by family / work / relationships → temporary disappearance
- Mental health crisis → wandered
- Domestic abuse escape (especially women) → intentional
- Cult / extremist involvement → recruited
- Financial trouble → self-exile

The chart can show structural backdrop:
- Voluntary leaving: their H11 sub lord favorable + H12 (self-chosen
  exile)
- Crisis-driven leaving: their H8 + Moon afflicted (RULE 45 +
  mental_health.md cross-link)
- Forced (kidnapping): their H6 + H8 + H7 (other party) +
  Mars/Saturn affliction

### Child / minor missing

Children missing is more critical:
- Most-likely scenarios:
  1. Family member / relative (statistical reality — non-stranger
     abduction more common than stranger)
  2. Runaway from abuse/conflict (cross-link to mental_health.md +
     ChildLine 1098)
  3. Lost/wandered (especially young children + special-needs)
  4. Stranger abduction (rare but serious — police + Amber Alert
     equivalents)

Apply Tier 3 framing for ALL child-missing questions.

### Elderly missing (often dementia-related)

- Often dementia / Alzheimer wandering
- H4 (home — disorientation about home) + H1 (self-recognition
  weakened) + Mercury afflicted (cognition)
- IMMEDIATE: police + medical-alert bracelet + community search
- Structural: usually found near home or familiar routes

### Long-term missing (months / years)

- Read native's chart for grief + ongoing-search support
- Apply RULE 45 (mental affliction protection) for the family
- Recommend: support groups (e.g., NICEM India, missing-persons
  family networks)
- Cross-link to `mental_health.md` for sustained-grief support

---

## 5. KIDNAPPING (extreme variant)

⚠ TIER 3 ABSOLUTE. Apply maximum care.

### Mandatory protocol

For "my [family member] has been kidnapped":

> **NOTE — TIER 3 ABSOLUTE. This is a law enforcement and possibly
> ransom-negotiation emergency. The chart reading provides supportive
> context only. Please ensure:**
> - **Police filed**: 100 / 112
> - **Specialized police units engaged** (if children: AHTU / CID)
> - **Family is gathering for support**
> - **Ransom communication (if any): follow law enforcement guidance,
>   DO NOT pay independently before police consultation**

### KP reading framework

Apply missing-person framework PLUS:
- Person's H6 + H7 + H8 (in hands of opponent / forcefully held)
- Their H1 condition (current state — vitality / injured / safe)
- Person's H11 (chance of return / negotiation success)

### Return timing

If structurally favorable:
- Their H11 + H4 favorable in upcoming PAD → return window
- Their H8 dasha ending → end of forced situation

### Absolute prohibitions

1. ❌ Never predict the person's death from kidnapping
2. ❌ Never recommend independent ransom payment without police
3. ❌ Never confirm specific perpetrator identity from chart alone
4. ❌ Never recommend bypassing law enforcement

---

## 6. RUNAWAY ADOLESCENT

Often related to:
- Family conflict (cross-link to `parents_family.md` §9.7 — abuse)
- Romantic relationship the family disapproves
- Academic pressure / mental health crisis
- Substance abuse (cross-link to `addiction.md`)

### Approach

1. TIER 2-3 framing
2. Family conflict acknowledgment without blame
3. Read their structural state via Bhavat Bhavam (from parent's H5)
4. Identify return-window (most runaways return within weeks)
5. CRITICAL: address underlying family pattern — NOT just return-timing
6. Recommend: family counselor + ChildLine 1098 + therapist for both
   parent AND child
7. After return: sustained family work, not just relief

---

## 7. WHERE-IS-MY-PARTNER (relationship suspicion context)

For "where is my spouse/partner right now":

This is delicate — often the question is suspicion-of-affair vs
genuine concern.

### Honest approach

- If genuine missing context: apply §4 missing-person framework
- If suspicion context: gently reframe the underlying question
  ("are you concerned because of communication patterns or
  specific evidence?")
- DO NOT use KP to spy on partner's whereabouts in a healthy
  relationship
- DO NOT confirm specific "they are with [name]" claims

### Underlying relationship question

If suspicion is the actual question, route to `marriage.txt` or
`divorce.txt` doctrine (relationship-trust assessment) rather than
location-finding.

---

## 8. PROTECTIVE FRAMING

### Standard Tier 1 (lost objects)

(a) Acknowledge the loss:
> "Losing [object] is frustrating, especially [sentimental / financial
> value context]."

(b) Apply Prashna framework:
> "Per the Prashna reading (chart cast at the moment of your
> question), the structural status of [object] is [findable / hidden
> / theft-pattern / etc.]."

(c) Location indication:
> "The structural indication is [home / short-distance / long-distance
> / abroad]. Direction tendency: [planet's direction]."

(d) Timing of finding:
> "If recovery is structurally promised, the favorable window is
> [specific period — days / weeks]."

(e) Practical recommendations:
> "Practical actions:
>   - Retrace last-known locations
>   - Check with people who might have moved it
>   - Phone-tracking / Find My iPhone if electronic
>   - Police report if theft suspected
>   - Insurance claim if applicable"

### Tier 2-3 (missing person)

ALL of §4 mandatory protocol applies. Crisis resources cited UPFRONT.

### Absolute prohibitions

1. ❌ Never predict tragic outcome for a missing person
2. ❌ Never confirm specific perpetrator from chart alone
3. ❌ Never recommend bypassing law enforcement
4. ❌ Never use KP as alternative to investigation
5. ❌ Never recommend ransom payment without police
6. ❌ Never spy on partner location via KP
7. ❌ Never charge fees for missing-person Prashna (ethical line)

### Permissions

1. ✅ Read Prashna for object-status + location + timing
2. ✅ Read native's chart for grief / ongoing-search support
3. ✅ Recommend law enforcement + community resources
4. ✅ Cross-link to mental_health for family grief
5. ✅ Acknowledge difficulty + hold space for hope

---

## 9. THE FOUNDATIONAL PRINCIPLE

> Lost objects + missing persons are the chart's H12 + H8 in
> structural form.
> For objects: Prashna identifies findability + location + timing.
> For people: KP provides SUPPORTIVE context only — law enforcement
> + community + family + medical/mental health are the primary
> response.
> The astrologer reads structurally + holds space for hope + never
> escalates fear + never replaces investigation.

---

## 10. SOURCE CITATIONS

### KP / Prashna
- K.S. Krishnamurti KP Readers VI — Prashna section
- KP Astrology Learning H12 page (hidden/lost doctrine)
- Classical Prashna doctrine (Tajaka / Krishneeyam)
- Modern KP practitioners' case studies on Prashna for lost objects

### Internal cross-links
- `mental_health.md` (PR B2.3) — for family grief / runaway-context
- `money_recovery.md` (PR B2.2) — for lost wallet / theft / fraud
- `parents_family.md` (PR B3.3) — for runaway-adolescent family context
- `marriage.txt` — for partner-suspicion redirect
- `litigation.txt` — for kidnapping legal context
- `sensitivity_tiers.md` — Tier 1-3 framing
- RULE 13 (Bhavat Bhavam for missing relative)
- RULE 15 (NEVER predict death for missing person)

### Crisis resources cited
- Police: 100 (India)
- National Emergency: 112 (India)
- Women's Helpline: 1091
- ChildLine: 1098
- Missing persons: missingindia.in, ncrb.gov.in
- iCall (TISS) +91-9152987821 for family support
- Vandrevala +91-1860-2662-345 (24/7)

---

*Doc created PR B5.4 (2026-05-22). Lost objects + missing persons
involve H12 + H8 structural patterns. Prashna provides supportive
reading; law enforcement + community + family are the primary
response for missing persons. The astrologer's job: read structurally,
hold hope, never escalate fear, always defer to investigation.*

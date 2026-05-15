# KP Ruling Planets (RP) — Deep Reference

**Source**: KSK KP Reader IV (Marriage and Married Life) + Reader V
(Predictive Astrology), where KSK developed the Ruling Planets concept
as the moment-of-judgment confirmation overlay. Verified against
KP-tradition authorities (kpastrology.com, krishnamoortypaddhati blog).

**Why this file exists**: Our existing KB has RP methodology scattered
across `general.txt §5`, RULE 18, RULE 21, and various topic files.
This file consolidates RP into a single deep reference: what RPs are,
their strength order, how to read them, and how to use them for timing
confirmation. A 20-year-experienced KP astrologer leans heavily on RP
— it's the difference between a chart-only read and a query-moment-
aware read.

**Position vs CSL**: CSL = the chart's PROMISE (does the event happen
at all?). RP = the moment's TIMING (when, and which planets fire it).
Both layers are required for KSK-grade prediction.

---

## 1. What Are Ruling Planets

KSK's definition: **At any moment of judgment** (when the astrologer
takes up the question OR when an event is being timed), the planets
that govern that moment via the Ascendant and Moon at that moment
are called the **Ruling Planets** (RPs).

**Critical distinction** — the RPs at consultation moment are NOT the
same as the natal chart's Ascendant + Moon planets. They're computed
for the CURRENT moment + CURRENT location of the consultation.

This is why our engine:
- Computes RPs for **current time + current location** (not natal chart)
- Per CLAUDE.md fix-21 onward, we plumb live geolocation through to RP
  computation — Tara Bala uses natal Moon nakshatra, but RP uses
  current-moment astronomy

---

## 2. The 5 Original Ruling Planets (KSK strict)

In strength order (strongest → weakest):

| # | Planet | Why |
|---|---|---|
| 1 | **Ascendant Star Lord** (Lagna Nakshatra Lord) | Strongest. The nakshatra (constellation) lord of the Ascendant degree at the consultation moment |
| 2 | **Ascendant Sign Lord** (Lagna Rasi Adhipati) | Sign lord of the Ascendant. The body/personality axis at this moment |
| 3 | **Moon Star Lord** (Chandra Nakshatra Adhipati) | Star lord of where the Moon is right now. Moon = mind/emotion at this moment |
| 4 | **Moon Sign Lord** (Chandra Rasi Adhipati) | Sign lord of Moon's current position |
| 5 | **Day Lord** (Vara Adhipati) | The weekday lord. Sun=Sunday, Moon=Monday, Mars=Tuesday, Mercury=Wednesday, Jupiter=Thursday, Venus=Friday, Saturn=Saturday. Weakest of the 5 |

**Key rule** (KSK Reader IV verbatim, paraphrased): "Among the ruling
planets, **Ascendant Nakshatra Lord** is the most powerful, and **Day
Lord** is the least powerful."

---

## 3. The Extended 7 RPs (later addition)

Some KP authorities (post-KSK but widely accepted in tradition) add:

| # | Planet | Status |
|---|---|---|
| 6 | **Ascendant Sub Lord** (Lagna Sub Adhipati) | Added by later KP practitioners. Some accept (it captures the precise moment), some reject (post-KSK addition) |
| 7 | **Moon Sub Lord** (Chandra Sub Adhipati) | Same as above — extended adoption |

**Our engine emits BOTH the 5-RP and 7-RP versions**. The 7-RP version
is presented to the LLM as the standard set since it adds precision
without adding controversy (sub-lord is in KSK's original framework,
unlike Khullar's SSL). When in genuine doubt, defer to the 5 original
in strength ranking.

---

## 4. The Three Critical Applications of RP

### 4.1 Birth Time Rectification (BTR)

**KSK rule**: At the moment of the astrologer taking up the question,
note the RPs. The RPs at that moment **MUST** correspond to the
significators of the Ascendant in the native's birth chart. If they
don't, the recorded birth time is incorrect and needs adjustment.

Specifically, the **Ascendant Star Lord** at consultation moment should
match (or be in the chain of) the native's natal **Ascendant Star Lord
or Sub Lord or Sign Lord**. Same check for Moon.

**Implication for AI output**: When an astrologer-mode user gives a
chart and the AI computes a verdict, if the verdict is borderline
(e.g., CSL within 0.3° of nakshatra boundary), the AI should mention:
> "If your birth time is uncertain by even 4 minutes, the Ascendant
> sub lord could change, which would flip this verdict. KP rectification
> using Ruling Planets at the time of this query can refine the birth
> time. The user is welcome to consult a practicing KP astrologer for
> formal BTR."

This is honest framing — it acknowledges KP's known precision-floor
limitation without claiming the AI itself can rectify.

### 4.2 Significator Confirmation (Fruitful Significator Rule)

**KSK rule**: When multiple planets are significators of a relevant
house group, the ones that ALSO appear in the current RP set are
**FRUITFUL SIGNIFICATORS** — they're the planets that will actually
fire the event during their dasha-bhukti.

A non-fruitful significator (significator but not RP) is structurally
present but timing-inactive at the query moment.

**Practical use**: When forecasting which upcoming AD will trigger an
event, the AD lord should ideally be:
1. A significator (A, B, C, or D-level) of the relevant house group
2. ALSO an RP at the query moment
3. AD timing aligns with the structural promise

If all 3 conditions met → **JOINT PERIOD PRINCIPLE** fires (see §6).

### 4.3 Horary / Prashna Confirmation

**KSK rule**: For horary questions (KP horary numbers 1-249), the
sub-lord of the horary cusp must match (or be in the star chain of)
one or more RPs at the moment of the question. If RPs don't agree
with the horary verdict, the question wasn't validly posed (querent
distracted, indirect intent, etc.) — KSK calls this "rejected by
RP."

For natal-chart questions (Analysis tab), the RP role is subtler —
RPs confirm that THIS MOMENT is the right moment to be giving this
verdict. If RPs are completely disconnected from the chart's
significators, the verdict is structurally correct but **not
timely** (the answer is "yes the event is promised, but the
question is being asked at a moment when the timing thread is
elsewhere — wait for re-query at a different moment").

In practice for our AI: just emit the RP overlap with significators
as confidence signal; don't reject the question.

---

## 5. The Strength Ladder for "Fruitful Significator" Counting

When counting how many RPs a significator hits, weight by strength:

| Match | Weight |
|---|---|
| Significator is the **Asc Star Lord** RP | 5 (strongest) |
| Significator is the **Asc Sign Lord** RP | 4 |
| Significator is the **Moon Star Lord** RP | 3 |
| Significator is the **Moon Sign Lord** RP | 2 |
| Significator is the **Day Lord** RP | 1 (weakest) |
| Significator is the **Asc/Moon Sub Lord** (extended) | 2 each |

**Confidence interpretation**:
- 1 strong-RP-significator overlap (Asc Star Lord = significator of
  relevant houses) → high-confidence single signal
- 2 medium-strength overlaps → solid timing signal
- 3+ overlaps with mixed strengths → very strong joint period signal
- Zero overlap → structural promise present but timing unconfirmed at
  this moment

The engine's `decision_support` block computes this overlap; the AI
output should EXPLICITLY name which RPs match which significators
(don't just say "X significators are RP" — name them).

---

## 6. Joint Period Principle (KSK + AI extension)

**KSK rule**: An event fires when:
- Mahadasha lord is a significator of the relevant house group
- AND Antardasha lord is a significator of the relevant house group
- AND Pratyantardasha (or Sookshma) lord is a significator
- AND **at least ONE of MD/AD/PAD is an RP at the moment of judgment**

When all 4 conditions met → **JOINT PERIOD** active → event likely
manifests within the PAD/Sookshma window.

**For our AI output**: the DIRECT VERDICT should explicitly evaluate:
> "Joint Period Active: Yes/No.
> MD lord X — significator? Y/N. RP? Y/N.
> AD lord Y — significator? Y/N. RP? Y/N.
> PAD lord Z — significator? Y/N. RP? Y/N.
> At least one of MD/AD/PAD in RP: Y/N."

If all checks pass → "Event firing window is current PAD."
If most pass → "Strong window with one weak link."
If most fail → "Structural promise present but timing not converging
at this moment — next viable window: [analyze upcoming AD/PAD]."

---

## 7. When to USE vs SKIP the RP layer

**USE RPs HEAVILY for**:
- Timing questions ("when will X happen?")
- "Should I do this now?" decisions
- Confirmation of multi-significator scenarios
- KP horary questions (always primary)

**LIGHTER use of RPs for**:
- Pure "is this promised?" verdict (CSL primary)
- Personality / character questions (chart structural)
- Long-range outlook ("life in your 50s")

**SKIP RPs for**:
- Theoretical / educational questions ("what does H7 mean in KP?")
- Multi-chart comparisons (Match tab uses two natals, not query-moment RP)
- Past events being analyzed retrospectively (use natal chart's natal
  Asc/Moon RP at the past moment, not current consultation RP)

---

## 8. Common RP Mistakes to Avoid

❌ **WRONG**: "Saturn is in your chart, so Saturn is your RP."
✓ **RIGHT**: RPs are computed for the MOMENT OF JUDGMENT (now), not from
the natal chart. They change every minute.

❌ **WRONG**: "Day lord is most important RP because it sets the day's
tone."
✓ **RIGHT**: Day lord is the WEAKEST of the 5 RPs (KSK strict). Asc Star
Lord is strongest. Day lord is supplementary.

❌ **WRONG**: "RPs say marriage will happen in 2027."
✓ **RIGHT**: RPs CONFIRM what the chart's promise + dasha says. RPs alone
don't predict events. The chain is: chart promise → dasha timing → RP
confirmation.

❌ **WRONG**: "If RPs don't match the chart's significators, the chart
is wrong."
✓ **RIGHT**: If RPs don't match, EITHER (a) the birth time needs BTR,
OR (b) the question wasn't validly posed at this moment. Don't blame
the chart.

❌ **WRONG**: Counting Rahu/Ketu as primary RPs without proxy resolution.
✓ **RIGHT**: When Rahu or Ketu is one of the RPs, apply the Rahu/Ketu
proxy rule (RULE 8) — they signify through their conjunct planet,
star lord, sign lord. Use the proxy chain to assess the actual RP signal.

---

## 9. RP Output Format (For LLM Reference)

When the AI emits a verdict, the RP section should look like this:

```
RULING PLANETS at query moment (5+2 set):
  1. Asc Star Lord:    [Planet]  ← strongest
  2. Asc Sign Lord:    [Planet]
  3. Moon Star Lord:   [Planet]
  4. Moon Sign Lord:   [Planet]
  5. Day Lord:         [Planet]  ← weakest of original 5
  +6. Asc Sub Lord:    [Planet]  (extended)
  +7. Moon Sub Lord:   [Planet]  (extended)

FRUITFUL SIGNIFICATORS for [topic] (RPs ∩ topic-significators):
  • [Planet] — A/B/C/D-level for {houses}, also Asc Star Lord
  • [Planet] — B-level for {houses}, also Day Lord
  • [Planet] — D-level for {houses}, also Moon Sub Lord

Joint period assessment:
  Current MD lord: [X] — significator (A) + RP (Asc Star) → ★ fruitful
  Current AD lord: [Y] — significator (B) + NOT RP → partial
  Current PAD lord: [Z] — NOT significator + Day Lord RP → weak
  Joint period status: PARTIAL — strong MD signal, weaker AD/PAD
```

This format makes the RP analysis transparent and scannable for a
20-year-experienced KP astrologer reading the AI's output.

---

## 10. Integration with Other Files

This file consolidates RP methodology referenced from:
- `general.txt §5` — original RP overview (kept; this file deepens)
- RULE 18 — engine compute output usage
- RULE 21 — KSK strict timing trigger (AD lord = supporting cusp sub
  lord) — RP overlap is the additional confidence signal
- RULE 21B — PAD vs Sookshma (RPs help discriminate which sub-period
  is the actual firing window)
- `kp_multi_cusp_confirmation.md` — multi-cusp tier interacts with
  fruitful significator count for confidence calibration
- `confidence_methodology.md` — RP overlap is one of the inputs to the
  0-100 confidence score

**Forward note**: When Part E lands, the engine will emit explicit RP
confidence weight (per the table in §5 above) so the LLM doesn't have
to count manually. Until then, the LLM uses the engine's
`fruitful_significators` list and applies its own weighting.

---

## 11. The KSK-Strict Approach to RP

A 20-year-experienced KP astrologer's RP discipline:

1. **Never give a timing verdict without checking RPs** — even if the
   chart promise is strong and dasha aligns.
2. **Never overweight RPs** — they confirm/refine, they don't drive
   the verdict on their own.
3. **Always name the specific RPs** that match significators — not
   just "X is fruitful" but "X is fruitful as the Asc Star Lord RP
   AND the Moon Sign Lord RP."
4. **Use the strength ladder** — Asc Star Lord match >> Day Lord match.
5. **Re-check RPs if the user re-asks** — the moment changes,
   the RPs change, the answer may sharpen or shift.

This is the difference between a textbook KP read and a 20-year
practitioner's read. RPs are the LIVE LAYER on top of the static chart.

# KP Panchang — Grounded Rules for the AI

This file is the authoritative knowledge base for any AI-assisted
explanation of Panchang values. When the astrologer asks "why is today's
yoga marked as inauspicious?" or "what is samvatsara?", the AI must cite
these rules — never general internet astrology and never invent rules.

Source: `.claude/research/panchang-audit.md` (curated research from
KSK's KP Reader, DrikPanchang.com methodology, NOAA Solar Calculator,
Wikipedia Tithi + Samvatsara articles, AstroSage KP references).

---

## The traditional Hindu day boundary (sunrise rule)

The Panchang of a given civil day is computed for the **moment of
sunrise** at the user's location. This means:

- The **tithi at sunrise** is the "tithi of the day", even if it ends
  later that morning. The next tithi label only takes over at the NEXT
  sunrise.
- Same rule for nakshatra, yoga, and karana — all read at sunrise.
- "Sunrise" = upper limb of the sun appearing above the horizon, with
  atmospheric refraction (NOAA standard 0.833°). NOT geometric sun
  centre.

This is why the same calendar day can show different tithis on Indian vs
US Panchangs — the local sunrise moment differs by hours, and a tithi
that's about to end before Indian sunrise might still be active at US
sunrise.

## Sunrise/sunset accuracy

DrikPanchang and our engine both implement Jean Meeus's NOAA algorithm.
Expected accuracy: ±2 minutes vs almanac sources (atmospheric refraction
varies with temperature and humidity, which the algorithm cannot predict).

**For the user's location**: we use the IANA timezone resolved via
`timezonefinder` (offline geographic database), then `astral` library
computes sunrise/sunset for the user's local date with that timezone.

## The 5 angas

| Anga | Definition |
|---|---|
| **Vara (weekday)** | Day of week; Sunday=Sun, Monday=Moon, Tuesday=Mars, Wednesday=Mercury, Thursday=Jupiter, Friday=Venus, Saturday=Saturn |
| **Tithi** | Lunar day. 30 per month: 1-15 Shukla Paksha (waxing) + 1-15 Krishna Paksha (waning). Defined by Sun-Moon longitude difference in 12° increments. |
| **Nakshatra** | Lunar mansion. 27 total, each 13°20'. Moon's sidereal position. |
| **Yoga** | 27 named combinations (Sun + Moon longitudes summed, divided by 13°20'). Some auspicious, some malefic — see table below. |
| **Karana** | Half-tithi (60 per month). 7 cyclic (Bava, Balava, Kaulava, Taitula, Garija, Vanija, Vishti) + 4 fixed (Shakuni, Chatushpada, Naga, Kimstughna). |

## The 9 malefic (papa) yogas

Out of 27 yogas, these 9 are classically classified as inauspicious for
muhurtha purposes:

1. **Vishkambha** (#0) — obstacles
2. **Atiganda** (#5) — extreme ganda (knot/blockage)
3. **Shula** (#8) — pain
4. **Ganda** (#9) — knot/blockage
5. **Vyaghata** (#12) — striking down
6. **Vajra** (#14) — thunderbolt (sudden disruption)
7. **Vyatipata** (#16) — calamity
8. **Parigha** (#18) — barrier
9. **Vaidhriti** (#26) — discord

The remaining 18 are auspicious or neutral. The engine returns
`yoga_quality: "inauspicious"` for the 9 above and `"auspicious"` for
the rest; UI tints malefic yogas red.

## Inauspicious time windows (must avoid)

| Window | When | Duration |
|---|---|---|
| **Rahu Kalam** | One of 8 sunrise-to-sunset segments per weekday (per fixed table) | ~90 min in the day |
| **Yamagandam** | Different segment of same 8-slot system | ~90 min |
| **Gulika Kalam** | Different segment of same 8-slot system. Some traditions consider it favorable for specific karmas. | ~90 min |
| **Durmuhurtha** | 2 muhurtas (each 1/15 of the day) per weekday from a fixed table. Must NOT include slot 7 (Abhijit). | ~48 min × 2 |

Slot tables:
```
Rahu Kalam slots (Mon=1, Tue=6, Wed=4, Thu=5, Fri=3, Sat=2, Sun=7)
Yamagandam slots (Mon=4, Tue=3, Wed=2, Thu=1, Fri=0, Sat=6, Sun=5)
Gulika slots    (Mon=6, Tue=5, Wed=4, Thu=3, Fri=2, Sat=1, Sun=0)
```

## Auspicious time windows (excellent for action)

| Window | When | Duration |
|---|---|---|
| **Brahma Muhurta** | 96 minutes BEFORE sunrise, ending 48 minutes before sunrise | 48 min |
| **Abhijit Muhurta** | 8th of 15 muhurtas (centred at solar noon) | ~48 min, EXCEPT on Wednesday |
| **Amrit Kala** | Derived from Moon's nakshatra; ~96 minutes per day | ~96 min |
| **Choghadiya: Amrit/Shubh/Labh** | 7 segments per half-day with quality labels | varies |

## Panchaka Dosha (PR A1.2d)

When the Moon transits **nakshatras 22-26** (Dhanishta — last half —
through Revati), the condition called **Panchaka** activates. Classical
rule: avoid the following event classes regardless of other Panchang
quality:

- Marriage (vivaha)
- House-warming (griha pravesh)
- Travel (yatra)
- Vehicle purchase (vahana kraya)
- New business / large-venture start

### The five sub-types (by weekday)

Panchaka's flavor depends on the weekday. When Panchaka is active AND
a specific weekday matches, one of five named sub-types activates.

| Sub-type | Weekday | Additionally blocks | Rationale |
|---|---|---|---|
| **Mrityu** | Saturday | **All auspicious events absolutely** | Death-like energy; Saturn (weekday lord) amplifies Panchaka malefic-ness |
| **Agni** | Tuesday | Welding, cooking-starts, fireworks, electrical work | Mars (fire) weekday + Panchaka = fire mishap |
| **Roga** | Sunday | Surgery, hospital admissions, medical procedures | Sun (vitality) weakened by Panchaka = illness |
| **Raja** | Monday | Legal filings, government-office visits, coronation | Moon (public image) + Panchaka = authority conflict |
| **Chora** | Thursday | Money-movement, vault access, safe deposit, valuables travel | Jupiter (wealth) + Panchaka = theft |

On Wednesday and Friday, Panchaka is active but unnamed (generic
avoid — the five universally-blocked events in the list above).

### API fields emitted (PR A1.2d)

- `panchaka_active: bool` — True when Moon in nak 22-26
- `panchaka_subtype: str | null` — "Mrityu" / "Agni" / "Roga" / "Raja" /
  "Chora" when weekday matches; null otherwise (generic Panchaka)
- `panchaka_blocks: list[str]` — event-type keys blocked at this moment

### KP practitioner override

KP (KSK school) sometimes overrides Panchaka when the Lagna Sub Lord
STRONGLY signifies the event's primary houses and the event is NOT in
the universal-block list. Classical Muhurtha Chintamani does not permit
this override — practitioners weigh the two traditions contextually.

## Tithi Shunya (void tithis per masa)

Certain tithis in certain lunar months have no astral support —
"void". Avoid these tithis for **auspicious starts of any kind**
regardless of other Panchang quality.

| Masa (lunar month) | Void tithis | Common western overlap |
|---|---|---|
| Chaitra | Shukla 4, Krishna 4 (tithi 4, 19) | Mar-Apr |
| Vaisakha | Shukla 10, Krishna 10 (10, 25) | Apr-May |
| Jyeshtha | Shukla 5, Krishna 5 (5, 20) | May-Jun |
| Ashadha | Shukla 6, Krishna 6 (6, 21) | Jun-Jul |
| Shravana | Shukla 2, Krishna 2 (2, 17) | Jul-Aug |
| Bhadrapada | Shukla 7, Krishna 7 (7, 22) | Aug-Sep |
| Ashwina | Shukla 8, Krishna 8 (8, 23) | Sep-Oct |
| Kartika | Shukla 9, Krishna 9 (9, 24) | Oct-Nov |
| Margashira | Shukla 11, Krishna 11 (11, 26) | Nov-Dec |
| Pausha | Shukla 12, Krishna 12 (12, 27) | Dec-Jan |
| Magha | Shukla 3, Krishna 3 (3, 18) | Jan-Feb |
| Phalguna | Shukla 1, Krishna 1 (1, 16) | Feb-Mar |

Events affected by Tithi Shunya (any auspicious start):
- Marriage
- Griha pravesha
- Business launch
- Vehicle purchase
- Foundation/construction start
- Annaprashana / naming / upanayana
- Vidyarambha (starting education)

**Exception**: routine operations and non-auspicious necessities
(medical surgery decided by doctor, travel booked months ago, etc.)
are not blocked — Tithi Shunya applies to **choosing to start
something new**, not to ongoing obligations.

### API field emitted

- `tithi_shunya_active: bool` — True when today's tithi is the void
  tithi for the current masa

## Visha Ghatika (poison window)

A 5-ghati (120-min) toxic window per nakshatra, different per
nakshatra. Starting anything (signing, travel, important action)
during Visha Ghatika is classically dangerous. **Different from
Varjyam** (which is a separate 96-min avoid window, already computed
by our engine).

Visha Ghatika timing depends on the specific nakshatra; a classical
table exists. We do NOT currently compute or emit a Visha Ghatika
window in the API — reserved for a follow-up PR. The AI should
acknowledge Visha Ghatika conceptually when asked but not fabricate
specific ghati numbers.

## Nakshatra Pada quality

Each of the 27 nakshatras is divided into 4 **padas** of 3°20' each
(so the nakshatra's total 13°20' = 4 padas). Pada corresponds to one
of the 12 Navamsa signs, changing the nakshatra's internal flavour.

General pada notes (not currently scored by the engine; AI may
mention when relevant):
- **Pada 1** — start of nakshatra; energy not fully "settled" yet;
  avoid for events requiring permanence
- **Pada 2** — stable; good for most events
- **Pada 3** — peak nakshatra strength; usually strongest for
  fixed-outcome events (installation, coronation)
- **Pada 4** — end of nakshatra energy; avoid for auspicious starts
  (especially for Gandanta nakshatras — Ashlesha, Jyeshtha, Revati —
  whose pada 4 is a classical "junction" and carries extra weight)

### API field already emitted
- `nakshatra_pada: int` (1-4) — informational; not scored

## The 60-year Samvatsara cycle

The Hindu year-name cycle has 60 entries, anchored on **Prabhava** (year
1867 in Gregorian terms). Same cycle resets in 1927, 1987, 2047, etc.
Computed as `(year - 1867) % 60` to get the cycle position.

The new samvatsara begins at **Ugadi** (Chaitra Shukla Pratipada),
typically falling between March 19 and April 14 each Gregorian year. It
does NOT switch at January 1.

Examples (verified against DrikPanchang):
- Ugadi 2025 (Mar 30) → **Vishwavasu** (#39 of 60)
- Ugadi 2026 (Mar 19) → **Parabhava** (#40 of 60, "defeat / reversal of
  established order")
- Ugadi 2027 → **Plavanga** (#41)

For dates BEFORE Ugadi in a given year, the samvatsara is the previous
year's name. So Feb 2026 = Vishwavasu, but Apr 2026 = Parabhava.

## Hora (planetary hours)

24 unequal segments of the day:
- 12 day-horas (sunrise to sunset, divided by 12)
- 12 night-horas (sunset to next sunrise, divided by 12)

Lord sequence: Sun → Venus → Mercury → Moon → Saturn → Jupiter → Mars
(repeating).

The first hora of each day belongs to that weekday's lord:
- Sunday → Sun, Monday → Moon, Tuesday → Mars, Wednesday → Mercury,
  Thursday → Jupiter, Friday → Venus, Saturday → Saturn.

Then the cycle continues from there for all 24 horas.

## Choghadiya (7 segments × 2 halves)

Day and night each split into 8 segments of equal length (1/8 of
day-length and night-length respectively).

Segment names + qualities:
- **Amrit** (auspicious) — nectar
- **Shubh** (auspicious) — auspicious
- **Labh** (auspicious) — gain
- **Chal** (neutral) — movement / variable
- **Rog** (inauspicious) — disease
- **Kaal** (inauspicious) — death/time
- **Udveg** (inauspicious) — anxiety

Sequences per weekday differ; engine has the full table.

## Cross-tab data flow

Panchang values feed into:

- **Muhurtha tab** — every candidate-window scoring depends on Panchang
  (sunrise, tithi, nakshatra, yoga quality, karana, Rahu Kalam,
  Durmuhurtha, Choghadiya, Hora). If Panchang is wrong, Muhurtha is
  catastrophically wrong.
- **Horary tab** — Hora lord at query moment used for Layer-3 RP
  cross-check. Otherwise Horary is independent.
- **Transit tab** — independent of Panchang.
- **Analysis / Chart tabs** — independent of Panchang.

## Rules the AI must NEVER do

- Never claim a tithi is "of the day" without first checking it was
  active at sunrise.
- Never invent samvatsara names — they come from a fixed cycle of 60.
- Never flip the Ugadi cutoff: Feb dates are LAST year's samvatsara.
- Never claim Abhijit Muhurta is auspicious on Wednesday — it's the one
  exception.
- Never override the engine's `yoga_quality` field (auspicious vs
  inauspicious is fixed by classical texts, not interpretive).
- Never quote sunrise/sunset more precisely than HH:MM:SS — NOAA
  algorithm has ±2 min accuracy at best.

## Fields the AI can use

From `/panchangam/location` response:
- `samvatsara_te / samvatsara_en / samvatsara_meaning / samvatsara_cycle`
- `tithi_en / tithi_te / tithi_num / tithi_ends_at`
- `nakshatra_en / nakshatra_te / nakshatra_pada / nakshatra_ends_at`
- `yoga_en / yoga_te / yoga_quality / yoga_ends_at`
- `karana / karana2 / karana_ends_at`
- `vara_te / vara_en / weekday`
- `sunrise / sunset / moonrise / moonset`
- `rahu_kalam / yamagandam / gulika_kalam`
- `durmuhurtha[] / abhijit_muhurtha / brahma_muhurta`
- `choghadiya[]` (day + night)
- `hora_lord` (current planetary hour)
- `moon_sign / moon_sign_te / sun_sign / sun_sign_te`
- `moon_illum_pct`
- `masa_en / masa_te / rutu_te / ayana_te`
- `timezone_name / timezone_offset`

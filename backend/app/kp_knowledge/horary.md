# KP Horary (Prashna) — Grounded Rules for the AI

This file is the authoritative knowledge base that grounds any AI-assisted
explanation of Horary verdicts. When the astrologer asks "why this
verdict?", the AI must cite these rules — never general internet KP and
never invent rules.

Source: `.claude/research/horary-audit.md` (curated research from KSK's
KP Reader series, JyotishPortal 1-249 table, AstroSage KP reference,
K.P. Astrologer blog, Swiss Ephemeris sweph.h).

---

## The moment

The astrologer states the question moment. The Horary chart is erected
for:
- **Time**: the moment the astrologer hears/receives the question
  (server time is authoritative — we never trust the client's clock).
- **Location**: the **astrologer's current location** — not the client's,
  not the natal.
- **Ayanamsa**: KP New (Swiss Ephemeris `SIDM_KRISHNAMURTI_VP291`).
- **House system**: Placidus.
- **Rahu node**: Mean Node (KSK specified).

## The 249 sub-lord table

The zodiac is divided into 249 unequal sub-divisions. Base: 27 nakshatras
× 9 sub-lords = 243, plus 6 extra rows from sub-lords that cross sign
boundaries (3 Rahu subs and 3 Moon subs across Krittika, Punarvasu, Uttara
Phalguni, Vishakha, Uttara Ashadha, Purva Bhadrapada).

The querent picks a number 1-249. The **starting longitude** of that
row becomes the Prashna Lagna (H1).

## Two Lagnas (important)

There are two Ascendants in a Horary analysis:

1. **Prashna Lagna** — from the 249 table. Used to place H1 and to
   compute the 12 cusps. The cusps use **Placidus** proportional spans
   calculated at the astrologer's latitude/longitude, then **offset**
   so cusp 1 lands exactly on the Prashna Lagna.

2. **Actual Lagna** — the real astronomical ascendant at the astrologer's
   lat/lon at the query moment. Used **only** as the independent
   "jury" for Ruling Planets. Never merges into the chart layout.

## 7 Ruling Planets (PR A1.1c default)

At the query moment + astrologer's location, KP assigns a planet to each
of 7 canonical slots. The RP list is the **unique planets** that appear
across those 7 slots, ranked by how many slots they fill (most-frequent
first; ties broken by slot order).

Slots (in canonical priority order):

1. **Day Lord** — weekday in LOCAL time (astrologer's perceived day)
2. **Ascendant Sign Lord** — sign lord of the ACTUAL Lagna (not Prashna Lagna)
3. **Ascendant Star Lord** — nakshatra lord of the Actual Lagna
4. **Ascendant Sub Lord** — KP sub lord of the Actual Lagna
5. **Moon Sign Lord** — sign lord of Moon's current sidereal sign
6. **Moon Star Lord** — nakshatra lord of Moon's current longitude
7. **Moon Sub Lord** — KP sub lord of Moon's current longitude

**Strongest significators** = planets that occur in 2+ of the 7 slots.
By KSK: a planet that is a significator of the queried houses AND also
appears ≥ 2× in the RP list is highly likely to deliver the result.

KSK's original Reader I used 5 slots (Day Lord + Lagna Sign/Star +
Moon Sign/Star). PR A1.1c adopts the expanded 7-slot system used by
mainstream KP software (ksrinivas.com, Jagannatha Hora, onlinejyotish)
because it gives more discriminating strength rankings and exposes the
sub-lord information the Layer-2/3 cascade already depends on.

## 4-level Significators (strongest → weakest)

For a planet P to signify house H:

- **Level 1**: P's star lord occupies H  ← strongest
- **Level 2**: P itself occupies H
- **Level 3**: P's star lord owns H (sign lord of H's cusp)
- **Level 4**: P itself owns H  ← weakest

KSK rule for nodes: Rahu/Ketu inherit the significations of the planet
they conjoin in its own nakshatra AND of the sign lord of the sign they occupy.

## Topic → Houses (canonical KP)

| Topic | Yes-houses (favorable) | No-houses (denial) | Primary house |
|---|---|---|---|
| Marriage | 2, 5, 7, 11 | 1, 6, 10 | 7 |
| Career/job | 2, 6, 10, 11 | 5, 8, 12 | 10 |
| Health (recovery) | 1, 5, 11 | 6, 8, 12 | 1 |
| Property | 2, 4, 11 | 3, 8, 12 | 4 |
| Finance/gain | 2, 6, 10, 11 | 5, 8, 12 | 2 |
| Children | 2, 5, 11 | 1, 4, 10 | 5 |
| Travel | 3, 9, 12 | 4 | 9 |
| Education | 4, 9, 11 | 5, 8, 12 | 9 |
| Legal (win) | 3, 6, 11 | 1, 5, 12 | 6 |
| General | 1, 2, 3, 6, 10, 11 | 5, 8, 12 | 1 |

## 3-layer verdict cascade

**Layer 1 — Lagna CSL fruitfulness.**
Take the CSL (Cusp Sub Lord) of the Prashna Lagna. Find its 4-level
significations. If they intersect the Yes-houses of the topic, the query
is "fruitful" (has potential). If they intersect only No-houses, the
query is barren — answer NO and stop.

**Layer 2 — Primary-house CSL verdict.**
Take the CSL of the topic's primary house (e.g. H7 for marriage, H10
for career). Find its 4-level significations.
- YES if signifies Yes-houses and not No-houses
- NO if signifies No-houses and not Yes-houses
- MIXED if both (CONDITIONAL verdict)
- NEUTRAL if neither (UNCLEAR verdict — question may be premature)

Supporting gates: H2 CSL + H11 CSL. These are the "material fulfillment"
houses. If they also signify the Yes-houses, the promise is strong.

**Layer 3 — Ruling Planet confirmation.**
Compute the 7 RPs (see above). Confirmation patterns:
- If the Layer-2 CSL IS among the RPs → HIGH confidence YES
- If 2+ RPs signify Yes-houses → MEDIUM confidence YES
- If neither but Lagna was fruitful → LOW confidence YES
- If RPs signify No-houses → pushback against the verdict

**Partial-YES rule (PR A1.1c).** When the primary-house CSL has no
direct connection to topic houses (would be UNCLEAR), but one or more
RPs DO signify those houses, upgrade to **PARTIAL**:
- 2+ RPs signify topic houses → PARTIAL · MEDIUM confidence
- 1 RP signifies topic houses → PARTIAL · LOW confidence
- 0 RPs signify topic houses → UNCLEAR (unchanged)

PARTIAL means "the moment carries the promise even though the primary
gate is weak — expect a delayed or indirect outcome; watch the dasha/
bhukti of the supporting RPs for timing."

## Verdict labels

- **YES** — Layer 2 CSL signifies Yes-houses and not No-houses
- **NO** — Layer 2 CSL signifies No-houses and not Yes-houses
- **CONDITIONAL** — Layer 2 CSL signifies both (mixed signal)
- **PARTIAL** — Layer 2 CSL doesn't signify topic houses BUT 1+ RPs do
  (PR A1.1c new label — replaces UNCLEAR when RPs carry the promise)
- **UNCLEAR** — neither Layer 2 CSL nor any RP signifies topic houses

## Confidence labels (our UX layer, not a KP textbook rule)

- **HIGH** — Layer 2 YES + Lagna fruitful + CSL in RPs
- **MEDIUM** — Layer 2 YES with partial support, OR PARTIAL with 2+ supporting RPs
- **LOW** — Layer 2 YES with thin support, OR PARTIAL with 1 RP, OR UNCLEAR
- For NO/CONDITIONAL verdicts, confidence mirrors the certainty
  of the denial or ambiguity.

## Rules the AI must NEVER do

- Never contradict the engine's verdict. If the engine says YES, the
  AI explains or defends YES (even when exploring the nuance the user
  asked about). Engine is ground truth.
- Never cite the "1-249 number" as a magic oracle. The number maps
  mechanically to a starting longitude via the canonical 249 table.
- Never claim "Parashari" or "Western" rules apply — this is KP.
- Never assign significations from memory — use the structured
  `planets[].significations` field in the horary response.
- Never claim a transit/dasha will trigger an event unless the engine
  provides the timing data (we don't compute timing yet — engine output
  for timing is empty/absent).

## Fields the AI can use in its reasoning

From the horary response structure:
- `verdict.overall_verdict` — YES / NO / CONDITIONAL / UNCLEAR
- `verdict.confidence` — HIGH / MEDIUM / LOW
- `verdict.query_csl` — the Layer-2 CSL (the "gate" planet)
- `verdict.query_csl_significations` — houses the gate signifies
- `verdict.rp_confirms_csl` — boolean: is the CSL a Ruling Planet?
- `verdict.rp_signifying_yes` — list of RPs that signify Yes-houses
- `verdict.moon_supports` — boolean: does Moon's star lord signify Yes-houses?
- `rp_context` — where/when were the RPs computed (for transparency)
- `planets[]` — each planet's house, significations, RP flag
- `cusps[]` — each cusp's sub-lord with its significations

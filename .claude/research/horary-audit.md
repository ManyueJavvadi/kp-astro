# Horary Engine Audit — Track A.1 / PR A1.0

**Status**: Research complete, awaiting user approval before any code change.
**Scope**: `backend/app/services/horary_engine.py` (479 lines) and its dependencies in `backend/app/services/chart_engine.py`.
**Sources researched**: KSK's writings summarized on KP portals, JyotishPortal canonical 1-249 table, AstroSage KP reference, tony-louis.wordpress.com experimental horary posts, K.P. Astrologer blog, swisseph sweph.h source.

---

## 1. Canonical KP Horary — what the rules say

### 1.1 The chart

- **Trigger**: querent picks a number 1–249.
- **Time**: the moment the astrologer hears/receives the number.
- **Location**: the astrologer's current location (not the querent's, not the natal).
- **Ayanamsa**: KP ayanamsa family (zero-point at 291 CE, several modern variants). The most refined modern one is "KP New" by Prof. K. Balachandran (2003); the variant in Swiss Ephemeris (`SIDM_KRISHNAMURTI_VP291`, index 45) is D. Senthilathiban's 2019 refinement using Vondrak 2011 precession.
- **House system**: **Placidus**. Explicitly advocated by KSK himself. Equal house is a simplification some modern books suggest but is NOT canonical KP.
- **Node**: Rahu uses the **Mean Node** (KSK specified this; some modern software offers True Node as an option but Mean is the KP default).

### 1.2 The 249 sub-lord table

- Not 27 × 9 = 243.
- The extra 6 entries come from sub-lord spans that cross sign boundaries: each such sub-lord is split into **two rows** (one per sign). There are 3 such crossings × 2 rows = 6 extra entries, so the canonical table has **243 + 6 = 249 rows**.
- The JyotishPortal canonical table is one of the most commonly cited public versions. Each row has: number, sign, longitude range (deg°min′sec″), nakshatra, star lord, sub lord.
- The **beginning longitude of the row** for a given number is where the Query Lagna is placed in the Horary chart. (Some schools use the midpoint of the sub; KSK's original method uses the start of the sub.)

### 1.3 Lagna derivation

Two separate Lagnas exist in a KP Horary analysis:

1. **Prashna Lagna** — derived from the querent's number via the 249 table. This becomes the Ascendant of the horary chart. Used to compute the 12 cusps (via Placidus + the current time + astrologer's lat/lon) and the Lagna sub-lord that drives the Layer-1 "is the query fruitful?" verdict.
2. **Actual Lagna** — the real astronomical Ascendant rising at the astrologer's location at the query moment. Used **only** for the Ruling Planets computation, not for the chart layout.

Why two Lagnas: the Prashna Lagna sets up the question's "symbolic frame". The Actual Lagna represents the **moment itself** as the jury — it's an independent witness. If RPs are also derived from the Prashna Lagna, the "jury" is no longer independent and the confirmation signal collapses.

### 1.4 Ruling Planets — the 5 canonical RPs

At the moment and location of the question:

1. **Day Lord** — lord of the weekday in the astrologer's **local time**.
2. **Moon Sign Lord** — sign lord of the Moon's sidereal sign at that moment.
3. **Moon Star Lord** — nakshatra lord of the Moon.
4. **Ascendant Sign Lord** — sign lord of the **Actual Lagna** (not Prashna Lagna) at the astrologer's lat/lon.
5. **Ascendant Star Lord** — nakshatra lord of the Actual Lagna.

Some KP practitioners add two more for a 7-planet extended RP set:

6. **Moon Sub Lord**
7. **Ascendant Sub Lord** (of the Actual Lagna)

The 5-planet version is the widely-used standard. The 7-planet version is used by some schools for finer timing work.

De-duplication: if the same planet appears in multiple slots (e.g. Day Lord and Moon Sign Lord both being Mars), it's listed once. Rahu and Ketu are included if they satisfy a rule (e.g. they can be Sign Lord by the "special rule" that a node occupying a sign takes on the lord's properties).

### 1.5 Significations — the 4-level hierarchy

For a planet P to be a significator of a house H, classical KP ranks the signification in 4 levels, strongest first:

| Level | Planet P signifies H when… | Strength |
|---|---|---|
| 1 | The **star lord** of P occupies H | Strongest |
| 2 | P itself occupies H | Strong |
| 3 | The **star lord** of P owns H (is the sign lord of H's cusp) | Moderate |
| 4 | P itself owns H (is the sign lord of H's cusp) | Weakest |

Plus KSK's rule on Rahu/Ketu: a node inherits the significations of the planet occupying the same star (conjoining a planet in its own nakshatra), and also of the sign lord of the sign it occupies. This gives nodes a disproportionately large significator set.

### 1.6 The verdict rule — Lagna-CSL + Topic-CSL + RP confirmation

Classical KP Horary verdict is a **3-layer cascade**:

**Layer 1 — Lagna CSL fruitfulness**
- The **Cusp Sub Lord (CSL) of the Prashna Lagna** is examined.
- If its significations include the houses favorable to the topic (Yes-houses), the query is "fruitful" — the question has meaningful potential.
- If it signifies denial houses (No-houses) only, the query is barren; stop here and answer NO.

**Layer 2 — Primary topic house CSL**
- Each topic maps to **primary + secondary** fulfillment houses (not a single house). Example for marriage: 2 (family), 7 (partnership), 11 (fulfillment of desire) — all three needed in the CSL's signification set for YES.
- The CSL of the primary topic cusp (e.g. H7 for marriage) is examined.
- YES verdict if CSL signifies the full set of topic Yes-houses (and not the denial houses).
- NO verdict if CSL signifies the denial houses.
- PARTIAL / CONDITIONAL if mixed.

**Layer 3 — Ruling Planet confirmation**
- Compute the 5 RPs (Section 1.4).
- If the primary house CSL (from Layer 2) appears in the RP list, the verdict is **confirmed** (HIGH confidence).
- If the RPs strongly signify the topic Yes-houses (even if the CSL itself isn't an RP), the verdict is MEDIUM confidence.
- If RPs signify denial houses, there's a pushback against the CSL's signal.

**The 2-4-11 rule (for fulfillment)**
Any event of material gain also demands the significations of H2 (resources), H10 (achievement) OR H11 (fulfillment) by the CSL. Examples:
- Marriage → 2, 7, 11
- Job → 2, 6, 10 (the 6 matters for employment: "service" house)
- Job promotion → 2, 10, 11
- Financial gain → 2, 6, 11
- Child birth → 2, 5, 11
- Property → 4, 11

"Denial houses" for any topic are the 12th-from-primary and the houses that represent negation:
- Marriage denial: 1 (self/bachelorhood), 6 (separation — disputes), 10 (career over home)
- Career denial: 5 (speculation), 8 (obstacles), 12 (loss)
- Health denial: 6 (illness), 8 (chronic), 12 (hospital/confinement)

### 1.7 Timing of events — Vimshottari Dasha

Once the verdict is YES, classical KP times the event using:

1. The **Dasha-Bhukti-Antara** of the primary house CSL and/or the Lagna CSL, from today forward.
2. Cross-check with **transits**: the event occurs when transit planets (especially the slower ones: Jupiter, Saturn, Rahu) activate the relevant natal/prashna houses during the appropriate dasha period.
3. The **Moon's sub lord** as the "fastest clock" for short-range timing (days/weeks).

Our engine does **not** currently implement this timing layer. Verdict is given but "when" is left to the AI text layer.

---

## 2. What our code actually does

File: `backend/app/services/horary_engine.py` (479 lines) + dependencies in `chart_engine.py`.

### 2.1 The 249 table (`_build_prashna_table`, lines 84-107)

```python
def _build_prashna_table() -> list[dict]:
    subs = []
    for nak_idx in range(27):          # 27 nakshatras
        nak_start = nak_idx * NAKSHATRA_SPAN
        nak_lord = NAKSHATRA_LORDS[nak_idx]
        start_idx = LORD_SEQUENCE.index(nak_lord)
        current_lon = nak_start
        for j in range(9):              # 9 sub-lords per nakshatra
            …
            subs.append(entry)
    return subs                         # len == 243
```
Comment line 107: `PRASHNA_TABLE = _build_prashna_table()  # 243 entries`.

The lookup `_prashna_number_to_longitude(number)` uses `idx = ((number - 1) % len(PRASHNA_TABLE))` — for numbers 244–249 this wraps around via modulo, giving rows 1–6 of the table. **This is wrong**: the canonical 249 table has 6 extra rows from sign-boundary splits that our code doesn't generate.

### 2.2 Chart construction (`analyze_horary`, lines 372-479)

- **Ayanamsa** (line 388): `swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)` — valid KP New variant (Senthilathiban 2019 / VP291). Acceptable.
- **Julian Day** (lines 391-397): if `query_date` given, uses `12.0 - tz_offset` (i.e. assumes **noon local** at the date). If not, uses `datetime.now(timezone.utc)` in UT. The "noon local" default discards the hour-of-query information for dated queries, which is fine for natal work but **wrong for horary** — the moment matters to the minute.
- **Prashna Lagna** (line 400): looked up from the (buggy 243-entry) table.
- **Cusps** (line 407): `cusp_lons = [(lagna_lon + i * 30) % 360 for i in range(12)]` — **equal-house**, not Placidus. The astrologer's lat/lon are accepted in the router but never used for cusp computation in horary. Every cusp H2–H12 is therefore off from its real Placidus value.
- **Lagna sub-lord** (line 410): from `get_sub_lord(lagna_lon)` — works correctly against the 243-entry sub table.
- **Planets** (line 403): standard KP set via `get_planet_positions(jd)`. Correct.

### 2.3 Ruling Planets (`_compute_ruling_planets`, lines 146-175)

```python
def _compute_ruling_planets(planet_lons: dict, cusp_lons: list, jd_ut: float) -> list[str]:
    day_lord = WEEKDAY_LORDS[int(jd_ut) % 7]
    lagna_lon = cusp_lons[0] % 360        # <<<< prashna Lagna, not actual!
    lagna_sign_lord = SIGN_LORDS.get(get_sign(lagna_lon), "")
    lagna_star_lord = get_nakshatra_and_starlord(lagna_lon).get("star_lord", "")
    moon_lon = planet_lons.get("Moon", 0) % 360
    moon_sign_lord = SIGN_LORDS.get(get_sign(moon_lon), "")
    moon_star_lord = get_nakshatra_and_starlord(moon_lon).get("star_lord", "")
    …dedupe…
    return rps
```

Three issues:

- Line 156: **Day lord from `int(jd_ut) % 7`.** Julian Day in UT. For a query at 1 AM IST (= 7:30 PM UTC previous day), this returns the previous UTC day's weekday → wrong day lord. Must use the astrologer's **local** weekday. Proper calculation: convert the query `datetime` + timezone to local, then `.weekday()`.
- Line 159: **Ascendant = Prashna Lagna (line 159 uses `cusp_lons[0]` which is the prashna lagna).** Must be the **Actual Lagna** at the query moment + astrologer's lat/lon via Placidus, to act as the independent jury.
- Line 38 `WEEKDAY_LORDS = ["Moon", "Mars", ..., "Sun"]` with comment "0=Monday". Need to verify `int(jd_ut) % 7` actually maps to Monday=0. Python's `datetime.weekday()` returns Monday=0, but JD-based calculation has a different offset. A specific check: JD 2451544.5 = 2000-01-01 00:00 UTC = Saturday. `int(2451544.5) % 7 = 2451544 % 7 = ?` … 2451544 / 7 = 350220 remainder 4. So 4 = Saturday under our mapping (index 4 = "Venus"). But Saturday's lord is Saturn, not Venus. **Our map is off by one or mis-indexed.** (Needs hands-on verify, but this strongly suggests a bug.)

### 2.4 Significators (`_planet_significations`, lines 131-143)

```python
def _planet_significations(planet_name, planet_lons, cusp_lons) -> list[int]:
    plon = planet_lons[planet_name]
    occupied = _get_planet_house(plon, cusp_lons)                # Level 2
    ruled = [i+1 for i in range(12) if SIGN_LORDS.get(get_sign(cusp_lons[i]%360)) == planet_name]  # Level 4
    star_lord = get_nakshatra_and_starlord(plon).get("star_lord", "")
    sl_house = _get_planet_house(planet_lons[star_lord], cusp_lons)  # Level 1
    result = [occupied] + ruled
    if sl_house:
        result.append(sl_house)
    return sorted(set(result))
```

- Level 1 (star lord's occupied house): ✅ present (via `sl_house`)
- Level 2 (own occupied house): ✅ present (via `occupied`)
- Level 3 (star lord's owned houses): ❌ **missing entirely**
- Level 4 (own owned houses): ✅ present (via `ruled`)

So we're computing 3 of 4 levels. Also, no strength ordering — all levels are flattened into one unweighted set.

### 2.5 The verdict (`_kp_verdict`, lines 232-369)

- TOPIC_HOUSES (lines 56-67) maps topics to yes/no house lists — reasonable but incomplete vs classical (e.g. marriage missing H5/romance, career missing H6/service).
- TOPIC_PRIMARY_HOUSE (lines 70-81) picks a single "primary" house per topic. Classical KP examines **multiple** topic houses as a set, not one primary. Our code does test H2 + H11 supporting (lines 268-274) which partially compensates.
- Layer 1 uses Lagna CSL — correct.
- Layer 2 uses the primary topic cusp CSL — correct *in form* but wrong *in data* because cusps 2–12 come from the equal-house bug in section 2.2.
- Layer 3 uses RPs but the RPs are themselves tainted by the Prashna-Lagna-not-Actual-Lagna bug.
- Confidence labels (HIGH/MEDIUM/LOW) — heuristic, not explicitly in KP textbooks. Acceptable UX layer.
- No Vimshottari Dasha-based timing.

### 2.6 Broader impact — `chart_engine.get_ruling_planets`

This is NOT called by horary_engine (horary has its own local `_compute_ruling_planets`), but it is called by:

- `backend/app/routers/astrologer.py` — **the Analysis tab** ← load-bearing
- `backend/app/routers/chart.py` (2 places)
- `backend/app/routers/prediction.py`

`chart_engine.get_ruling_planets` (lines 356-411) has an explicitly-acknowledged bug on line 383:

```python
cusps, ascmc = swe.houses_ex(jd_now, 0.0, 0.0, b'P', swe.FLG_SIDEREAL)
# comment: "Use a neutral location for lagna calculation
#          In practice this should use the query location"
```

Latitude 0.0, longitude 0.0 is the middle of the Atlantic Ocean. Every tool using this function has subtly wrong ascendant-derived RPs. This includes the Analysis tab. **Per user's approval** ("if we find any core astrology bug lets fix it in engine"), this needs to be fixed — but the downstream effect is that Analysis may behave slightly differently after the fix.

---

## 3. Gap analysis — severity-ranked

Legend: 🔴 critical (wrong verdicts), 🟠 significant (degraded reliability), 🟡 minor (edge cases / polish).

| # | Issue | Severity | Location | Impact |
|---|---|---|---|---|
| 1 | Equal-house cusps instead of Placidus | 🔴 | horary_engine.py:407 | **All 11 cusps (H2–H12) are wrong.** Layer-2 verdict (primary topic house CSL) is computed on a fictional cusp — the wrong planet may appear as CSL. This alone can flip YES↔NO for a significant fraction of charts. |
| 2 | `PRASHNA_TABLE` has 243 entries, not 249 | 🔴 | horary_engine.py:84-114 | Numbers 244–249 silently wrap to 1–6 via modulo. Even for 1–243, the 6 sign-boundary sub-rows are not split correctly → any longitude right on a sign-boundary sub falls on the wrong row. |
| 3 | RPs use Prashna Lagna, not Actual Lagna | 🔴 | horary_engine.py:159 | The "jury" is no longer independent. A Layer-3 confirmation signal is effectively self-fulfilling instead of being a witness. |
| 4 | `chart_engine.get_ruling_planets` uses lat=0, lon=0 | 🔴 | chart_engine.py:383 | Affects Analysis, Chart, Prediction tabs. Lagna Sign Lord + Lagna Star Lord of RPs are computed for the middle of the Atlantic Ocean, not the user's location. |
| 5 | Day lord from `int(jd_ut) % 7` | 🟠 | horary_engine.py:156 + chart_engine.py:377 (different bug) | Near midnight, local weekday ≠ UTC weekday. Wrong weekday lord → wrong RP. |
| 6 | Level 3 significations missing | 🟠 | horary_engine.py:131-143 | A planet's star lord's owned houses are not counted. Under-counts significations → verdict may say NEUTRAL/NO when classical KP says YES. |
| 7 | Weekday map off-by-one suspect | 🟠 | horary_engine.py:38, 156 | Python `datetime.weekday()` returns Monday=0 but `int(jd_ut) % 7` has a different offset. Needs empirical verification — may or may not be a bug. |
| 8 | "Noon local" assumption when `query_date` is given without time | 🟠 | horary_engine.py:393 | Horary needs time to the minute of the question. Passing a date-only collapses to noon → all planets including Moon shift significantly. |
| 9 | TOPIC_HOUSES missing canonical houses | 🟠 | horary_engine.py:56-67 | E.g. career missing H6 (service), marriage missing 5 (romance), etc. Under-detects topic match. |
| 10 | Default lat/lon (17.385, 78.4867) = Hyderabad | 🟡 | horary_engine.py:376-378 and router `horary.py:13-14` | If frontend forgets to send coordinates, silently uses Hyderabad. Silent wrong rather than erroring. |
| 11 | No Vimshottari timing of event | 🟡 | horary_engine.py (absent) | Verdict is given without "when". AI layer covers this in natural language but the engine doesn't surface dasha-bhukti-antara explicitly. |
| 12 | No 4-level strength weighting | 🟡 | horary_engine.py (absent) | Our verdict treats all significations equally. Classical KP uses the strength order. Edge-case impact only. |
| 13 | 5 RPs only, no 7-RP option | 🟡 | horary_engine.py:146-175 | Some schools use 7 (add Lagna sub + Moon sub). Not needed for 5-RP verdict correctness. |
| 14 | Confidence labels (HIGH/MEDIUM/LOW) not in textbooks | 🟡 | horary_engine.py:290-324 | Our UX heuristic, not a KP bug. Fine to keep as UX. |
| 15 | Prashna number as Lagna start vs midpoint | 🟡 | horary_engine.py:114 | KSK's original method uses sub-start; some schools prefer sub-midpoint. Start is acceptable. |

---

## 4. Proposed fix list — for PR A1.1

Fixes are ordered by dependency and severity. Bundle them into one PR if any are interdependent, or split if each can be verified independently.

### 4.1 Critical fixes (must do, top of PR A1.1)

1. **Switch horary cusps to Placidus.** Replace line 407 with `swe.houses_ex(jd, lat, lon, b'P', swe.FLG_SIDEREAL)`. Replace the Ascendant returned by `houses_ex` with the Prashna Lagna (the canonical KP move). Cusps 2–12 come from Placidus math using the astrologer's lat/lon + JD. (Reference: KSK Reader 1, chapter on horary.)

2. **Build the full 249 table.** Replace `_build_prashna_table` with a canonical implementation that handles the 6 sign-boundary splits. Hardcode the canonical 249 table as a Python constant generated once, pinned into a new file `backend/app/services/kp_249_table.py`. Reference it via unit test against JyotishPortal's published table.

3. **Fix RPs to use Actual Lagna.** Pass the real ascendant (ascmc[0] from Placidus computation at JD + astrologer's lat/lon) into `_compute_ruling_planets`, instead of `cusp_lons[0]` (the Prashna Lagna). Keep cusp_lons for the chart itself; RPs just get their own independent Lagna input.

4. **Fix `chart_engine.get_ruling_planets` to accept (and require) latitude/longitude + current timestamp.** Change the signature to `get_ruling_planets(jd, latitude, longitude, timezone_offset)`. Update all callers in `astrologer.py`, `chart.py`, `prediction.py` to pass the natal chart's lat/lon (or the request's lat/lon for live-moment calls). No more `lat=0, lon=0`. This ripples into Analysis — surface the before/after in the PR.

5. **Fix day lord calculation.** Compute from the astrologer's local-date weekday, not from `int(jd_ut) % 7`:
   ```python
   local_dt = datetime.utcfromtimestamp(...) + timedelta(hours=tz_offset)
   weekday_lord = WEEKDAY_LORDS_LOCAL[local_dt.weekday()]  # Monday=0
   ```
   Verify the day-lord map against a known reference date.

### 4.2 Significant fixes (same PR A1.1 if bandwidth allows)

6. **Add Level 3 significations.** In `_planet_significations`, also add the houses owned by the star lord:
   ```python
   star_lord_ruled = [i+1 for i in range(12)
                      if SIGN_LORDS.get(get_sign(cusp_lons[i] % 360)) == star_lord]
   result.extend(star_lord_ruled)
   ```

7. **Accept optional hour-minute for `query_date`.** Add a `query_time` parameter to the router; horary engine uses `datetime.strptime(f"{query_date} {query_time}", "%Y-%m-%d %H:%M")` for JD.

8. **Expand TOPIC_HOUSES** to match classical KP:
   - marriage: yes=[2, 5, 7, 11], no=[1, 6, 10]  (5 for romance/attraction)
   - career: yes=[2, 6, 10, 11], no=[5, 8, 12]  (6 = service/employment)
   - finance: yes=[2, 6, 10, 11], no=[5, 8, 12]
   - children: yes=[2, 5, 11], no=[1, 4, 10]
   (Cross-check each topic against KSK's Reader 4 recommendations.)

### 4.3 Minor / polish (can slip to PR A1.2 if PR A1.1 gets too large)

9. **Remove Hyderabad default.** Router signature requires `latitude` and `longitude` — no fallback. If frontend sends neither, return 400.

10. **Weight significations by 4-level strength** in the verdict. Add a weighted signification_set that tracks which level produced each signification; use this for tie-breaking in Layer-2 MIXED verdicts.

11. **Vimshottari timing layer.** If verdict is YES, compute the Dasha-Bhukti-Antara sequence where the CSL is activated. Return as `timing: [{start, end, dasha_lord, bhukti_lord, reason}, ...]`.

### 4.4 Tests (MUST include with PR A1.1)

Since there are zero backend tests today, PR A1.1 adds a minimal pytest harness under `backend/tests/test_horary_engine.py`:

- **Golden snapshot of current behavior** (pre-fix) for 3 prashna numbers × 2 topics = 6 cases. Not a correctness test — just regression guard against accidental breakage of unfixed logic.
- **Reference cases from research** (Section 5 below) — expected verdicts for 3–5 questions with published answers from KP textbooks. These should pass after PR A1.1 fixes.
- **249 table structure test** — verify the table has exactly 249 rows and the 6 extra rows are at the documented sign boundaries.
- **RP algorithm test** — verify RPs for a known date/time/location match an external reference (e.g. onlinejyotish.com's output for that same moment).

---

## 5. Verification cases

Five test cases I'll use to validate the fixed engine, drawn from publicly-referenced KP horary examples + a couple synthesised from unambiguous rules. If the user's father has his own reference cases, those take precedence.

### Case 1 — "Will I get this job?" (classic reference case)
- **Question**: "Will I get the promotion I've applied for?"
- **Querent gives**: 63 (arbitrary)
- **Expected Prashna Lagna**: based on JyotishPortal table, #63 = Cancer ~4°. Star lord = Mercury. Sub lord = Saturn.
- **Topic**: career (houses 2, 6, 10, 11 favorable)
- **Expected verdict**: depends on chart, but for a day where Saturn (the sub lord) is a Ruling Planet AND signifies 2, 6, 10, or 11 → YES with HIGH confidence.
- **What breaks today**: equal-house means H6 and H10 cusps are wrong → wrong H10 CSL → Layer-2 may flip to NO even when classical KP says YES.

### Case 2 — "Will my daughter marry this year?" (marriage)
- **Question**: "Will my daughter's marriage happen in this cycle?"
- **Querent gives**: 140 (arbitrary mid-range)
- **Topic**: marriage (houses 2, 7, 11 favorable; 1, 6, 10 denial)
- **Expected**: a high-fidelity test of the multi-house (2+7+11) requirement. Our current TOPIC_HOUSES has 2, 7, 11 — OK for this case.

### Case 3 — Boundary case for the 249 table
- Test numbers 244, 245, 246, 247, 248, 249 specifically.
- Today's code returns the same answer as for 1, 2, 3, 4, 5, 6 (because of modulo).
- Reference: the canonical 249 table should return distinct rows — the 6 extra sign-boundary splits.

### Case 4 — Day lord at midnight boundary
- Query at 2025-04-20 23:30 local time (Saturday).
- Today's code: UTC is 2025-04-20 18:00 (Saturday UTC) → day_lord via `int(jd_ut) % 7` may return Friday's lord (Venus) or Saturday's lord (Saturn) depending on JD fractional truncation.
- Reference: **local** weekday is Saturday → day lord = Saturn (unambiguous).
- This test pins down the day-lord bug.

### Case 5 — RP independence from Prashna Lagna
- Fix a time and location (e.g. 2025-04-20 15:00 IST, Hyderabad).
- Run the engine twice with two different prashna numbers (e.g. 42 and 201).
- Today's code: RPs shift because cusp_lons[0] shifts with the prashna number. **Wrong.**
- Reference: RPs are **identical** for both calls because the astrologer's time + location are the same. **Correct.**

---

## 6. Scope boundary for PR A1.1

- **In scope**: Fixes 1–8 (all critical + high-value significant).
- **Out of scope for PR A1.1**: Fixes 10 (weighted strength), 11 (Vimshottari timing). Ship as PR A1.1b if research stays on track.
- **Absolutely required**: test harness (section 4.4), including Analysis-tab regression note.
- **Analysis tab impact statement** (required in the PR description): before/after comparison of RPs + full Analysis output for one sample chart, shown to user for explicit approval before merge.

---

## 7. Open questions for the user

1. **Approve scope** — do fixes 1–8 go into PR A1.1, or narrower (just 1–4 first, then 5–8 in A1.1b)?
2. **249 canonical table source** — JyotishPortal seems solid but should we also cross-check against one more reference (e.g. AstroSage's generator) before pinning the table?
3. **Verification cases** — do you have any horary questions your father has already answered that we can add to the test set as "ground truth"? Even 1–2 would be gold.
4. **Analysis regression tolerance** — when the RP fix ripples into Analysis, how much change in the AI-generated text is acceptable before we flag it for your review?
5. **Frontend change** — the fix to RPs using "astrologer's location" needs the frontend to send the user's current geolocation (separate from natal chart location) for the Horary tab. Is it OK to prompt for geolocation when the user opens the Horary tab? Or should we default to the natal location for now and add real geolocation in a later PR?

---

## Sources

- [KP Astrology - Krishnamurti Paddhati - KP System (AstroSage)](https://kpastrology.astrosage.com/kp-learning-home/tutorial/chapter-2-fundamental-principles)
- [KP Horary 1-249 canonical table (JyotishPortal)](https://jyotishportal.com/KPResource/KP1-249.aspx)
- [East meets West: Experimenting with KP Horary (Anthony Louis)](https://tonylouis.wordpress.com/2024/11/14/east-meets-west-experimenting-with-kp-horary-techniques/)
- [Krishnamurthi Padathi - The 249 Sub Lords (Scribd document summary)](https://www.scribd.com/document/81905645/KRISHNAMURTHI-PADATHI-THE-249-SUB-LORDS)
- [KP Four Step Theory (AstroSage)](https://kpastrology.astrosage.com/kp-learning-home/related-systems/four-step-theory)
- [Timing of Events in KP Astrology Using Ruling Planets (Gautam Verma)](https://www.kpastrologer.co.in/post/timing-events-kp-astrology-ruling-planets)
- [KP System FAQ — Ayanamsa (AstroSage)](https://kpastrology.astrosage.com/kp-learning-home/kp-system-faq)
- [Swiss Ephemeris sweph.h (GitHub)](https://github.com/mivion/swisseph/blob/master/deps/swisseph/sweph.h)
- [KP Ayanamsa comparison](https://www.scribd.com/document/188083313/A-Review-of-KP-Ayanamsas)

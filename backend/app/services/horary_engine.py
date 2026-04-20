"""
KP Horary (Prashna) Engine — rewritten in PR A1.1 for accuracy.

Canonical KP Horary methodology — research and citations live in
.claude/research/horary-audit.md. Changes from the PR A1.0 legacy engine:

Bug fixes
---------
1. 249 canonical table (was 243 — now sourced from backend/app/services/kp_249_table.py)
2. Placidus cusps at the astrologer's lat/lon (was equal-house from Lagna)
3. Ruling Planets now use the ACTUAL ascendant at lat/lon + local-time
   weekday (was using the prashna-derived Lagna and UTC weekday)
4. 4-level significator hierarchy: Level 1, 2, 3, 4 (was 1, 2, 4)
5. TOPIC_HOUSES expanded to canonical KP sets (e.g. career now includes 6)
6. query_time accepted separately (was "noon local" if date given)
7. rp_context surfaced for display ("Computed for: Toronto, 2026-04-20 15:03:27 EDT")
8. No silent fallback — latitude/longitude/timezone_offset are REQUIRED
   (the router enforces this by making them non-optional)

Layer cascade preserved (per classical KP):
    Layer 1 — Lagna CSL fruitfulness
    Layer 2 — Primary-topic-house CSL verdict
    Layer 3 — Ruling Planets confirmation
"""
import swisseph as swe
from datetime import datetime, timedelta, timezone as dt_tz

from app.services.chart_engine import (
    get_sign, get_nakshatra_and_starlord, get_sub_lord,
    get_planet_positions,
)
from app.services.kp_249_table import number_to_lagna_longitude


# ─────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────

DASHA_YEARS = {
    "Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10,
    "Mars": 7, "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17,
}
LORD_SEQUENCE = ["Ketu", "Venus", "Sun", "Moon", "Mars",
                 "Rahu", "Jupiter", "Saturn", "Mercury"]
NAKSHATRA_LORDS = [LORD_SEQUENCE[i % 9] for i in range(27)]
NAKSHATRA_SPAN = 360.0 / 27
TOTAL_DASHA = 120

SIGN_LORDS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury",
    "Cancer": "Moon", "Leo": "Sun", "Virgo": "Mercury",
    "Libra": "Venus", "Scorpio": "Mars", "Sagittarius": "Jupiter",
    "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter",
}

# Python datetime.weekday() → KP day lord (Monday = 0)
WEEKDAY_LORDS = ["Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Sun"]

HOUSE_THEMES = {
    1: "Self, health, longevity, personality",
    2: "Wealth, family, speech, accumulated assets",
    3: "Siblings, short journeys, communication, courage",
    4: "Property, mother, vehicles, home, education",
    5: "Children, romance, speculation, education, past merit",
    6: "Enemies, debts, litigation, service, health challenges",
    7: "Marriage, partnerships, contracts, open enemies",
    8: "Longevity, occult, sudden events, inheritance",
    9: "Luck, father, religion, long journeys, higher learning",
    10: "Career, status, authority, father, government",
    11: "Gains, income, friends, elder siblings, fulfilment of desire",
    12: "Expenses, losses, foreign travel, spiritual liberation, bed pleasures",
}

# PR A1.1 — expanded canonical KP topic houses.
# "yes" = houses whose signification by the CSL confirms the matter.
# "no"  = houses whose signification denies the matter (12th-from + obstruction houses).
TOPIC_HOUSES = {
    # Marriage: 2 (family expansion), 7 (partnership), 11 (fulfilment); optional 5 (romance).
    "marriage":  {"yes": [2, 5, 7, 11], "no": [1, 6, 10]},
    # Career/job: 2 (income), 6 (service), 10 (status), 11 (gain). Denials: 5, 8, 12.
    "career":    {"yes": [2, 6, 10, 11], "no": [5, 8, 12]},
    # Health improvement: 1 (body), 5 (recovery), 11 (relief). Denials: 6, 8, 12.
    "health":    {"yes": [1, 5, 11], "no": [6, 8, 12]},
    # Property: 4 (home), 11 (fulfilment); 2 supports for purchase finance. Denials: 3, 8, 12.
    "property":  {"yes": [2, 4, 11], "no": [3, 8, 12]},
    # Finance/gain: 2, 6, 10, 11.  Speculation/debt denials: 5, 8, 12.
    "finance":   {"yes": [2, 6, 10, 11], "no": [5, 8, 12]},
    # Children: 2 (family), 5 (progeny), 11 (fulfilment). Denials: 1, 4, 10.
    "children":  {"yes": [2, 5, 11], "no": [1, 4, 10]},
    # Travel: 3 (short), 9 (long), 12 (foreign). Denial: 4 (rooted at home).
    "travel":    {"yes": [3, 9, 12], "no": [4]},
    # Education: 4 (primary), 9 (higher), 11 (completion). Denials: 5, 8, 12.
    "education": {"yes": [4, 9, 11], "no": [5, 8, 12]},
    # Legal: 6 (win litigation), 11 (favourable outcome); 3 is courage. Denials: 1, 5, 12.
    "legal":     {"yes": [3, 6, 11], "no": [1, 5, 12]},
    # General — catch-all: positive growth vs loss.
    "general":   {"yes": [1, 2, 3, 6, 10, 11], "no": [5, 8, 12]},
}

# Primary house to examine CSL for each topic (Layer 2 verdict)
TOPIC_PRIMARY_HOUSE = {
    "marriage": 7, "career": 10, "health": 1, "property": 4,
    "finance": 2, "children": 5, "travel": 9, "education": 9,
    "legal": 6, "general": 1,
}


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _get_planet_house(planet_lon: float, cusp_lons: list) -> int:
    for i in range(12):
        cs = cusp_lons[i] % 360
        ce = cusp_lons[(i + 1) % 12] % 360
        pl = planet_lon % 360
        if ce > cs:
            if cs <= pl < ce:
                return i + 1
        else:
            if pl >= cs or pl < ce:
                return i + 1
    return 1


def _houses_ruled_by(planet_name: str, cusp_lons: list) -> list[int]:
    """Houses whose cusp sign is ruled by this planet."""
    return [i + 1 for i in range(12)
            if SIGN_LORDS.get(get_sign(cusp_lons[i] % 360)) == planet_name]


def _planet_significations(planet_name: str, planet_lons: dict, cusp_lons: list) -> list[int]:
    """
    Houses signified by a planet under the KP 4-level hierarchy (strongest first):
        Level 1 — star lord's occupied house
        Level 2 — own occupied house
        Level 3 — star lord's owned houses
        Level 4 — own owned houses

    Returns the unique union sorted ascending. PR A1.1 adds Level 3
    (was missing in the pre-A1.1 engine).
    """
    if planet_name not in planet_lons:
        return []
    plon = planet_lons[planet_name]
    star_lord = get_nakshatra_and_starlord(plon).get("star_lord", "")

    # Level 2 — own occupied house
    own_occupied = _get_planet_house(plon, cusp_lons)
    # Level 1 — star lord's occupied house
    sl_occupied = (_get_planet_house(planet_lons[star_lord], cusp_lons)
                   if star_lord in planet_lons else 0)
    # Level 3 — star lord's owned houses
    sl_owned = _houses_ruled_by(star_lord, cusp_lons) if star_lord else []
    # Level 4 — own owned houses
    own_owned = _houses_ruled_by(planet_name, cusp_lons)

    result = set()
    if sl_occupied:
        result.add(sl_occupied)
    result.add(own_occupied)
    result.update(sl_owned)
    result.update(own_owned)
    return sorted(result)


def _compute_ruling_planets(
    jd_utc: float,
    latitude: float,
    longitude: float,
    timezone_offset: float,
    planet_lons: dict,
) -> tuple[list[str], dict]:
    """
    Compute the 5 canonical Ruling Planets at the query moment and location.

    Returns (rp_list, rp_context_dict).

    This is NOT the same as chart_engine.get_ruling_planets() — that one
    uses datetime.now() internally. Horary accepts a pre-computed JD (UT)
    so the cusp calculation and RP calculation reference the exact same
    instant.
    """
    # Compute the ACTUAL ascendant at the astrologer's lat/lon at JD.
    # This is the canonical "independent jury" used by KP RPs, not the
    # Prashna Lagna (which is question-specific).
    _, ascmc = swe.houses_ex(jd_utc, latitude, longitude, b'P', swe.FLG_SIDEREAL)
    actual_lagna_lon = ascmc[0] % 360

    # Local weekday. Build local datetime from the same JD.
    utc_dt = datetime(2000, 1, 1, 12, 0, 0, tzinfo=dt_tz.utc) + \
             timedelta(days=(jd_utc - 2451545.0))
    local_dt = utc_dt + timedelta(hours=timezone_offset)
    day_lord = WEEKDAY_LORDS[local_dt.weekday()]

    lagna_sign_lord = SIGN_LORDS.get(get_sign(actual_lagna_lon), "")
    lagna_star_lord = get_nakshatra_and_starlord(actual_lagna_lon).get("star_lord", "")

    moon_lon = planet_lons.get("Moon", 0) % 360
    moon_sign_lord = SIGN_LORDS.get(get_sign(moon_lon), "")
    moon_star_lord = get_nakshatra_and_starlord(moon_lon).get("star_lord", "")

    seen = set()
    rps: list[str] = []
    for p in [day_lord, lagna_sign_lord, lagna_star_lord, moon_sign_lord, moon_star_lord]:
        if p and p not in seen:
            seen.add(p)
            rps.append(p)

    rp_context = {
        "latitude": round(latitude, 4),
        "longitude": round(longitude, 4),
        "timezone_offset": timezone_offset,
        "local_datetime": local_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "utc_datetime": utc_dt.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "weekday": local_dt.strftime("%A"),
        "day_lord": day_lord,
        "actual_lagna_longitude": round(actual_lagna_lon, 4),
        "actual_lagna_sign": get_sign(actual_lagna_lon),
        "lagna_sign_lord": lagna_sign_lord,
        "lagna_star_lord": lagna_star_lord,
        "moon_longitude": round(moon_lon, 4),
        "moon_sign_lord": moon_sign_lord,
        "moon_star_lord": moon_star_lord,
    }
    return rps, rp_context


def _moon_analysis(planet_lons: dict, cusp_lons: list) -> dict:
    moon_lon = planet_lons.get("Moon", 0)
    moon_house = _get_planet_house(moon_lon, cusp_lons)
    moon_sign = get_sign(moon_lon % 360)
    nak_info = get_nakshatra_and_starlord(moon_lon)
    star_lord = nak_info.get("star_lord", "")
    sub_lord = get_sub_lord(moon_lon)
    star_lord_sigs = _planet_significations(star_lord, planet_lons, cusp_lons)
    sub_lord_sigs = _planet_significations(sub_lord, planet_lons, cusp_lons)
    return {
        "moon_house": moon_house,
        "moon_sign": moon_sign,
        "moon_nakshatra": nak_info.get("nakshatra", ""),
        "star_lord": star_lord,
        "star_lord_significations": star_lord_sigs,
        "sub_lord": sub_lord,
        "sub_lord_significations": sub_lord_sigs,
    }


def _csl_layer_analysis(csl: str, house_num: int, yes_houses: set, no_houses: set,
                        planet_lons: dict, cusp_lons: list) -> dict:
    sigs = set(_planet_significations(csl, planet_lons, cusp_lons))
    yes_match = sigs & yes_houses
    no_match = sigs & no_houses
    if yes_match and not no_match:
        layer_verdict = "YES"
    elif no_match and not yes_match:
        layer_verdict = "NO"
    elif yes_match and no_match:
        layer_verdict = "MIXED"
    else:
        layer_verdict = "NEUTRAL"
    return {
        "house": house_num,
        "csl": csl,
        "significations": sorted(sigs),
        "yes_activated": sorted(yes_match),
        "no_activated": sorted(no_match),
        "layer_verdict": layer_verdict,
    }


def _kp_verdict(
    lagna_sub: str, topic: str, planet_lons: dict, cusp_lons: list,
    ruling_planets: list, moon_analysis: dict,
) -> dict:
    houses = TOPIC_HOUSES.get(topic.lower(), TOPIC_HOUSES["general"])
    yes_houses = set(houses["yes"])
    no_houses = set(houses["no"])

    layer1 = _csl_layer_analysis(lagna_sub, 1, yes_houses, no_houses, planet_lons, cusp_lons)
    lagna_fruitful = layer1["layer_verdict"] in ("YES", "MIXED")

    primary_house = TOPIC_PRIMARY_HOUSE.get(topic.lower(), 1)
    if primary_house == 1:
        layer2 = layer1
        query_csl = lagna_sub
    else:
        query_cusp_lon = cusp_lons[primary_house - 1] % 360
        query_csl = get_sub_lord(query_cusp_lon)
        layer2 = _csl_layer_analysis(query_csl, primary_house, yes_houses, no_houses, planet_lons, cusp_lons)

    # Supporting gates
    h2_csl = get_sub_lord(cusp_lons[1] % 360)
    h11_csl = get_sub_lord(cusp_lons[10] % 360)
    h2_sigs = set(_planet_significations(h2_csl, planet_lons, cusp_lons))
    h11_sigs = set(_planet_significations(h11_csl, planet_lons, cusp_lons))
    h2_supports = bool(h2_sigs & yes_houses)
    h11_supports = bool(h11_sigs & yes_houses)

    # RP confirmation
    rp_set = set(ruling_planets)
    rp_confirm_csl = query_csl in rp_set
    rp_signifying_yes = [rp for rp in ruling_planets
                         if set(_planet_significations(rp, planet_lons, cusp_lons)) & yes_houses]
    rp_strength = len(rp_signifying_yes)

    moon_star_sigs = set(moon_analysis.get("star_lord_significations", []))
    moon_supports = bool(moon_star_sigs & yes_houses)

    query_verdict = layer2["layer_verdict"]
    if query_verdict == "YES":
        if lagna_fruitful and rp_confirm_csl:
            overall, confidence = "YES", "HIGH"
            reason = (f"H{primary_house} CSL {query_csl} signifies {sorted(layer2['yes_activated'])} ✓ | "
                      f"Lagna CSL {lagna_sub} fruitful ✓ | {query_csl} is a Ruling Planet ✓")
        elif lagna_fruitful or rp_strength >= 2:
            overall, confidence = "YES", "MEDIUM"
            reason = (f"H{primary_house} CSL {query_csl} signifies {sorted(layer2['yes_activated'])} ✓ | "
                      f"{'Lagna fruitful ✓' if lagna_fruitful else ''} "
                      f"{'| ' + str(rp_strength) + ' RPs confirm ✓' if rp_strength >= 2 else ''}")
        else:
            overall, confidence = "YES", "LOW"
            reason = f"H{primary_house} CSL {query_csl} signifies yes-houses, but Lagna CSL and RPs provide weak support."
    elif query_verdict == "NO":
        overall = "NO"
        confidence = "HIGH" if not lagna_fruitful else "MEDIUM"
        reason = (f"H{primary_house} CSL {query_csl} signifies denial houses {sorted(layer2['no_activated'])}. "
                  f"{'Lagna also unfavorable.' if not lagna_fruitful else 'Lagna shows some promise but primary gate denies.'}")
    elif query_verdict == "MIXED":
        overall, confidence = "CONDITIONAL", "MEDIUM"
        reason = (f"H{primary_house} CSL {query_csl} signifies both yes {sorted(layer2['yes_activated'])} "
                  f"and no {sorted(layer2['no_activated'])} houses. "
                  f"{'H2+H11 support.' if h2_supports and h11_supports else 'Monitor H2/H11 CSLs for fulfillment timing.'}")
    else:
        overall, confidence = "UNCLEAR", "LOW"
        reason = (f"H{primary_house} CSL {query_csl} signifies H{sorted(layer2['significations'])} "
                  f"— no direct connection to topic houses. Query may be premature or question unclear.")

    return {
        "verdict": overall,
        "overall_verdict": overall,
        "confidence": confidence,
        "explanation": reason,
        "verdict_reason": reason,
        "lagna_csl": lagna_sub,
        "lagna_csl_significations": layer1["significations"],
        "lagna_fruitful": lagna_fruitful,
        "lagna_layer": layer1,
        "query_house": primary_house,
        "query_csl": query_csl,
        "query_csl_significations": layer2["significations"],
        "query_layer": layer2,
        "h2_csl": h2_csl,
        "h2_supports": h2_supports,
        "h11_csl": h11_csl,
        "h11_supports": h11_supports,
        "ruling_planets": ruling_planets,
        "rp_confirms_csl": rp_confirm_csl,
        "rp_signifying_yes": rp_signifying_yes,
        "rp_strength": rp_strength,
        "moon_supports": moon_supports,
        "yes_houses": sorted(yes_houses),
        "no_houses": sorted(no_houses),
        # backward compat keys
        "sub_lord_significations": layer1["significations"],
        "yes_houses_activated": layer2["yes_activated"],
        "no_houses_activated": layer2["no_activated"],
    }


# ─────────────────────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────────────────────

def analyze_horary(
    number: int,
    question: str,
    latitude: float,
    longitude: float,
    timezone_offset: float,
    topic: str = "general",
    query_date: str | None = None,
    query_time: str | None = None,
) -> dict:
    """
    KP Horary analysis.

    PR A1.1 API changes:
      * latitude, longitude, timezone_offset are REQUIRED (no Hyderabad
        fallback). The router enforces this upstream.
      * query_time accepted alongside query_date for minute-precise timing.
      * If neither query_date nor query_time is given, server's UTC now
        is used (the canonical KP moment = the moment the astrologer
        receives the question).
    """
    if not 1 <= number <= 249:
        raise ValueError("Prashna number must be between 1 and 249")

    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)

    # Determine the query moment. Server time is authoritative for "now".
    if query_date:
        time_str = query_time or "12:00"
        local_naive = datetime.strptime(f"{query_date} {time_str}", "%Y-%m-%d %H:%M")
        utc_dt = local_naive - timedelta(hours=timezone_offset)
        utc_dt = utc_dt.replace(tzinfo=dt_tz.utc)
    else:
        utc_dt = datetime.now(dt_tz.utc)

    jd = swe.julday(
        utc_dt.year, utc_dt.month, utc_dt.day,
        utc_dt.hour + utc_dt.minute / 60 + utc_dt.second / 3600,
    )

    # Prashna Lagna from canonical 249 table
    lagna_lon, sub_entry = number_to_lagna_longitude(number)

    # Planets now
    planets_raw = get_planet_positions(jd)
    planet_lons = {p: d["longitude"] for p, d in planets_raw.items()}

    # Cusps via Placidus at astrologer's lat/lon — but with the PRASHNA
    # Lagna as H1. Canonical KP: the Prashna Lagna replaces the natural
    # ascendant; houses 2-12 are computed by Placidus-walking from the
    # Prashna Lagna using the astrologer's lat/lon for proportional spans.
    # Swiss Ephemeris doesn't expose this directly, so we compute Placidus
    # cusps at lat/lon and then OFFSET all cusps so that cusp[0] = Prashna
    # Lagna, preserving the relative proportional spans that depend on
    # the astrologer's latitude.
    _, ascmc_at_loc = swe.houses_ex(jd, latitude, longitude, b'P', swe.FLG_SIDEREAL)
    cusps_at_loc, _ = swe.houses_ex(jd, latitude, longitude, b'P', swe.FLG_SIDEREAL)
    actual_lagna = ascmc_at_loc[0] % 360
    # Rotate each cusp so cusps[0] aligns with Prashna Lagna while keeping
    # the Placidus proportional spans from the astrologer's latitude.
    offset = (lagna_lon - actual_lagna) % 360
    cusp_lons = [(cusps_at_loc[i] + offset) % 360 for i in range(12)]
    # Guarantee H1 is exactly Prashna Lagna (avoid float drift).
    cusp_lons[0] = lagna_lon % 360

    # Lagna sub-lord (from the Prashna Lagna)
    lagna_sub = get_sub_lord(lagna_lon)
    lagna_nak_info = get_nakshatra_and_starlord(lagna_lon)

    # Ruling Planets — independent of Prashna Lagna, using ACTUAL Lagna
    ruling_planets, rp_context = _compute_ruling_planets(
        jd, latitude, longitude, timezone_offset, planet_lons,
    )
    moon_analysis = _moon_analysis(planet_lons, cusp_lons)

    # Planet details with 4-level significations
    planet_details = []
    for p_name, p_lon in planet_lons.items():
        nak_info = get_nakshatra_and_starlord(p_lon)
        planet_details.append({
            "planet": p_name,
            "longitude": round(p_lon % 360, 4),
            "sign": get_sign(p_lon % 360),
            "nakshatra": nak_info.get("nakshatra", ""),
            "star_lord": nak_info.get("star_lord", ""),
            "sub_lord": get_sub_lord(p_lon),
            "house": _get_planet_house(p_lon, cusp_lons),
            "retrograde": planets_raw[p_name].get("retrograde", False),
            "significations": _planet_significations(p_name, planet_lons, cusp_lons),
            "is_ruling_planet": p_name in ruling_planets,
        })

    # Cusp details
    cusp_details = []
    for i, c_lon in enumerate(cusp_lons):
        nak_info = get_nakshatra_and_starlord(c_lon)
        c_sub = get_sub_lord(c_lon)
        cusp_details.append({
            "house": i + 1,
            "longitude": round(c_lon % 360, 4),
            "sign": get_sign(c_lon % 360),
            "nakshatra": nak_info.get("nakshatra", ""),
            "star_lord": nak_info.get("star_lord", ""),
            "sub_lord": c_sub,
            "sub_lord_significations": _planet_significations(c_sub, planet_lons, cusp_lons),
        })

    verdict = _kp_verdict(lagna_sub, topic, planet_lons, cusp_lons, ruling_planets, moon_analysis)

    t_houses = TOPIC_HOUSES.get(topic.lower(), TOPIC_HOUSES["general"])

    return {
        "prashna_number": number,
        "question": question,
        "topic": topic,
        "chart_time": utc_dt.strftime("%Y-%m-%d %H:%M UTC"),
        "lagna": {
            "longitude": round(lagna_lon % 360, 4),
            "sign": get_sign(lagna_lon % 360),
            "nakshatra": lagna_nak_info.get("nakshatra", ""),
            "star_lord": lagna_nak_info.get("star_lord", ""),
            "sub_lord": lagna_sub,
            "sub_entry": sub_entry,
        },
        "ruling_planets": ruling_planets,
        "rp_context": rp_context,  # NEW — for "Computed for: X" display
        "moon_analysis": moon_analysis,
        "verdict": verdict,
        "topic_houses": t_houses,
        "planets": planet_details,
        "cusps": cusp_details,
        "house_themes": HOUSE_THEMES,
    }

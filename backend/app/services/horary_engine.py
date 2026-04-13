"""
KP Horary (Prashna) Engine — 3-Layer Analysis.

Layer 1: Lagna CSL (is query fruitful/answerable?)
Layer 2: Primary query house CSL (actual YES/NO verdict)
Layer 3: Ruling Planets (5 planets at query time = confirmation)

In KP astrology, the querent states a number 1-249.
Each number maps to a specific sub-lord starting longitude.
The horary Lagna is placed at that degree and a full chart is erected
for the current moment at the querent's location.
"""
import swisseph as swe
from datetime import datetime, timezone
from app.services.chart_engine import (
    get_sign, get_nakshatra_and_starlord, get_sub_lord,
    get_planet_positions, date_time_to_julian
)

# Dasha years (total = 120)
DASHA_YEARS = {
    "Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10,
    "Mars": 7, "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17
}
LORD_SEQUENCE = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
NAKSHATRA_LORDS = [LORD_SEQUENCE[i % 9] for i in range(27)]
NAKSHATRA_SPAN = 360.0 / 27
TOTAL_DASHA = 120

SIGN_LORDS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury",
    "Cancer": "Moon", "Leo": "Sun", "Virgo": "Mercury",
    "Libra": "Venus", "Scorpio": "Mars", "Sagittarius": "Jupiter",
    "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter",
}

# Weekday lords (JD % 7: 0=Monday, 1=Tuesday, ..., 6=Sunday)
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

# Yes/No houses per topic (for signification checks)
TOPIC_HOUSES = {
    "marriage": {"yes": [2, 7, 11], "no": [1, 6, 10]},
    "career": {"yes": [2, 6, 10, 11], "no": [5, 8, 12]},
    "health": {"yes": [1, 5, 11], "no": [6, 8, 12]},
    "property": {"yes": [4, 11], "no": [3, 8, 12]},
    "finance": {"yes": [2, 6, 11], "no": [5, 8, 12]},
    "children": {"yes": [2, 5, 11], "no": [1, 4, 10]},
    "travel": {"yes": [3, 9, 12], "no": [4]},
    "education": {"yes": [4, 9, 11], "no": [5, 8, 12]},
    "legal": {"yes": [6, 11], "no": [1, 5, 12]},
    "general": {"yes": [1, 2, 3, 6, 10, 11], "no": [5, 8, 12]},
}

# Primary house to examine CSL for each topic (Layer 2 verdict)
TOPIC_PRIMARY_HOUSE = {
    "marriage": 7,    # H7 CSL = will marriage happen?
    "career": 10,     # H10 CSL = will job/promotion happen?
    "health": 1,      # H1 CSL = will health improve? (same as Lagna — Layer 1 doubles as Layer 2)
    "property": 4,    # H4 CSL = will property acquisition happen?
    "finance": 2,     # H2 CSL = will financial gain happen?
    "children": 5,    # H5 CSL = will children happen?
    "travel": 9,      # H9 CSL = will journey happen?
    "education": 9,   # H9 CSL = higher education / 4 for school
    "legal": 6,       # H6 CSL = will legal matter resolve in querent's favor?
    "general": 1,     # Default to Lagna
}


def _build_prashna_table() -> list[dict]:
    """Build list of 243 KP sub-lord positions ordered by zodiac longitude."""
    subs = []
    for nak_idx in range(27):
        nak_start = nak_idx * NAKSHATRA_SPAN
        nak_lord = NAKSHATRA_LORDS[nak_idx]
        start_idx = LORD_SEQUENCE.index(nak_lord)
        current_lon = nak_start
        for j in range(9):
            lord = LORD_SEQUENCE[(start_idx + j) % 9]
            span = (DASHA_YEARS[lord] / TOTAL_DASHA) * NAKSHATRA_SPAN
            subs.append({
                "num": len(subs) + 1,
                "lon_start": round(current_lon, 6),
                "lon_end": round(current_lon + span, 6),
                "nakshatra_lord": nak_lord,
                "sub_lord": lord,
                "nakshatra_idx": nak_idx,
            })
            current_lon += span
    return subs


PRASHNA_TABLE = _build_prashna_table()  # 243 entries


def _prashna_number_to_longitude(number: int) -> tuple[float, dict]:
    """Map prashna number 1-249 to a sub entry and its start longitude."""
    idx = ((number - 1) % len(PRASHNA_TABLE))
    entry = PRASHNA_TABLE[idx]
    return entry["lon_start"], entry


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


def _planet_significations(planet_name: str, planet_lons: dict, cusp_lons: list) -> list[int]:
    """Houses signified by a planet (occupied + ruled + star lord's house)."""
    if planet_name not in planet_lons:
        return []
    plon = planet_lons[planet_name]
    occupied = _get_planet_house(plon, cusp_lons)
    ruled = [i + 1 for i in range(12) if SIGN_LORDS.get(get_sign(cusp_lons[i] % 360)) == planet_name]
    star_lord = get_nakshatra_and_starlord(plon).get("star_lord", "")
    sl_house = _get_planet_house(planet_lons[star_lord], cusp_lons) if star_lord in planet_lons else 0
    result = [occupied] + ruled
    if sl_house:
        result.append(sl_house)
    return sorted(set(result))


def _compute_ruling_planets(planet_lons: dict, cusp_lons: list, jd_ut: float) -> list[str]:
    """
    Compute the 5 Ruling Planets at the time of query:
    1. Day lord (weekday planet)
    2. Lagna sign lord
    3. Lagna star lord (nakshatra lord of ascendant)
    4. Moon sign lord
    5. Moon star lord (nakshatra lord of Moon)
    """
    # Day lord: JD integer % 7 → 0=Monday(Moon), 1=Tuesday(Mars), ..., 6=Sunday(Sun)
    day_lord = WEEKDAY_LORDS[int(jd_ut) % 7]

    # Lagna (H1 cusp)
    lagna_lon = cusp_lons[0] % 360
    lagna_sign_lord = SIGN_LORDS.get(get_sign(lagna_lon), "")
    lagna_star_lord = get_nakshatra_and_starlord(lagna_lon).get("star_lord", "")

    # Moon
    moon_lon = planet_lons.get("Moon", 0) % 360
    moon_sign_lord = SIGN_LORDS.get(get_sign(moon_lon), "")
    moon_star_lord = get_nakshatra_and_starlord(moon_lon).get("star_lord", "")

    # Deduplicate while preserving order
    seen = set()
    rps = []
    for p in [day_lord, lagna_sign_lord, lagna_star_lord, moon_sign_lord, moon_star_lord]:
        if p and p not in seen:
            seen.add(p)
            rps.append(p)
    return rps


def _moon_analysis(planet_lons: dict, cusp_lons: list) -> dict:
    """
    Analyze Moon's position for KP Prashna.
    Moon's star lord significations reveal what the querent is focused on.
    Moon's sub lord shows the sub-state of the querent's mind.
    """
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
    """Analyze a single CSL against yes/no houses. Returns a layer result dict."""
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
    lagna_sub: str,
    topic: str,
    planet_lons: dict,
    cusp_lons: list,
    ruling_planets: list,
    moon_analysis: dict,
) -> dict:
    """
    3-Layer KP Prashna Verdict:

    Layer 1 — Lagna CSL: Is the query fruitful? Does H1 CSL signify topic houses?
    Layer 2 — Primary House CSL: Does the topic's primary cusp sub-lord give YES/NO?
    Layer 3 — Ruling Planets: Is the topic's primary house CSL among the 5 ruling planets?
               Do any RPs also signify the topic houses? = Confirmation signal.
    """
    houses = TOPIC_HOUSES.get(topic.lower(), TOPIC_HOUSES["general"])
    yes_houses = set(houses["yes"])
    no_houses = set(houses["no"])

    # --- Layer 1: Lagna CSL (fruitfulness of query) ---
    layer1 = _csl_layer_analysis(lagna_sub, 1, yes_houses, no_houses, planet_lons, cusp_lons)
    lagna_fruitful = layer1["layer_verdict"] in ("YES", "MIXED")

    # --- Layer 2: Primary query house CSL ---
    primary_house = TOPIC_PRIMARY_HOUSE.get(topic.lower(), 1)
    if primary_house == 1:
        # Health and general — Lagna is the primary house, use same CSL
        layer2 = layer1
        query_csl = lagna_sub
    else:
        # Get the CSL of the primary topic house
        query_cusp_lon = cusp_lons[primary_house - 1] % 360
        query_csl = get_sub_lord(query_cusp_lon)
        layer2 = _csl_layer_analysis(query_csl, primary_house, yes_houses, no_houses, planet_lons, cusp_lons)

    # --- Layer 2 supporting: H2 and H11 CSL (fulfillment gates) ---
    h2_csl = get_sub_lord(cusp_lons[1] % 360)
    h11_csl = get_sub_lord(cusp_lons[10] % 360)
    h2_sigs = set(_planet_significations(h2_csl, planet_lons, cusp_lons))
    h11_sigs = set(_planet_significations(h11_csl, planet_lons, cusp_lons))
    h2_supports = bool(h2_sigs & yes_houses)
    h11_supports = bool(h11_sigs & yes_houses)

    # --- Layer 3: Ruling Planets confirmation ---
    rp_set = set(ruling_planets)
    # Does the primary query house CSL appear in Ruling Planets?
    rp_confirm_csl = query_csl in rp_set
    # Which RPs signify the topic yes-houses?
    rp_signifying_yes = [rp for rp in ruling_planets
                         if set(_planet_significations(rp, planet_lons, cusp_lons)) & yes_houses]
    rp_strength = len(rp_signifying_yes)

    # Moon support (secondary confirmation)
    moon_star_sigs = set(moon_analysis.get("star_lord_significations", []))
    moon_supports = bool(moon_star_sigs & yes_houses)

    # --- Combine all layers into overall verdict ---
    query_verdict = layer2["layer_verdict"]

    if query_verdict == "YES":
        if lagna_fruitful and rp_confirm_csl:
            overall = "YES"
            confidence = "HIGH"
            reason = (f"H{primary_house} CSL {query_csl} signifies {sorted(layer2['yes_activated'])} ✓ | "
                      f"Lagna CSL {lagna_sub} fruitful ✓ | {query_csl} is a Ruling Planet ✓")
        elif lagna_fruitful or rp_strength >= 2:
            overall = "YES"
            confidence = "MEDIUM"
            reason = (f"H{primary_house} CSL {query_csl} signifies {sorted(layer2['yes_activated'])} ✓ | "
                      f"{'Lagna fruitful ✓' if lagna_fruitful else ''} "
                      f"{'| ' + str(rp_strength) + ' RPs confirm ✓' if rp_strength >= 2 else ''}")
        else:
            overall = "YES"
            confidence = "LOW"
            reason = f"H{primary_house} CSL {query_csl} signifies yes-houses, but Lagna CSL and RPs provide weak support."
    elif query_verdict == "NO":
        overall = "NO"
        confidence = "HIGH" if not lagna_fruitful else "MEDIUM"
        reason = (f"H{primary_house} CSL {query_csl} signifies denial houses {sorted(layer2['no_activated'])}. "
                  f"{'Lagna also unfavorable.' if not lagna_fruitful else 'Lagna shows some promise but primary gate denies.'}")
    elif query_verdict == "MIXED":
        overall = "CONDITIONAL"
        confidence = "MEDIUM"
        reason = (f"H{primary_house} CSL {query_csl} signifies both yes {sorted(layer2['yes_activated'])} "
                  f"and no {sorted(layer2['no_activated'])} houses. "
                  f"{'H2+H11 support.' if h2_supports and h11_supports else 'Monitor H2/H11 CSLs for fulfillment timing.'}")
    else:
        # NEUTRAL — CSL has no direct connection to topic houses
        overall = "UNCLEAR"
        confidence = "LOW"
        reason = (f"H{primary_house} CSL {query_csl} signifies H{sorted(layer2['significations'])} "
                  f"— no direct connection to topic houses. Query may be premature or question unclear.")

    return {
        # Overall result
        "verdict": overall,            # kept as "verdict" for backward compat with frontend
        "overall_verdict": overall,
        "confidence": confidence,
        "explanation": reason,
        "verdict_reason": reason,

        # Layer 1 details
        "lagna_csl": lagna_sub,
        "lagna_csl_significations": layer1["significations"],
        "lagna_fruitful": lagna_fruitful,
        "lagna_layer": layer1,

        # Layer 2 details
        "query_house": primary_house,
        "query_csl": query_csl,
        "query_csl_significations": layer2["significations"],
        "query_layer": layer2,

        # Supporting cusps
        "h2_csl": h2_csl,
        "h2_supports": h2_supports,
        "h11_csl": h11_csl,
        "h11_supports": h11_supports,

        # Layer 3 details
        "ruling_planets": ruling_planets,
        "rp_confirms_csl": rp_confirm_csl,
        "rp_signifying_yes": rp_signifying_yes,
        "rp_strength": rp_strength,

        # Moon analysis
        "moon_supports": moon_supports,

        # Topic houses (for display)
        "yes_houses": sorted(yes_houses),
        "no_houses": sorted(no_houses),

        # Backward compat
        "sub_lord_significations": layer1["significations"],
        "yes_houses_activated": layer2["yes_activated"],
        "no_houses_activated": layer2["no_activated"],
    }


def analyze_horary(
    number: int,
    question: str,
    topic: str = "general",
    lat: float = 17.385,
    lon: float = 78.4867,
    tz_offset: float = 5.5,
    query_date: str = None,
) -> dict:
    """
    Erect a KP Horary chart for the given prashna number and analyze it
    using 3-layer KP Prashna methodology.
    """
    if not 1 <= number <= 249:
        raise ValueError("Prashna number must be between 1 and 249")

    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)

    # Chart time
    if query_date:
        dt = datetime.strptime(query_date, "%Y-%m-%d")
        jd = swe.julday(dt.year, dt.month, dt.day, 12.0 - tz_offset)
    else:
        dt = datetime.now(timezone.utc)
        jd = swe.julday(dt.year, dt.month, dt.day,
                        dt.hour + dt.minute / 60 + dt.second / 3600)

    # Map prashna number → lagna longitude
    lagna_lon, sub_entry = _prashna_number_to_longitude(number)

    # Get current planet positions
    planets_raw = get_planet_positions(jd)
    planet_lons = {p: d["longitude"] for p, d in planets_raw.items()}

    # Compute house cusps (equal house from prashna lagna)
    cusp_lons = [(lagna_lon + i * 30) % 360 for i in range(12)]

    # Lagna sub-lord
    lagna_sub = get_sub_lord(lagna_lon)
    lagna_nak_info = get_nakshatra_and_starlord(lagna_lon)

    # Compute Ruling Planets and Moon analysis
    ruling_planets = _compute_ruling_planets(planet_lons, cusp_lons, jd)
    moon_analysis = _moon_analysis(planet_lons, cusp_lons)

    # Planet details
    planet_details = []
    for p_name, p_lon in planet_lons.items():
        nak_info = get_nakshatra_and_starlord(p_lon)
        h = _get_planet_house(p_lon, cusp_lons)
        signifs = _planet_significations(p_name, planet_lons, cusp_lons)
        retrograde = planets_raw[p_name].get("retrograde", False)
        planet_details.append({
            "planet": p_name,
            "longitude": round(p_lon % 360, 4),
            "sign": get_sign(p_lon % 360),
            "nakshatra": nak_info.get("nakshatra", ""),
            "star_lord": nak_info.get("star_lord", ""),
            "sub_lord": get_sub_lord(p_lon),
            "house": h,
            "retrograde": retrograde,
            "significations": signifs,
            "is_ruling_planet": p_name in ruling_planets,
        })

    # Cusp details
    cusp_details = []
    for i, c_lon in enumerate(cusp_lons):
        nak_info = get_nakshatra_and_starlord(c_lon)
        c_sub = get_sub_lord(c_lon)
        c_sub_sigs = _planet_significations(c_sub, planet_lons, cusp_lons)
        cusp_details.append({
            "house": i + 1,
            "longitude": round(c_lon % 360, 4),
            "sign": get_sign(c_lon % 360),
            "nakshatra": nak_info.get("nakshatra", ""),
            "star_lord": nak_info.get("star_lord", ""),
            "sub_lord": c_sub,
            "sub_lord_significations": c_sub_sigs,
        })

    # 3-Layer KP Verdict
    verdict = _kp_verdict(lagna_sub, topic, planet_lons, cusp_lons, ruling_planets, moon_analysis)

    # Relevant houses for the topic
    t_houses = TOPIC_HOUSES.get(topic.lower(), TOPIC_HOUSES["general"])

    return {
        "prashna_number": number,
        "question": question,
        "topic": topic,
        "chart_time": dt.strftime("%Y-%m-%d %H:%M UTC"),
        "lagna": {
            "longitude": round(lagna_lon % 360, 4),
            "sign": get_sign(lagna_lon % 360),
            "nakshatra": lagna_nak_info.get("nakshatra", ""),
            "star_lord": lagna_nak_info.get("star_lord", ""),
            "sub_lord": lagna_sub,
            "sub_entry": sub_entry,
        },
        "ruling_planets": ruling_planets,
        "moon_analysis": moon_analysis,
        "verdict": verdict,
        "topic_houses": t_houses,
        "planets": planet_details,
        "cusps": cusp_details,
        "house_themes": HOUSE_THEMES,
    }

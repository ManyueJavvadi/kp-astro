"""
KP Horary (Prashna) Engine.

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

# House significations for common question types
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
    """Map prashna number 1-249 to a sub entry and its start longitude.
    Numbers > 243 wrap around (traditional KP tables sometimes extend to 249).
    """
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


def _kp_verdict(cusp1_sub: str, topic: str, planet_lons: dict, cusp_lons: list) -> dict:
    """
    KP horary verdict logic:
    - Find what houses the sub-lord of H1 (Lagna) signifies
    - If it signifies the 'yes' houses for the topic → YES
    - If it signifies the 'no' (denial) houses → NO
    - If both or neither → CONDITIONAL
    """
    houses = TOPIC_HOUSES.get(topic.lower(), TOPIC_HOUSES["general"])
    yes_houses = set(houses["yes"])
    no_houses = set(houses["no"])

    sub_signifs = set(_planet_significations(cusp1_sub, planet_lons, cusp_lons))

    yes_match = sub_signifs & yes_houses
    no_match = sub_signifs & no_houses

    if yes_match and not no_match:
        verdict = "YES"
        confidence = "High"
        explanation = f"Lagna sub-lord {cusp1_sub} signifies H{sorted(yes_match)} — favourable houses for this topic."
    elif no_match and not yes_match:
        verdict = "NO"
        confidence = "High"
        explanation = f"Lagna sub-lord {cusp1_sub} signifies H{sorted(no_match)} — denial/obstacle houses."
    elif yes_match and no_match:
        verdict = "CONDITIONAL"
        confidence = "Medium"
        explanation = (f"Lagna sub-lord {cusp1_sub} signifies both favourable H{sorted(yes_match)} "
                       f"and denial H{sorted(no_match)} — outcome depends on timing and other factors.")
    else:
        verdict = "UNCLEAR"
        confidence = "Low"
        explanation = f"Lagna sub-lord {cusp1_sub} signifies H{sorted(sub_signifs)} — no direct connection to topic houses."

    return {
        "verdict": verdict,
        "confidence": confidence,
        "explanation": explanation,
        "sub_lord_significations": sorted(sub_signifs),
        "yes_houses_activated": sorted(yes_match),
        "no_houses_activated": sorted(no_match),
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
    Erect a KP Horary chart for the given prashna number and analyze it.

    Args:
        number: Prashna number chosen by querent (1-249)
        question: The question being asked
        topic: One of marriage/career/health/property/finance/children/travel/education/legal/general
        lat/lon: Querent's location
        tz_offset: Timezone offset in hours (default IST 5.5)
        query_date: Optional "YYYY-MM-DD" for historical analysis (defaults to today)
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

    # Compute house cusps with prashna Lagna fixed
    # Override Ascendant with prashna lagna, then compute remaining cusps
    # Standard approach: use equal house system from prashna lagna
    cusp_lons = [(lagna_lon + i * 30) % 360 for i in range(12)]

    # Lagna sub-lord
    lagna_sub = get_sub_lord(lagna_lon)
    lagna_nak_info = get_nakshatra_and_starlord(lagna_lon)

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
        })

    # Cusp details
    cusp_details = []
    for i, c_lon in enumerate(cusp_lons):
        nak_info = get_nakshatra_and_starlord(c_lon)
        cusp_details.append({
            "house": i + 1,
            "longitude": round(c_lon % 360, 4),
            "sign": get_sign(c_lon % 360),
            "nakshatra": nak_info.get("nakshatra", ""),
            "star_lord": nak_info.get("star_lord", ""),
            "sub_lord": get_sub_lord(c_lon),
        })

    # KP Verdict
    verdict = _kp_verdict(lagna_sub, topic, planet_lons, cusp_lons)

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
        "verdict": verdict,
        "topic_houses": t_houses,
        "planets": planet_details,
        "cusps": cusp_details,
        "house_themes": HOUSE_THEMES,
    }

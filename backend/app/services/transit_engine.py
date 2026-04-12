"""
KP Transit (Gochar) Analysis Engine.
Computes current planet positions and their significance against a natal chart.
Highlights transits that are active under the current Dasha/Bhukti/Antara period.
"""
import swisseph as swe
from datetime import datetime, timezone
from app.services.chart_engine import (
    get_sign, get_nakshatra_and_starlord, get_sub_lord,
    get_planet_positions, date_time_to_julian
)

SIGN_LORDS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury",
    "Cancer": "Moon", "Leo": "Sun", "Virgo": "Mercury",
    "Libra": "Venus", "Scorpio": "Mars", "Sagittarius": "Jupiter",
    "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter",
}

PLANET_KEYS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]

PLANET_NATURE = {
    "Sun": {"speed": "medium", "symbol": "☉", "governs": "self, vitality, authority, father"},
    "Moon": {"speed": "fast", "symbol": "☽", "governs": "mind, emotions, mother, public"},
    "Mars": {"speed": "medium", "symbol": "♂", "governs": "energy, courage, property, surgery"},
    "Mercury": {"speed": "fast", "symbol": "☿", "governs": "intellect, communication, trade, skin"},
    "Jupiter": {"speed": "slow", "symbol": "♃", "governs": "wisdom, marriage (for female), children, wealth"},
    "Venus": {"speed": "medium", "symbol": "♀", "governs": "marriage (for male), luxury, arts, vehicles"},
    "Saturn": {"speed": "slow", "symbol": "♄", "governs": "karma, delays, discipline, elderly, chronic issues"},
    "Rahu": {"speed": "slow", "symbol": "☊", "governs": "ambition, foreign, unconventional, materialism"},
    "Ketu": {"speed": "slow", "symbol": "☋", "governs": "spirituality, detachment, research, past karma"},
}


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


def _planet_significations(planet_name: str, planets: dict, cusp_lons: list) -> list:
    if planet_name not in planets:
        return []
    plon = planets[planet_name]["longitude"]
    occupied = _get_planet_house(plon, cusp_lons)
    ruled = [i + 1 for i in range(12) if SIGN_LORDS.get(get_sign(cusp_lons[i] % 360)) == planet_name]
    star_lord = get_nakshatra_and_starlord(plon).get("star_lord", "")
    sl_house = _get_planet_house(planets[star_lord]["longitude"], cusp_lons) if star_lord in planets else 0
    result = [occupied] + ruled
    if sl_house:
        result.append(sl_house)
    return sorted(set(result))


def _sade_sati_phase(natal_moon_sign: str, transit_saturn_sign: str) -> str | None:
    signs = [
        "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
        "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
    ]
    if natal_moon_sign not in signs or transit_saturn_sign not in signs:
        return None
    moon_idx = signs.index(natal_moon_sign)
    sat_idx = signs.index(transit_saturn_sign)
    diff = (sat_idx - moon_idx) % 12
    if diff == 11:
        return "12th (Elarai - Phase 1)"
    if diff == 0:
        return "1st (Peak - Phase 2)"
    if diff == 1:
        return "2nd (Ending - Phase 3)"
    return None


def _interpret_transit(planet: str, transit_house: int, natal_signifs: list,
                       is_dasha_lord: bool, is_bhukti_lord: bool, is_antara_lord: bool,
                       retrograde: bool) -> dict:
    """Generate KP-flavored transit interpretation."""
    relevance = "High" if is_dasha_lord else "Medium" if is_bhukti_lord else "Low" if is_antara_lord else "Background"

    # House-specific brief interpretation
    house_themes = {
        1: "self, health, personality", 2: "wealth, family, speech",
        3: "siblings, communication, short travel", 4: "home, mother, property",
        5: "children, education, romance, speculations", 6: "enemies, debts, service, health challenges",
        7: "marriage, partnerships, contracts", 8: "longevity, inheritance, occult, sudden changes",
        9: "luck, religion, father, long travel, higher education", 10: "career, reputation, authority",
        11: "gains, income, social circle, elder siblings", 12: "expenses, losses, foreign, spirituality, bed pleasures"
    }

    theme = house_themes.get(transit_house, "general life")
    retro_note = " (Retrograde — delays/revisits)" if retrograde else ""

    # Build a concise KP note
    if is_dasha_lord or is_bhukti_lord:
        significance_note = f"Active dasha period planet. Transit activates {theme}."
    else:
        significance_note = f"Background influence on {theme}."

    # Overlap between transit house and natal significations
    natal_activation = [h for h in natal_signifs if h == transit_house]

    return {
        "relevance": relevance,
        "theme": theme,
        "note": significance_note + retro_note,
        "natal_houses_activated": natal_activation,
        "is_dasha_lord": is_dasha_lord,
        "is_bhukti_lord": is_bhukti_lord,
        "is_antara_lord": is_antara_lord,
    }


def analyze_transits(
    natal: dict,          # workspace data with planets, cusps, dasha info
    transit_date: str = None,   # "YYYY-MM-DD" — defaults to today
    lat: float = 17.385,
    lon: float = 78.4867,
    tz_offset: float = 5.5,
) -> dict:
    """
    Compute current transit positions and interpret them against the natal chart.
    natal must have: planets, cusps (as dict), current_dasha_lord, current_bhukti_lord, current_antara_lord.
    """
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)

    # Determine transit date/time
    if transit_date:
        dt = datetime.strptime(transit_date, "%Y-%m-%d")
    else:
        dt = datetime.now(timezone.utc)

    jd_transit = swe.julday(dt.year, dt.month, dt.day, 12.0 - tz_offset)

    # Get current (transit) planet positions
    transit_planets = get_planet_positions(jd_transit)

    # Get transit cusps at user's location (for transit house placements)
    transit_cusps, _ = swe.houses_ex(jd_transit, lat, lon, b'P', swe.FLG_SIDEREAL)
    transit_cusp_lons = list(transit_cusps[:12])

    # Extract natal data — workspace format uses arrays
    # planets: [{planet_en, longitude, retrograde, ...}, ...]
    # cusps:   [{house_num, cusp_longitude, ...}, ...]
    natal_planet_lons = {}
    for p in natal.get("planets", []):
        if isinstance(p, dict) and "planet_en" in p:
            natal_planet_lons[p["planet_en"]] = p.get("longitude", 0)

    # Build natal cusp_lons list sorted by house_num
    cusp_list = natal.get("cusps", [])
    if cusp_list and isinstance(cusp_list[0], dict) and "house_num" in cusp_list[0]:
        cusp_sorted = sorted(cusp_list, key=lambda c: c["house_num"])
        natal_cusp_lons = [c.get("cusp_longitude", idx * 30) for idx, c in enumerate(cusp_sorted)]
    else:
        natal_cusp_lons = [i * 30 for i in range(12)]

    # Pad/trim to exactly 12
    while len(natal_cusp_lons) < 12:
        natal_cusp_lons.append(len(natal_cusp_lons) * 30)
    natal_cusp_lons = natal_cusp_lons[:12]

    # Current dasha lords — workspace format
    dasha_lord = natal.get("mahadasha", {}).get("lord_en", "") if natal.get("mahadasha") else ""
    bhukti_lord = natal.get("current_antardasha", {}).get("lord_en", "") if natal.get("current_antardasha") else ""
    antara_lord = natal.get("current_pratyantardasha", {}).get("lord_en", "") if natal.get("current_pratyantardasha") else ""

    # Natal moon sign for Sade Sati
    natal_moon_lon = natal_planet_lons.get("Moon", 0)
    natal_moon_sign = get_sign(natal_moon_lon % 360)
    transit_saturn_sign = get_sign(transit_planets.get("Saturn", {}).get("longitude", 0) % 360)

    # Compute natal planet significations
    natal_p_dict = {name: {"longitude": lon_val} for name, lon_val in natal_planet_lons.items()}
    natal_signifs_map = {}
    for p in PLANET_KEYS:
        natal_signifs_map[p] = _planet_significations(p, natal_p_dict, natal_cusp_lons)

    # Build transit analysis for each planet
    transit_results = []
    for p in PLANET_KEYS:
        t_data = transit_planets.get(p, {})
        t_lon = t_data.get("longitude", 0)
        t_retro = t_data.get("retrograde", False)
        t_sign = get_sign(t_lon % 360)
        t_nak_info = get_nakshatra_and_starlord(t_lon)
        t_nakshatra = t_nak_info.get("nakshatra", "")
        t_star_lord = t_nak_info.get("star_lord", "")
        t_sub_lord = get_sub_lord(t_lon)
        t_house = _get_planet_house(t_lon, natal_cusp_lons)  # transit planet in natal house

        is_dasha = p == dasha_lord
        is_bhukti = p == bhukti_lord
        is_antara = p == antara_lord

        natal_sigs = natal_signifs_map.get(p, [])

        # Find distance from natal position
        natal_lon = natal_planet_lons.get(p, None)
        if natal_lon is not None:
            delta = (t_lon - natal_lon) % 360
            over_natal = delta < 8 or delta > 352  # within 8° of natal position
        else:
            over_natal = False

        interp = _interpret_transit(p, t_house, natal_sigs, is_dasha, is_bhukti, is_antara, t_retro)

        transit_results.append({
            "planet": p,
            "symbol": PLANET_NATURE.get(p, {}).get("symbol", p[0]),
            "longitude": round(t_lon % 360, 4),
            "sign": t_sign,
            "nakshatra": t_nakshatra,
            "star_lord": t_star_lord,
            "sub_lord": t_sub_lord,
            "transit_house": t_house,
            "retrograde": t_retro,
            "natal_significations": natal_sigs,
            "governs": PLANET_NATURE.get(p, {}).get("governs", ""),
            "over_natal_position": over_natal,
            **interp,
        })

    # Sort: dasha lords first, then bhukti, then by relevance
    def sort_key(t):
        if t["is_dasha_lord"]: return 0
        if t["is_bhukti_lord"]: return 1
        if t["is_antara_lord"]: return 2
        return 3

    transit_results.sort(key=sort_key)

    sade_sati = _sade_sati_phase(natal_moon_sign, transit_saturn_sign)

    return {
        "transit_date": dt.strftime("%Y-%m-%d"),
        "transits": transit_results,
        "current_period": {
            "dasha_lord": dasha_lord,
            "bhukti_lord": bhukti_lord,
            "antara_lord": antara_lord,
        },
        "sade_sati": {
            "active": sade_sati is not None,
            "phase": sade_sati,
            "natal_moon_sign": natal_moon_sign,
            "saturn_in": transit_saturn_sign,
        },
        "natal_moon_sign": natal_moon_sign,
    }

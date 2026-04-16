"""
KP Marriage Compatibility Engine.
Computes KP-based compatibility + full 8-kuta Ashtakoota + Kuja/Manglik dosha.
Includes D9 Navamsa, detailed significators, DBA, 5th CSL, and divorce risk.
"""
import swisseph as swe
from app.services.chart_engine import (
    get_sub_lord, get_nakshatra_and_starlord, get_sign,
    get_planet_positions, date_time_to_julian,
    generate_chart,
    calculate_dashas, get_current_dasha,
    calculate_antardashas, get_current_antardasha,
    calculate_pratyantardashas, get_current_pratyantardasha,
)
from app.services.chart_formatter import format_chart_for_frontend

# ── Planet sign lordships ─────────────────────────────────────

SIGN_LORDS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury",
    "Cancer": "Moon", "Leo": "Sun", "Virgo": "Mercury",
    "Libra": "Venus", "Scorpio": "Mars", "Sagittarius": "Jupiter",
    "Capricorn": "Saturn", "Aquarius": "Saturn", "Pisces": "Jupiter",
}

SIGNS_ORDER = [
    "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
    "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
]

NAKSHATRA_ORDER = [
    "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra",
    "Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni",
    "Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
    "Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha",
    "Purva Bhadrapada","Uttara Bhadrapada","Revati",
]

# ── Ashtakoota lookup tables ──────────────────────────────────

NAKSHATRA_GANA = {
    "Ashwini": "Deva", "Mrigashira": "Deva", "Punarvasu": "Deva",
    "Pushya": "Deva", "Hasta": "Deva", "Swati": "Deva",
    "Anuradha": "Deva", "Shravana": "Deva", "Revati": "Deva",
    "Bharani": "Manushya", "Rohini": "Manushya", "Ardra": "Manushya",
    "Purva Phalguni": "Manushya", "Uttara Phalguni": "Manushya",
    "Purva Ashadha": "Manushya", "Uttara Ashadha": "Manushya",
    "Shatabhisha": "Manushya", "Purva Bhadrapada": "Manushya",
    "Krittika": "Rakshasa", "Ashlesha": "Rakshasa", "Magha": "Rakshasa",
    "Chitra": "Rakshasa", "Vishakha": "Rakshasa", "Jyeshtha": "Rakshasa",
    "Mula": "Rakshasa", "Dhanishtha": "Rakshasa", "Uttara Bhadrapada": "Rakshasa",
}

NAKSHATRA_NADI = {
    "Ashwini": "Aadi", "Ardra": "Aadi", "Punarvasu": "Aadi",
    "Uttara Phalguni": "Aadi", "Hasta": "Aadi", "Jyeshtha": "Aadi",
    "Mula": "Aadi", "Shatabhisha": "Aadi", "Purva Bhadrapada": "Aadi",
    "Bharani": "Madhya", "Mrigashira": "Madhya", "Pushya": "Madhya",
    "Purva Phalguni": "Madhya", "Chitra": "Madhya", "Anuradha": "Madhya",
    "Purva Ashadha": "Madhya", "Dhanishtha": "Madhya", "Uttara Bhadrapada": "Madhya",
    "Krittika": "Antya", "Rohini": "Antya", "Ashlesha": "Antya",
    "Magha": "Antya", "Swati": "Antya", "Vishakha": "Antya",
    "Uttara Ashadha": "Antya", "Shravana": "Antya", "Revati": "Antya",
}

# Yoni: (animal, sex)
NAKSHATRA_YONI = {
    "Ashwini": ("Horse", "M"), "Shatabhisha": ("Horse", "F"),
    "Bharani": ("Elephant", "M"), "Revati": ("Elephant", "F"),
    "Pushya": ("Goat", "M"), "Krittika": ("Goat", "F"),
    "Rohini": ("Serpent", "M"), "Mrigashira": ("Serpent", "F"),
    "Moola": ("Dog", "M"), "Ardra": ("Dog", "F"),
    "Mula": ("Dog", "M"),  # alias
    "Punarvasu": ("Cat", "M"), "Ashlesha": ("Cat", "F"),
    "Magha": ("Rat", "M"), "Purva Phalguni": ("Rat", "F"),
    "Uttara Phalguni": ("Cow", "M"), "Uttara Bhadrapada": ("Cow", "F"),
    "Hasta": ("Buffalo", "M"), "Swati": ("Buffalo", "F"),
    "Vishakha": ("Tiger", "M"), "Chitra": ("Tiger", "F"),
    "Jyeshtha": ("Deer", "M"), "Anuradha": ("Deer", "F"),
    "Purva Ashadha": ("Monkey", "M"), "Shravana": ("Monkey", "F"),
    "Uttara Ashadha": ("Mongoose", "N"), "Dhanishtha": ("Lion", "M"),
    "Purva Bhadrapada": ("Lion", "F"),
}

YONI_ENEMIES = {
    frozenset(["Horse", "Buffalo"]),
    frozenset(["Elephant", "Lion"]),
    frozenset(["Goat", "Monkey"]),
    frozenset(["Serpent", "Mongoose"]),
    frozenset(["Dog", "Deer"]),
    frozenset(["Cat", "Rat"]),
    frozenset(["Cow", "Tiger"]),
}

SIGN_VARNA = {
    "Cancer": "Brahmin", "Scorpio": "Brahmin", "Pisces": "Brahmin",
    "Aries": "Kshatriya", "Leo": "Kshatriya", "Sagittarius": "Kshatriya",
    "Taurus": "Vaishya", "Virgo": "Vaishya", "Capricorn": "Vaishya",
    "Gemini": "Shudra", "Libra": "Shudra", "Aquarius": "Shudra",
}
VARNA_RANK = {"Brahmin": 4, "Kshatriya": 3, "Vaishya": 2, "Shudra": 1}

PLANET_FRIENDS = {
    "Sun":     {"friends": {"Moon","Mars","Jupiter"}, "neutral": {"Mercury"}, "enemies": {"Venus","Saturn","Rahu","Ketu"}},
    "Moon":    {"friends": {"Sun","Mercury"}, "neutral": {"Mars","Jupiter","Venus","Saturn"}, "enemies": {"Rahu","Ketu"}},
    "Mars":    {"friends": {"Sun","Moon","Jupiter"}, "neutral": {"Venus","Saturn","Ketu"}, "enemies": {"Mercury","Rahu"}},
    "Mercury": {"friends": {"Sun","Venus"}, "neutral": {"Mars","Jupiter","Saturn","Rahu"}, "enemies": {"Moon","Ketu"}},
    "Jupiter": {"friends": {"Sun","Moon","Mars"}, "neutral": {"Saturn"}, "enemies": {"Mercury","Venus","Rahu","Ketu"}},
    "Venus":   {"friends": {"Mercury","Saturn"}, "neutral": {"Mars","Jupiter"}, "enemies": {"Sun","Moon","Rahu","Ketu"}},
    "Saturn":  {"friends": {"Mercury","Venus"}, "neutral": {"Jupiter"}, "enemies": {"Sun","Moon","Mars","Rahu","Ketu"}},
}

VASYA_MAP = {
    "Leo": ["Aries"], "Cancer": ["Scorpio","Sagittarius"],
    "Aquarius": ["Aries"], "Virgo": ["Pisces","Gemini"],
    "Scorpio": ["Cancer"], "Capricorn": ["Aries"], "Pisces": ["Capricorn"],
}

MARRIAGE_DENIAL_HOUSES = {1, 6, 10}
MARRIAGE_PROMISE_HOUSES = {2, 7, 11}
KUJA_HOUSES = {1, 2, 4, 7, 8, 12}

# H7 sub-lord interpretations for marriage type / spouse nature
H7_SUBLORD_TRAITS = {
    "Sun": {
        "marriage_type": "Formal, dignified marriage — often arranged",
        "spouse_nature": "Authoritative, proud, warm-hearted",
        "age_gap": "Small age gap, spouse may be older",
        "caution": "Ego clashes possible; spouse needs respect"
    },
    "Moon": {
        "marriage_type": "Emotionally driven marriage",
        "spouse_nature": "Emotional, caring, changeable moods",
        "age_gap": "Similar age",
        "caution": "Emotional dependency; mood swings"
    },
    "Mars": {
        "marriage_type": "Quick or impulsive marriage, sometimes love",
        "spouse_nature": "Energetic, assertive, passionate",
        "age_gap": "Spouse may be younger",
        "caution": "Quarrels, arguments — anger management needed"
    },
    "Mercury": {
        "marriage_type": "Intellectual match, may involve multiple relationships",
        "spouse_nature": "Witty, communicative, youthful",
        "age_gap": "Similar or younger spouse",
        "caution": "Commitment issues; dual-mindedness possible"
    },
    "Jupiter": {
        "marriage_type": "Traditional, auspicious marriage",
        "spouse_nature": "Wise, learned, generous, philosophical",
        "age_gap": "Spouse often older or mature",
        "caution": "Over-idealism; may be too orthodox"
    },
    "Venus": {
        "marriage_type": "Love marriage or very pleasant arranged marriage",
        "spouse_nature": "Beautiful, artistic, luxury-loving, charming",
        "age_gap": "Similar or younger spouse",
        "caution": "Indulgence; excessive pleasure-seeking"
    },
    "Saturn": {
        "marriage_type": "Delayed marriage; serious, mature relationship",
        "spouse_nature": "Serious, responsible, hardworking, reserved",
        "age_gap": "Large age gap (5+ years), spouse often significantly older",
        "caution": "Dissatisfaction, coldness, heavy responsibilities"
    },
    "Rahu": {
        "marriage_type": "Unconventional, inter-caste, inter-religion, or foreign spouse",
        "spouse_nature": "Ambitious, worldly, unconventional",
        "age_gap": "Varies widely",
        "caution": "Karmic delays, sudden circumstances, non-traditional setup"
    },
    "Ketu": {
        "marriage_type": "Karmic or spiritual marriage; may be detached",
        "spouse_nature": "Spiritual, introverted, detached from material life",
        "age_gap": "Varies",
        "caution": "Separation tendency; emotional detachment"
    },
}


# ── D9 Navamsa ───────────────────────────────────────────────

# Element-based navamsa starting signs
# Fire (Aries/Leo/Sag) → starts from Aries (0)
# Earth (Taurus/Virgo/Cap) → starts from Capricorn (9)
# Air (Gemini/Libra/Aquarius) → starts from Libra (6)
# Water (Cancer/Scorpio/Pisces) → starts from Cancer (3)
_NAVAMSA_START = {
    0: 0, 4: 0, 8: 0,    # Fire
    1: 9, 5: 9, 9: 9,    # Earth
    2: 6, 6: 6, 10: 6,   # Air
    3: 3, 7: 3, 11: 3,   # Water
}


def _d9_sign(longitude: float) -> str:
    """Compute D9 (Navamsa) sign for a given sidereal longitude."""
    sign_idx = int((longitude % 360) / 30)
    pos_in_sign = (longitude % 360) % 30
    navamsa_div = int(pos_in_sign / (30 / 9))  # 0-8 within sign
    if navamsa_div > 8:
        navamsa_div = 8
    start = _NAVAMSA_START[sign_idx]
    d9_idx = (start + navamsa_div) % 12
    return SIGNS_ORDER[d9_idx]


def _compute_d9(chart: dict) -> dict:
    """
    Compute D9 Navamsa data for key marriage planets.
    Returns D9 signs for Venus, Moon, Jupiter, Mars, 7th lord, and Lagna.
    """
    planets = chart["planets"]
    cusp_lons = chart["cusp_lons"]

    # D9 lagna from ascendant
    d9_lagna = _d9_sign(chart["lagna_lon"])

    # D9 for key planets
    result = {"d9_lagna_sign": d9_lagna}

    for p_name in ("Venus", "Moon", "Jupiter", "Mars", "Sun", "Saturn", "Mercury", "Rahu", "Ketu"):
        if p_name in planets:
            result[f"{p_name.lower()}_d9_sign"] = _d9_sign(planets[p_name]["longitude"])

    # D9 7th lord: lord of the sign on 7th cusp, then compute that planet's D9
    h7_lon = cusp_lons[6] % 360
    h7_sign_lord = SIGN_LORDS.get(get_sign(h7_lon), "")
    result["d9_7th_lord"] = h7_sign_lord
    if h7_sign_lord in planets:
        result["d9_7th_lord_sign"] = _d9_sign(planets[h7_sign_lord]["longitude"])

    # D9 7th house sign (sign opposite D9 lagna)
    d9_lagna_idx = SIGNS_ORDER.index(d9_lagna)
    result["d9_7th_sign"] = SIGNS_ORDER[(d9_lagna_idx + 6) % 12]

    return result


# ── Chart builder ─────────────────────────────────────────────

def _build_chart(person: dict) -> dict:
    """Build full chart data for a person."""
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    jd = date_time_to_julian(
        person["date"], person["time"],
        person.get("timezone_offset", 5.5)
    )
    lat = person["latitude"]
    lon = person["longitude"]
    planets = get_planet_positions(jd)
    cusps, _ = swe.houses_ex(jd, lat, lon, b'P', swe.FLG_SIDEREAL)
    cusp_lons = list(cusps[:12])

    moon_lon = planets.get("Moon", {}).get("longitude", 0)
    lagna_lon = cusp_lons[0] % 360

    moon_nakshatra_info = get_nakshatra_and_starlord(moon_lon)
    lagna_nakshatra_info = get_nakshatra_and_starlord(lagna_lon)

    moon_sign = get_sign(moon_lon % 360)
    lagna_sign = get_sign(lagna_lon)

    h7_sl = get_sub_lord(cusp_lons[6] % 360)

    return {
        "jd": jd,
        "planets": planets,
        "cusp_lons": cusp_lons,
        "moon_lon": moon_lon,
        "lagna_lon": lagna_lon,
        "moon_nakshatra": moon_nakshatra_info.get("nakshatra", ""),
        "moon_star_lord": moon_nakshatra_info.get("star_lord", ""),
        "lagna_nakshatra": lagna_nakshatra_info.get("nakshatra", ""),
        "moon_sign": moon_sign,
        "lagna_sign": lagna_sign,
        "h7_sub_lord": h7_sl,
    }


# ── House signification ───────────────────────────────────────

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


def _planet_significations(planet_name: str, planets: dict, cusp_lons: list) -> set:
    if planet_name not in planets:
        return set()
    plon = planets[planet_name]["longitude"]
    occupied = _get_planet_house(plon, cusp_lons)
    ruled = {i + 1 for i in range(12) if SIGN_LORDS.get(get_sign(cusp_lons[i] % 360)) == planet_name}
    star_lord = get_nakshatra_and_starlord(plon).get("star_lord", "")
    sl_house = _get_planet_house(planets[star_lord]["longitude"], cusp_lons) if star_lord in planets else 0
    result = {occupied} | ruled
    if sl_house:
        result.add(sl_house)
    return result


def _get_cusp_sub_lord_sigs(house_num: int, chart: dict) -> tuple[str, set]:
    """Get the CSL and its significations for a given house number."""
    cusp_lon = chart["cusp_lons"][house_num - 1] % 360
    csl = get_sub_lord(cusp_lon)
    sigs = _planet_significations(csl, chart["planets"], chart["cusp_lons"])
    return csl, sigs


def _h7_sublord_promise(chart: dict) -> dict:
    """Check if H7 sub-lord promises marriage. Includes richer KP data."""
    h7_sl = chart["h7_sub_lord"]
    sigs = _planet_significations(h7_sl, chart["planets"], chart["cusp_lons"])
    has_promise = bool(sigs & MARRIAGE_PROMISE_HOUSES)
    has_denial = bool(sigs & MARRIAGE_DENIAL_HOUSES)

    # H7 sign lord (not sub-lord) — additional indicator
    h7_lon = chart["cusp_lons"][6] % 360
    h7_sign_lord = SIGN_LORDS.get(get_sign(h7_lon), "")
    h7_lord_sigs = _planet_significations(h7_sign_lord, chart["planets"], chart["cusp_lons"])
    h7_lord_supports = bool(h7_lord_sigs & MARRIAGE_PROMISE_HOUSES)

    # H7 sub-lord traits (marriage type, spouse nature, caution)
    traits = H7_SUBLORD_TRAITS.get(h7_sl, {})

    # Marriage type classification
    sigs_set = set(sigs)
    if h7_sl in ("Rahu", "Ketu"):
        marriage_type = "Unconventional/Karmic"
    elif 5 in sigs_set and 7 in sigs_set and 11 in sigs_set:
        marriage_type = "Love Marriage"
    elif 12 in sigs_set and 7 in sigs_set and 11 in sigs_set:
        marriage_type = "Secret/Private Marriage"
    elif 2 in sigs_set and 7 in sigs_set and 11 in sigs_set:
        marriage_type = "Traditional/Arranged Marriage"
    elif 5 in sigs_set:
        marriage_type = "Love component present"
    else:
        marriage_type = "Not determined"

    return {
        "sub_lord": h7_sl,
        "signified_houses": sorted(sigs),
        "has_promise": has_promise,
        "has_denial": has_denial,
        "verdict": "Promised" if has_promise and not has_denial else ("Denied" if has_denial else "Conditional"),
        "h7_sign_lord": h7_sign_lord,
        "h7_lord_supports": h7_lord_supports,
        "marriage_type": marriage_type,
        "spouse_nature": traits.get("spouse_nature", ""),
        "age_gap": traits.get("age_gap", ""),
        "marriage_style": traits.get("marriage_type", ""),
        "caution": traits.get("caution", ""),
    }


def _marriage_significators(chart: dict) -> set:
    """All planets that signify houses 2, 7, or 11."""
    result = set()
    for p in chart["planets"]:
        sigs = _planet_significations(p, chart["planets"], chart["cusp_lons"])
        if sigs & MARRIAGE_PROMISE_HOUSES:
            result.add(p)
    return result


def _marriage_significators_detailed(chart: dict) -> dict:
    """
    4-level KP significator hierarchy for marriage houses (2, 7, 11).
    Level 1: Occupants of H2/H7/H11
    Level 2: Lords (sign lords) of H2/H7/H11
    Level 3: Planets in the star of occupants of H2/H7/H11
    Level 4: Planets in the star of lords of H2/H7/H11
    Plus: 'fruitful' = those also in Ruling Planets.
    """
    planets = chart["planets"]
    cusp_lons = chart["cusp_lons"]
    target_houses = {2, 7, 11}

    # Level 1: Occupants of H2/H7/H11
    occupants = []
    for p in planets:
        h = _get_planet_house(planets[p]["longitude"], cusp_lons)
        if h in target_houses:
            occupants.append(p)

    # Level 2: Lords of H2/H7/H11 cusps
    lords = []
    for h in target_houses:
        sign = get_sign(cusp_lons[h - 1] % 360)
        lord = SIGN_LORDS.get(sign, "")
        if lord and lord not in lords:
            lords.append(lord)

    # Level 3: Planets in the star of occupants
    star_of_occupants = []
    for p in planets:
        sl = get_nakshatra_and_starlord(planets[p]["longitude"]).get("star_lord", "")
        if sl in occupants and p not in star_of_occupants:
            star_of_occupants.append(p)

    # Level 4: Planets in the star of lords
    star_of_lords = []
    for p in planets:
        sl = get_nakshatra_and_starlord(planets[p]["longitude"]).get("star_lord", "")
        if sl in lords and p not in star_of_lords:
            star_of_lords.append(p)

    # Fruitful: significators that are also Ruling Planets
    rp = _ruling_planets(chart)
    all_sigs = set(occupants) | set(lords) | set(star_of_occupants) | set(star_of_lords)
    fruitful = sorted(all_sigs & rp)

    return {
        "planets": sorted(all_sigs),
        "by_level": {
            "occupants_2_7_11": occupants,
            "lords_2_7_11": lords,
            "star_of_occupants": star_of_occupants,
            "star_of_lords": star_of_lords,
        },
        "fruitful": fruitful,
    }


def _current_dba(person: dict, chart: dict) -> dict:
    """
    Get current Mahadasha-Antardasha-Pratyantardasha for a person.
    Also checks if MD/AD lords signify marriage houses (2, 7, 11).
    """
    try:
        moon_lon = chart["moon_lon"]
        dashas = calculate_dashas(person["date"], person["time"], moon_lon, person.get("timezone_offset", 5.5))
        md = get_current_dasha(dashas)
        ads = calculate_antardashas(md)
        ad = get_current_antardasha(ads)
        pads = calculate_pratyantardashas(ad)
        pad = get_current_pratyantardasha(pads)

        # Check if MD/AD lords signify marriage houses
        md_sigs = _planet_significations(md["lord"], chart["planets"], chart["cusp_lons"])
        ad_sigs = _planet_significations(ad["antardasha_lord"], chart["planets"], chart["cusp_lons"])

        md_favorable = bool(md_sigs & MARRIAGE_PROMISE_HOUSES)
        ad_favorable = bool(ad_sigs & MARRIAGE_PROMISE_HOUSES)

        return {
            "md_lord": md["lord"],
            "md_end": md["end"],
            "ad_lord": ad["antardasha_lord"],
            "ad_end": ad["end"],
            "pad_lord": pad["pratyantardasha_lord"],
            "pad_end": pad["end"],
            "md_signifies": sorted(md_sigs),
            "ad_signifies": sorted(ad_sigs),
            "md_favorable": md_favorable,
            "ad_favorable": ad_favorable,
            "favorable": md_favorable and ad_favorable,
        }
    except Exception:
        return {
            "md_lord": "Unknown", "md_end": "",
            "ad_lord": "Unknown", "ad_end": "",
            "pad_lord": "Unknown", "pad_end": "",
            "md_signifies": [], "ad_signifies": [],
            "md_favorable": False, "ad_favorable": False,
            "favorable": False,
        }


def _h5_sublord_analysis(chart: dict) -> dict:
    """
    5th CSL analysis — love/romance quality.
    5+8+12 without 2/7/11 = heartbreak formula.
    """
    csl, sigs = _get_cusp_sub_lord_sigs(5, chart)
    has_5_8_12 = {5, 8, 12}.issubset(sigs)
    has_love = bool(sigs & {5, 7, 11})
    has_promise_houses = bool(sigs & {2, 7, 11})
    heartbreak = has_5_8_12 and not has_promise_houses

    return {
        "sub_lord": csl,
        "signified_houses": sorted(sigs),
        "love_indicated": has_love,
        "heartbreak_5_8_12": heartbreak,
        "note": (
            "Love affair may end badly (5-8-12 without 2/7/11)" if heartbreak
            else "Love and romance indicated" if has_love
            else "Romance not strongly indicated"
        ),
    }


def _separation_risk(chart: dict) -> dict:
    """
    Divorce/separation risk analysis.
    Checks H7 CSL for 6/8/12 signification + Mars in 7th/8th.
    """
    h7_promise = _h7_sublord_promise(chart)
    sigs = set(h7_promise["signified_houses"])
    risk_factors = []

    if 6 in sigs:
        risk_factors.append("H7 CSL signifies H6 (disputes/separation)")
    if 12 in sigs:
        risk_factors.append("H7 CSL signifies H12 (loss/separation)")
    if 8 in sigs:
        risk_factors.append("H7 CSL signifies H8 (obstacles/transformation)")

    # Mars in 7th or 8th
    if "Mars" in chart["planets"]:
        mars_house = _get_planet_house(chart["planets"]["Mars"]["longitude"], chart["cusp_lons"])
        if mars_house in (7, 8):
            risk_factors.append(f"Mars in H{mars_house} (aggression in partnership)")

    # Saturn in 7th
    if "Saturn" in chart["planets"]:
        sat_house = _get_planet_house(chart["planets"]["Saturn"]["longitude"], chart["cusp_lons"])
        if sat_house == 7:
            risk_factors.append("Saturn in H7 (delays/coldness in marriage)")

    if len(risk_factors) >= 3:
        risk_level = "High"
    elif len(risk_factors) >= 2:
        risk_level = "Moderate"
    elif risk_factors:
        risk_level = "Low"
    else:
        risk_level = "Minimal"

    return {
        "risk_level": risk_level,
        "factors": risk_factors,
    }


def _ruling_planets(chart: dict) -> set:
    moon_info = get_nakshatra_and_starlord(chart["moon_lon"])
    lagna_info = get_nakshatra_and_starlord(chart["lagna_lon"])
    rps = {
        SIGN_LORDS.get(chart["moon_sign"], ""),
        moon_info.get("star_lord", ""),
        SIGN_LORDS.get(chart["lagna_sign"], ""),
        lagna_info.get("star_lord", ""),
    }
    rps.discard("")
    return rps


# ── Extended KP Marriage Analysis ────────────────────────────

def _venus_analysis(chart: dict) -> dict:
    """
    Analyze Venus as the primary marriage karaka (significator).
    Strong Venus = enhanced marriage promise. Weak Venus = caution.
    """
    if "Venus" not in chart["planets"]:
        return {"status": "Not found", "enhances_promise": False}

    venus_lon = chart["planets"]["Venus"]["longitude"]
    venus_house = _get_planet_house(venus_lon, chart["cusp_lons"])
    venus_sign = get_sign(venus_lon % 360)
    venus_sigs = _planet_significations("Venus", chart["planets"], chart["cusp_lons"])

    # Venus in H6, H8, H12 is afflicted (denial/loss houses)
    afflicted = venus_house in {6, 8, 12}

    # Venus signifying H7 = direct marriage indicator
    signifies_h7 = 7 in venus_sigs
    signifies_h11 = 11 in venus_sigs
    signifies_h2 = 2 in venus_sigs

    # Venus in Ruling Planets check (sign lord of Moon or Lagna)
    moon_sign_lord = SIGN_LORDS.get(chart["moon_sign"], "")
    lagna_sign_lord = SIGN_LORDS.get(chart["lagna_sign"], "")
    is_rp = "Venus" in {moon_sign_lord, lagna_sign_lord,
                        get_nakshatra_and_starlord(chart["moon_lon"]).get("star_lord", ""),
                        get_nakshatra_and_starlord(chart["lagna_lon"]).get("star_lord", "")}

    # Strength assessment
    if not afflicted and (signifies_h7 or signifies_h2 or signifies_h11) and is_rp:
        strength = "Strong"
        enhances = True
    elif not afflicted and (signifies_h7 or signifies_h11):
        strength = "Good"
        enhances = True
    elif afflicted:
        strength = "Afflicted"
        enhances = False
    else:
        strength = "Moderate"
        enhances = bool(venus_sigs & MARRIAGE_PROMISE_HOUSES)

    return {
        "house": venus_house,
        "sign": venus_sign,
        "significations": sorted(venus_sigs),
        "signifies_h7": signifies_h7,
        "is_ruling_planet": is_rp,
        "afflicted": afflicted,
        "strength": strength,
        "enhances_promise": enhances,
    }


def _supporting_cusps(chart: dict) -> dict:
    """
    Analyze H2 and H11 CSLs as supporting marriage gates.
    H2 CSL signifying H7/H11 → arrangements completed.
    H11 CSL signifying H7/H2 → fulfillment/fruit of marriage.
    """
    h2_csl, h2_sigs = _get_cusp_sub_lord_sigs(2, chart)
    h11_csl, h11_sigs = _get_cusp_sub_lord_sigs(11, chart)

    h2_supports = bool(h2_sigs & {7, 11})
    h11_supports = bool(h11_sigs & {2, 7})

    return {
        "h2_csl": h2_csl,
        "h2_sigs": sorted(h2_sigs),
        "h2_supports": h2_supports,
        "h11_csl": h11_csl,
        "h11_sigs": sorted(h11_sigs),
        "h11_supports": h11_supports,
        "both_support": h2_supports and h11_supports,
    }


def _dasha_overlap_check(chart1_data: dict, chart2_data: dict, chart1: dict, chart2: dict) -> dict:
    """
    Check if both persons' current dasha periods are favorable for marriage.
    Returns info on whether their active periods align for marriage timing.
    Note: chart1_data is the raw person dict, chart is the computed chart dict.
    """
    try:
        # We look at what's in workspace data (current dasha if available)
        # Since we only have natal data here, we compute a simple check:
        # Are the current dasha lords (if knowable) favorable?
        # Proxy: do the Ruling Planets of each chart share common significators?
        rp1 = _ruling_planets(chart1)
        rp2 = _ruling_planets(chart2)

        sigs1 = _marriage_significators(chart1)
        sigs2 = _marriage_significators(chart2)

        # Cross-resonance: how many shared significators appear in both RP sets?
        shared_sigs = sigs1 & sigs2
        common_rp = rp1 & rp2

        # Planets that are significators in both charts AND in both ruling planets
        strong_timing = shared_sigs & common_rp

        if strong_timing:
            timing_verdict = "Aligned"
            timing_note = f"Planets {sorted(strong_timing)} are marriage significators in BOTH charts AND Ruling Planets of both — strong timing alignment."
        elif shared_sigs:
            timing_verdict = "Partial"
            timing_note = f"Shared significators {sorted(shared_sigs)} exist but not confirmed by both RPs."
        elif common_rp:
            timing_verdict = "Partial"
            timing_note = f"Both charts share RPs {sorted(common_rp)} — timing may align but significators differ."
        else:
            timing_verdict = "Misaligned"
            timing_note = "No common significators or Ruling Planets — timing may not align currently."

        return {
            "timing_verdict": timing_verdict,
            "timing_note": timing_note,
            "shared_significators": sorted(shared_sigs),
            "common_ruling_planets": sorted(common_rp),
            "strong_timing_planets": sorted(strong_timing),
        }
    except Exception:
        return {"timing_verdict": "Unknown", "timing_note": "Could not compute timing alignment."}


# ── KP Compatibility ──────────────────────────────────────────

def _kp_compatibility(chart1: dict, chart2: dict) -> dict:
    promise1 = _h7_sublord_promise(chart1)
    promise2 = _h7_sublord_promise(chart2)

    # Venus karaka analysis for both charts
    venus1 = _venus_analysis(chart1)
    venus2 = _venus_analysis(chart2)

    # Supporting cusps (H2 CSL, H11 CSL) for both charts
    support1 = _supporting_cusps(chart1)
    support2 = _supporting_cusps(chart2)

    sigs1 = _marriage_significators(chart1)
    sigs2 = _marriage_significators(chart2)
    rp1 = _ruling_planets(chart1)
    rp2 = _ruling_planets(chart2)

    resonance_1to2 = sorted(sigs1 & rp2)
    resonance_2to1 = sorted(sigs2 & rp1)
    total_resonance = len(set(resonance_1to2) | set(resonance_2to1))

    # Critical Venus Override: if Venus is strong in a chart, it can elevate
    # a "Denied" promise to "Conditional" (KP rule: karaka strength overrides weak CSL)
    p1_effective = promise1["has_promise"]
    p2_effective = promise2["has_promise"]

    if promise1["has_denial"] and venus1["enhances_promise"]:
        p1_effective = True  # Venus karaka overrides denial → Conditional
        promise1 = dict(promise1)
        promise1["verdict"] = "Conditional (Venus overrides)"
        promise1["venus_override"] = True
    if promise2["has_denial"] and venus2["enhances_promise"]:
        p2_effective = True
        promise2 = dict(promise2)
        promise2["verdict"] = "Conditional (Venus overrides)"
        promise2["venus_override"] = True

    # H7 sign lord support adds another layer of confirmation
    h7_lord_both = promise1.get("h7_lord_supports", False) and promise2.get("h7_lord_supports", False)

    # Supporting cusps strengthen the verdict
    support_score = sum([
        1 if support1["h2_supports"] else 0,
        1 if support1["h11_supports"] else 0,
        1 if support2["h2_supports"] else 0,
        1 if support2["h11_supports"] else 0,
    ])

    # Verdict determination (enriched)
    if p1_effective and p2_effective and total_resonance >= 3 and support_score >= 2:
        verdict = "Strong Match"
    elif p1_effective and p2_effective and total_resonance >= 3:
        verdict = "Strong Match"
    elif p1_effective and p2_effective and total_resonance >= 1:
        verdict = "Good Match"
    elif (p1_effective or p2_effective) and total_resonance >= 1:
        verdict = "Fair Match"
    elif promise1["has_denial"] or promise2["has_denial"]:
        verdict = "Caution"
    else:
        verdict = "Conditional"

    return {
        "chart1_promise": promise1,
        "chart2_promise": promise2,
        "venus_chart1": venus1,
        "venus_chart2": venus2,
        "supporting_cusps_chart1": support1,
        "supporting_cusps_chart2": support2,
        "significators_chart1": sorted(sigs1),
        "significators_chart2": sorted(sigs2),
        "ruling_planets_chart1": sorted(rp1),
        "ruling_planets_chart2": sorted(rp2),
        "resonance_1_to_2": resonance_1to2,
        "resonance_2_to_1": resonance_2to1,
        "total_resonance_count": total_resonance,
        "h7_lord_both_support": h7_lord_both,
        "support_score": support_score,
        "kp_verdict": verdict,
    }


# ── Ashtakoota calculations ───────────────────────────────────

def _calc_varna(chart_boy: dict, chart_girl: dict) -> dict:
    boy_varna = SIGN_VARNA.get(chart_boy["moon_sign"], "Shudra")
    girl_varna = SIGN_VARNA.get(chart_girl["moon_sign"], "Shudra")
    score = 1 if VARNA_RANK.get(boy_varna, 1) >= VARNA_RANK.get(girl_varna, 1) else 0
    return {"kuta": "Varna", "max": 1, "score": score, "boy": boy_varna, "girl": girl_varna,
            "note": "Boy's varna must be equal or higher than girl's"}


def _calc_vasya(chart_boy: dict, chart_girl: dict) -> dict:
    bs = chart_boy["moon_sign"]
    gs = chart_girl["moon_sign"]
    boy_controls_girl = gs in VASYA_MAP.get(bs, [])
    girl_controls_boy = bs in VASYA_MAP.get(gs, [])
    if boy_controls_girl and girl_controls_boy:
        score = 2
        note = "Mutual vasya — excellent"
    elif boy_controls_girl or girl_controls_boy:
        score = 1
        note = "One-way vasya — good"
    else:
        score = 0
        note = "No vasya relationship"
    return {"kuta": "Vasya", "max": 2, "score": score, "boy_sign": bs, "girl_sign": gs, "note": note}


def _calc_tara(chart_boy: dict, chart_girl: dict) -> dict:
    naks = NAKSHATRA_ORDER
    girl_nak = chart_girl["moon_nakshatra"]
    boy_nak = chart_boy["moon_nakshatra"]
    if girl_nak in naks and boy_nak in naks:
        g_idx = naks.index(girl_nak)
        b_idx = naks.index(boy_nak)
        count_gb = ((b_idx - g_idx) % 27) + 1
        count_bg = ((g_idx - b_idx) % 27) + 1
        r_gb = count_gb % 9 or 9
        r_bg = count_bg % 9 or 9
        auspicious_gb = r_gb in {1, 3, 5, 7}
        auspicious_bg = r_bg in {1, 3, 5, 7}
        if auspicious_gb and auspicious_bg:
            score = 3
        elif auspicious_gb or auspicious_bg:
            score = 1.5
        else:
            score = 0
    else:
        score = 0
        auspicious_gb = auspicious_bg = False
    return {"kuta": "Tara", "max": 3, "score": score,
            "girl_nakshatra": girl_nak, "boy_nakshatra": boy_nak,
            "auspicious_girl_to_boy": auspicious_gb, "auspicious_boy_to_girl": auspicious_bg}


def _calc_yoni(chart_boy: dict, chart_girl: dict) -> dict:
    boy_nak = chart_boy["moon_nakshatra"]
    girl_nak = chart_girl["moon_nakshatra"]
    boy_yoni = NAKSHATRA_YONI.get(boy_nak, ("Unknown", "M"))
    girl_yoni = NAKSHATRA_YONI.get(girl_nak, ("Unknown", "F"))
    ba, bs_ = boy_yoni
    ga, gs_ = girl_yoni

    if ba == ga:
        score = 4 if (bs_ != gs_) else 3
        note = "Same yoni — excellent" if bs_ != gs_ else "Same yoni, same sex — good"
    elif frozenset([ba, ga]) in YONI_ENEMIES:
        score = 0
        note = f"Enemy yoni ({ba} vs {ga}) — incompatible"
    elif ba == "Mongoose" or ga == "Mongoose":
        score = 2
        note = "Mongoose yoni — neutral"
    else:
        score = 2
        note = "Compatible yoni"
    return {"kuta": "Yoni", "max": 4, "score": score,
            "boy_yoni": ba, "girl_yoni": ga, "note": note}


def _calc_graha_maitri(chart_boy: dict, chart_girl: dict) -> dict:
    bl = SIGN_LORDS.get(chart_boy["moon_sign"], "Mercury")
    gl = SIGN_LORDS.get(chart_girl["moon_sign"], "Mercury")
    if bl == gl:
        score = 5
        note = "Same sign lord — perfect mental harmony"
    elif bl in PLANET_FRIENDS.get(gl, {}).get("friends", set()) and gl in PLANET_FRIENDS.get(bl, {}).get("friends", set()):
        score = 5
        note = "Mutual friends — excellent"
    elif bl in PLANET_FRIENDS.get(gl, {}).get("friends", set()) or gl in PLANET_FRIENDS.get(bl, {}).get("friends", set()):
        score = 4
        note = "One-way friendship — good"
    elif bl in PLANET_FRIENDS.get(gl, {}).get("neutral", set()) and gl in PLANET_FRIENDS.get(bl, {}).get("neutral", set()):
        score = 3
        note = "Both neutral — average"
    elif bl in PLANET_FRIENDS.get(gl, {}).get("neutral", set()) or gl in PLANET_FRIENDS.get(bl, {}).get("neutral", set()):
        score = 1
        note = "One friendly, one enemy — below average"
    else:
        score = 0
        note = "Mutual enemies — poor mental compatibility"
    return {"kuta": "Graha Maitri", "max": 5, "score": score,
            "boy_lord": bl, "girl_lord": gl, "note": note}


def _calc_gana(chart_boy: dict, chart_girl: dict) -> dict:
    bg = NAKSHATRA_GANA.get(chart_boy["moon_nakshatra"], "Manushya")
    gg = NAKSHATRA_GANA.get(chart_girl["moon_nakshatra"], "Manushya")
    if bg == gg:
        score = 6
        note = f"Same gana ({bg}) — perfect"
    elif (bg == "Deva" and gg == "Manushya") or (bg == "Manushya" and gg == "Deva"):
        score = 5
        note = "Deva-Manushya — compatible"
    elif (bg == "Deva" and gg == "Rakshasa") or (bg == "Rakshasa" and gg == "Deva"):
        score = 1
        note = "Gana dosha — Deva-Rakshasa mismatch"
    else:
        score = 0
        note = "Gana dosha — Manushya-Rakshasa incompatible"
    return {"kuta": "Gana", "max": 6, "score": score,
            "boy_gana": bg, "girl_gana": gg, "note": note,
            "has_dosha": score <= 1}


def _calc_bhakoota(chart_boy: dict, chart_girl: dict) -> dict:
    bs = chart_boy["moon_sign"]
    gs = chart_girl["moon_sign"]
    signs = SIGNS_ORDER
    if bs in signs and gs in signs:
        b_idx = signs.index(bs)
        g_idx = signs.index(gs)
        count_bg = ((b_idx - g_idx) % 12) + 1
        count_gb = ((g_idx - b_idx) % 12) + 1
        dosha_pairs = [{2, 12}, {6, 8}, {5, 9}]
        rel = frozenset([count_bg, count_gb])
        has_dosha = any(rel == pair for pair in dosha_pairs)
        if has_dosha:
            score = 0
            if rel == frozenset([6, 8]) or {6, 8} == rel:
                note = "Shadashtak (6-8) dosha — very serious"
            elif rel == frozenset([2, 12]):
                note = "2-12 dosha — financial and separation concerns"
            else:
                note = "5-9 dosha — child-related concerns"
        else:
            score = 7
            note = f"No Bhakoota dosha — {count_bg}-{count_gb} relationship"
    else:
        score = 7
        has_dosha = False
        note = "Could not calculate"
    return {"kuta": "Bhakoota", "max": 7, "score": score,
            "boy_sign": bs, "girl_sign": gs, "has_dosha": has_dosha, "note": note}


def _calc_nadi(chart_boy: dict, chart_girl: dict) -> dict:
    bn = NAKSHATRA_NADI.get(chart_boy["moon_nakshatra"], "")
    gn = NAKSHATRA_NADI.get(chart_girl["moon_nakshatra"], "")
    if not bn or not gn:
        score = 8
        has_dosha = False
        note = "Could not calculate"
    elif bn == gn:
        score = 0
        has_dosha = True
        note = f"Nadi dosha — both {bn} nadi. Serious health/progeny concern."
    else:
        score = 8
        has_dosha = False
        note = f"{bn} + {gn} nadi — excellent compatibility"
    return {"kuta": "Nadi", "max": 8, "score": score,
            "boy_nadi": bn, "girl_nadi": gn, "has_dosha": has_dosha, "note": note}


def _ashtakoota(chart_boy: dict, chart_girl: dict) -> dict:
    kutas = [
        _calc_varna(chart_boy, chart_girl),
        _calc_vasya(chart_boy, chart_girl),
        _calc_tara(chart_boy, chart_girl),
        _calc_yoni(chart_boy, chart_girl),
        _calc_graha_maitri(chart_boy, chart_girl),
        _calc_gana(chart_boy, chart_girl),
        _calc_bhakoota(chart_boy, chart_girl),
        _calc_nadi(chart_boy, chart_girl),
    ]
    total = sum(k["score"] for k in kutas)
    max_total = sum(k["max"] for k in kutas)
    percentage = round(total / max_total * 100, 1)

    if total >= 28:
        verdict = "Excellent"
    elif total >= 21:
        verdict = "Good"
    elif total >= 18:
        verdict = "Average"
    else:
        verdict = "Below Average"

    critical_doshas = [k for k in kutas if k.get("has_dosha")]

    return {
        "kutas": kutas,
        "total_score": total,
        "max_score": max_total,
        "percentage": percentage,
        "verdict": verdict,
        "critical_doshas": [k["kuta"] for k in critical_doshas],
    }


# ── Kuja Dosha ────────────────────────────────────────────────

def _check_kuja_dosha(chart: dict) -> dict:
    if "Mars" not in chart["planets"]:
        return {"has_dosha": False, "mars_house": None, "note": "Mars not found"}

    mars_lon = chart["planets"]["Mars"]["longitude"]
    mars_house = _get_planet_house(mars_lon, chart["cusp_lons"])
    has_dosha = mars_house in KUJA_HOUSES

    # Check cancellations
    mars_sign = get_sign(mars_lon % 360)
    cancellations = []
    if mars_sign in ("Aries", "Scorpio"):
        cancellations.append("Mars in own sign")
    if mars_sign == "Capricorn":
        cancellations.append("Mars exalted")
    if mars_sign in ("Aquarius", "Cancer"):
        cancellations.append("Mars in friendly sign — reduced dosha")

    # Jupiter aspect
    if "Jupiter" in chart["planets"]:
        jup_house = _get_planet_house(chart["planets"]["Jupiter"]["longitude"], chart["cusp_lons"])
        if jup_house == mars_house or abs(jup_house - mars_house) in (3, 6, 9):
            cancellations.append("Jupiter influences Mars — reduced dosha")

    severity = "Severe" if mars_house in {7, 8} else "Moderate" if mars_house in {1, 12} else "Mild"
    is_cancelled = len(cancellations) > 0

    return {
        "has_dosha": has_dosha and not is_cancelled,
        "has_dosha_raw": has_dosha,
        "mars_house": mars_house,
        "mars_sign": mars_sign,
        "severity": severity if has_dosha else None,
        "cancellations": cancellations,
        "note": (f"Mars in H{mars_house} — Kuja dosha" + (f" (cancelled: {', '.join(cancellations)})" if cancellations else "")) if has_dosha else f"No Kuja dosha (Mars in H{mars_house})",
    }


# ── Public API ────────────────────────────────────────────────

def compute_compatibility(person1: dict, person2: dict) -> dict:
    """
    Main function: compute full KP + Ashtakoota + Dosha compatibility.
    person1/person2 must have: name, date, time, latitude, longitude, timezone_offset, gender
    """
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)

    chart1 = _build_chart(person1)
    chart2 = _build_chart(person2)

    # Generate full charts for frontend kundali rendering
    full_chart1 = generate_chart(
        person1["date"], person1["time"],
        person1["latitude"], person1["longitude"],
        person1.get("timezone_offset", 5.5),
    )
    full_chart2 = generate_chart(
        person2["date"], person2["time"],
        person2["latitude"], person2["longitude"],
        person2.get("timezone_offset", 5.5),
    )
    chart1_frontend = format_chart_for_frontend(full_chart1)
    chart2_frontend = format_chart_for_frontend(full_chart2)

    # Determine boy/girl for gender-sensitive doshas
    gender1 = person1.get("gender", "")
    gender2 = person2.get("gender", "")

    if gender1 == "male" and gender2 == "female":
        chart_boy, chart_girl = chart1, chart2
        name_boy, name_girl = person1["name"], person2["name"]
    elif gender1 == "female" and gender2 == "male":
        chart_boy, chart_girl = chart2, chart1
        name_boy, name_girl = person2["name"], person1["name"]
    else:
        # Fallback: treat person1 as boy, person2 as girl
        chart_boy, chart_girl = chart1, chart2
        name_boy, name_girl = person1["name"], person2["name"]

    kp = _kp_compatibility(chart1, chart2)
    timing = _dasha_overlap_check(person1, person2, chart1, chart2)
    ashtakoota = _ashtakoota(chart_boy, chart_girl)
    dosha_p1 = _check_kuja_dosha(chart1)
    dosha_p2 = _check_kuja_dosha(chart2)

    # New: D9 Navamsa for both charts
    d9_chart1 = _compute_d9(chart1)
    d9_chart2 = _compute_d9(chart2)

    # New: Detailed significator hierarchy (4-level)
    sigs_detailed1 = _marriage_significators_detailed(chart1)
    sigs_detailed2 = _marriage_significators_detailed(chart2)

    # New: Current DBA for each person
    dba_chart1 = _current_dba(person1, chart1)
    dba_chart2 = _current_dba(person2, chart2)

    # New: 5th CSL analysis (love/romance)
    h5_chart1 = _h5_sublord_analysis(chart1)
    h5_chart2 = _h5_sublord_analysis(chart2)

    # New: Separation/divorce risk
    sep_risk1 = _separation_risk(chart1)
    sep_risk2 = _separation_risk(chart2)

    # Kuja dosha mutual cancellation
    kuja_both = dosha_p1["has_dosha_raw"] and dosha_p2["has_dosha_raw"]
    if kuja_both:
        dosha_p1["has_dosha"] = False
        dosha_p1["cancellations"].append("Both partners have Kuja dosha — cancelled")
        dosha_p2["has_dosha"] = False
        dosha_p2["cancellations"].append("Both partners have Kuja dosha — cancelled")

    # Overall verdict
    kp_score = {"Strong Match": 3, "Good Match": 2, "Fair Match": 1, "Conditional": 1, "Caution": 0}.get(kp["kp_verdict"], 1)
    ast_score = 2 if ashtakoota["total_score"] >= 25 else 1 if ashtakoota["total_score"] >= 18 else 0
    dosha_penalty = sum([
        1 if dosha_p1["has_dosha"] else 0,
        1 if dosha_p2["has_dosha"] else 0,
        1 if "Nadi" in ashtakoota["critical_doshas"] else 0,
    ])
    combined = kp_score + ast_score - dosha_penalty

    if combined >= 4:
        overall = "Highly Compatible"
    elif combined >= 2:
        overall = "Compatible"
    elif combined >= 1:
        overall = "Conditionally Compatible"
    else:
        overall = "Needs Careful Consideration"

    return {
        "person1": {"name": person1["name"], "gender": gender1,
                    "moon_sign": chart1["moon_sign"], "moon_nakshatra": chart1["moon_nakshatra"], "lagna": chart1["lagna_sign"]},
        "person2": {"name": person2["name"], "gender": gender2,
                    "moon_sign": chart2["moon_sign"], "moon_nakshatra": chart2["moon_nakshatra"], "lagna": chart2["lagna_sign"]},
        "boy_girl": {"boy": name_boy, "girl": name_girl},
        "kp_analysis": kp,
        "timing_analysis": timing,
        "ashtakoota": ashtakoota,
        "kuja_dosha": {
            "person1": {"name": person1["name"], **dosha_p1},
            "person2": {"name": person2["name"], **dosha_p2},
            "mutual_cancellation": kuja_both,
        },
        # New fields
        "d9_chart1": d9_chart1,
        "d9_chart2": d9_chart2,
        "significators_detailed_chart1": sigs_detailed1,
        "significators_detailed_chart2": sigs_detailed2,
        "dba_chart1": dba_chart1,
        "dba_chart2": dba_chart2,
        "h5_analysis_chart1": h5_chart1,
        "h5_analysis_chart2": h5_chart2,
        "separation_risk_chart1": sep_risk1,
        "separation_risk_chart2": sep_risk2,
        "chart1_data": chart1_frontend,
        "chart2_data": chart2_frontend,
        "overall_verdict": overall,
        "summary": {
            "kp_verdict": kp["kp_verdict"],
            "ashtakoota_score": f"{ashtakoota['total_score']}/{ashtakoota['max_score']}",
            "ashtakoota_verdict": ashtakoota["verdict"],
            "critical_doshas": ashtakoota["critical_doshas"],
            "kuja_concern": dosha_p1["has_dosha"] or dosha_p2["has_dosha"],
        },
    }

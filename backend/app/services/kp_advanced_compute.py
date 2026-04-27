"""
PR A1.3c — Advanced KP compute layer.

Surfaces structured fields the LLM needs for KSK-grade analysis:

- A/B/C/D significator labels per house (per KSK Reader V hierarchy)
- Fruitful significators (significator ∩ Ruling Planets — strongest timing trigger)
- Self-strength flag per planet (in own star = pure result)
- Cusp sign type (movable/fixed/dual + fruitful/barren — for KSK overlay rules)
- Star-Sub Harmony score per CSL (the core KSK insight — see RULE 16 in system prompt)
- RP overlap count per upcoming Antardasha lord (timing ripeness)
- Per-topic confidence score 0-100 (synthesised from the above signals)

Pure Python; depends only on chart_engine helpers.
"""

from typing import Dict, List, Optional, Tuple

from app.services.chart_engine import (
    get_sign_lord_for_house,
    get_houses_owned_by_planet,
    get_rahu_ketu_significations,
    HOUSE_TOPICS,
    NAKSHATRAS,
    SIGN_LORDS,
)


# ── Pada (1/2/3/4) of nakshatra (PR fix-6, #1) ──────────────────────

def get_pada(longitude: float) -> Dict[str, object]:
    """
    Each nakshatra spans 13°20' = 4 padas of 3°20' each. Returns pada
    number (1..4) plus the navamsa sign that pada falls in.

    Navamsa (D9) sign of a pada: each pada = 1 navamsa = 3°20'. The 12-
    sign zodiac × 9 navamsas per sign = 108 navamsas. The pada's
    navamsa sign is derived from longitude / 3°20'.
    """
    lon = longitude % 360
    nakshatra_index = int(lon / (360 / 27))
    pos_in_nak = lon - (nakshatra_index * (360 / 27))
    pada_num = int(pos_in_nak / (360 / 108)) + 1
    if pada_num > 4:
        pada_num = 4
    # Navamsa sign of this pada
    navamsa_index = int(lon / (360 / 108)) % 12
    nav_sign_names = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
    ]
    return {
        "pada": pada_num,
        "navamsa_sign": nav_sign_names[navamsa_index],
        "navamsa_index": navamsa_index,
    }


# ── Combustion detection (PR fix-6, #5) ─────────────────────────────

# KP-style combustion thresholds in degrees (prograde / retrograde).
# Sun and nodes never combust.
COMBUSTION_THRESHOLDS_DEG = {
    "Mercury": (14.0, 12.0),
    "Venus":   (10.0,  8.0),
    "Mars":    (17.0, 17.0),
    "Jupiter": (11.0, 11.0),
    "Saturn":  (15.0, 15.0),
    "Moon":    (12.0, 12.0),  # Moon is "amavasya-hidden" near Sun
}


def angular_distance_deg(lon_a: float, lon_b: float) -> float:
    """Shortest arc between two longitudes (0..180)."""
    diff = abs((lon_a - lon_b) % 360.0)
    return min(diff, 360.0 - diff)


def detect_combustion(planets: dict) -> Dict[str, Dict[str, object]]:
    """Return {planet: {is_combust, distance_from_sun_deg, threshold}} for planets near the Sun."""
    sun = planets.get("Sun") or {}
    sun_lon = sun.get("longitude")
    out: Dict[str, Dict[str, object]] = {}
    if sun_lon is None:
        return out
    for pname, thresholds in COMBUSTION_THRESHOLDS_DEG.items():
        p = planets.get(pname)
        if not p:
            continue
        dist = angular_distance_deg(p.get("longitude", 0), sun_lon)
        threshold = thresholds[0]  # use prograde threshold; we don't track retrograde
        out[pname] = {
            "distance_from_sun_deg": round(dist, 2),
            "threshold_deg":         threshold,
            "is_combust":            dist < threshold,
            "borderline":            (threshold - 2.0) < dist < (threshold + 2.0),
        }
    return out


# ── Conjunction orbs (PR fix-6, #7) ─────────────────────────────────

CONJUNCTION_ORB_DEG = 8.0  # KP standard


def detect_conjunctions(planets: dict) -> List[Dict[str, object]]:
    """
    Return list of planet pairs with separation < CONJUNCTION_ORB_DEG.
    KP differentiates "same house" from "tight conjunction" — only the
    latter has dynamic effect on each other.
    """
    names = list(planets.keys())
    out: List[Dict[str, object]] = []
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            a, b = names[i], names[j]
            la = planets[a].get("longitude")
            lb = planets[b].get("longitude")
            if la is None or lb is None:
                continue
            dist = angular_distance_deg(la, lb)
            if dist < CONJUNCTION_ORB_DEG:
                out.append({
                    "planet_a":   a,
                    "planet_b":   b,
                    "orb_deg":    round(dist, 2),
                    "tightness":  "tight" if dist < 3.0 else ("close" if dist < 5.0 else "wide"),
                })
    out.sort(key=lambda x: x["orb_deg"])
    return out


# ── Planetary aspects (PR fix-6, #4) ────────────────────────────────

# Vedic aspects from a planet's house position (1..12). Result: list of
# houses aspected. Returns the receiving house numbers, NOT directions.
ASPECT_OFFSETS = {
    "Sun":     [7],
    "Moon":    [7],
    "Mercury": [7],
    "Venus":   [7],
    "Mars":    [4, 7, 8],
    "Jupiter": [5, 7, 9],
    "Saturn":  [3, 7, 10],
    "Rahu":    [5, 7, 9],
    "Ketu":    [5, 7, 9],
}


def compute_aspects(planet_positions: dict) -> Dict[str, Dict[str, object]]:
    """
    For each planet, return:
        from_house:  the planet's house position
        aspects:     list of house numbers it aspects (1..12)
    Aspects in KP/Vedic count from the planet's own house. The 7th
    aspect is universal (opposition).
    """
    out: Dict[str, Dict[str, object]] = {}
    for pname, house in planet_positions.items():
        if not house or house < 1 or house > 12:
            continue
        offsets = ASPECT_OFFSETS.get(pname, [7])
        aspected = sorted(set(((house - 1 + (off - 1)) % 12) + 1 for off in offsets))
        out[pname] = {
            "from_house": house,
            "aspects":    aspected,
        }
    return out


def aspects_received_by_house(
    aspects_by_planet: Dict[str, Dict[str, object]],
) -> Dict[int, List[str]]:
    """Inverse map: which planets aspect each house?"""
    out: Dict[int, List[str]] = {h: [] for h in range(1, 13)}
    for pname, info in aspects_by_planet.items():
        for h in info.get("aspects", []) or []:
            if isinstance(h, int) and 1 <= h <= 12:
                out[h].append(pname)
    return out


# ── 8th lord disposition (PR fix-6, #17) ────────────────────────────

def compute_8th_lord_disposition(
    planets: dict,
    cusps: dict,
    planet_positions: dict,
) -> Dict[str, object]:
    """
    Detailed analysis of the 8th lord's placement, used for longevity,
    sexual function, transformation, and chronic-health predictions.
    """
    h8_lord = get_sign_lord_for_house(8, cusps) if cusps else None
    if not h8_lord or h8_lord not in planets:
        return {"h8_lord": h8_lord, "available": False}

    p = planets[h8_lord]
    house = planet_positions.get(h8_lord, 0)
    star_lord = p.get("star_lord")
    sub_lord = p.get("sub_lord")

    # Houses signified
    signified = set()
    if house:
        signified.add(house)
    signified.update(get_houses_owned_by_planet(h8_lord, cusps))
    if star_lord and star_lord in planet_positions:
        signified.add(planet_positions[star_lord])
    if star_lord:
        signified.update(get_houses_owned_by_planet(star_lord, cusps))

    # Health/sexuality interpretation tags
    tags: List[str] = []
    if house in (6, 8, 12):
        tags.append("8L in dussthana — chronic health risk / hidden challenges in sexuality/longevity area")
    if house == 8:
        tags.append("8L in own house — strong longevity, but introspective sexual life")
    if house in (1, 5, 9, 11):
        tags.append("8L in trine/upachaya — favourable; sexual + transformation themes well-integrated")
    if star_lord in ("Saturn",):
        tags.append("8L in Saturn's star — slow/restrained sexual function, late maturation")
    if star_lord in ("Mars",):
        tags.append("8L in Mars's star — intense / passionate sexual energy")
    if star_lord in ("Venus",):
        tags.append("8L in Venus's star — pleasure-oriented, romantic sexual life")
    if star_lord in ("Ketu",):
        tags.append("8L in Ketu's star — periodic detachment / spiritual orientation in sexuality")

    return {
        "available":   True,
        "h8_lord":     h8_lord,
        "house":       house,
        "sign":        p.get("sign"),
        "star_lord":   star_lord,
        "sub_lord":    sub_lord,
        "signified_houses": sorted(signified),
        "tags":        tags,
    }


# ── Partner profile (PR fix-6, #22) ─────────────────────────────────

# Nakshatra direction table (KSK / classical)
# Each nakshatra has a primary direction associated with the partner's origin.
NAKSHATRA_DIRECTION = {
    "Ashwini": "East", "Bharani": "East", "Krittika": "South-East",
    "Rohini": "East", "Mrigashira": "South-West", "Ardra": "West",
    "Punarvasu": "North-East", "Pushya": "North", "Ashlesha": "North-East",
    "Magha": "South", "Purva Phalguni": "South-East", "Uttara Phalguni": "South",
    "Hasta": "West", "Chitra": "South-West", "Swati": "West",
    "Vishakha": "North", "Anuradha": "North-West", "Jyeshtha": "North-East",
    "Mula": "South-West", "Purva Ashadha": "South", "Uttara Ashadha": "South-East",
    "Shravana": "North", "Dhanishta": "East", "Shatabhisha": "North-West",
    "Purva Bhadrapada": "West", "Uttara Bhadrapada": "North", "Revati": "East",
}


def compute_partner_profile(
    planets: dict,
    cusps: dict,
    planet_positions: dict,
) -> Dict[str, object]:
    """
    Aggregate everything the chart says about the spouse:
    direction, age relation, profession lean, language indication,
    appearance, temperament. Pure compute — LLM still narrates.
    """
    if not cusps or "House_7" not in cusps:
        return {"available": False}

    h7 = cusps["House_7"]
    h7_sign = h7.get("sign")
    h7_nakshatra = h7.get("nakshatra")
    h7_star_lord = h7.get("star_lord")
    h7_sub_lord = h7.get("sub_lord")

    # Direction from nakshatra
    direction = NAKSHATRA_DIRECTION.get(h7_nakshatra or "", "Unknown")

    # H7 sign body type
    sign_body_type = {
        "Aries":     "athletic, sharp features, possible scar/mark on head",
        "Taurus":    "sturdy/full figure, beautiful eyes, food/music inclined, fair-medium complexion",
        "Gemini":    "tall/slim, articulate, communicative, dual-natured personality",
        "Cancer":    "rounded face, emotional, family-oriented, fair complexion",
        "Leo":       "regal bearing, prominent forehead, leadership presence, warm complexion",
        "Virgo":     "slim/lean, neat/well-groomed, analytical sharp features, fair complexion",
        "Libra":     "graceful, balanced features, aesthetic sense, fair-pleasant",
        "Scorpio":   "intense gaze, magnetic, secretive, medium complexion",
        "Sagittarius": "tall, philosophical, cheerful, warm/healthy build",
        "Capricorn": "serious bearing, mature, disciplined, slim-medium build",
        "Aquarius":  "unconventional looks, idealistic, modern, varied build",
        "Pisces":    "soft/dreamy features, emotional, artistic, fair complexion",
    }.get(h7_sign or "", "")

    # H7 sign movability for marriage stability
    sign_stability = "fixed/stable" if h7_sign in ("Taurus", "Leo", "Scorpio", "Aquarius") else (
        "movable/changeable" if h7_sign in ("Aries", "Cancer", "Libra", "Capricorn") else
        "dual/multi-phase" if h7_sign else ""
    )

    # Venus state — partner-quality context
    venus = planets.get("Venus", {})
    venus_house = planet_positions.get("Venus", 0)
    venus_sign = venus.get("sign")

    # Career field of partner from Venus + H10 connections
    venus_field_hints: List[str] = []
    if venus_house in (10, 6):
        venus_field_hints.append("career-driven; works in similar professional field as native")
    if venus_house in (4, 5):
        venus_field_hints.append("home/teaching/creative-arts focus possible")
    if venus_house in (2, 11):
        venus_field_hints.append("finance/business/family-enterprise context")
    if venus.get("sign") in ("Virgo", "Gemini"):
        venus_field_hints.append("analytical/communication/tech background")
    if venus.get("sign") in ("Taurus", "Libra"):
        venus_field_hints.append("aesthetic/financial/banking background")

    # Venus debilitation context (NOT a verdict, just context)
    venus_debilitated = (venus_sign == "Virgo")
    venus_exalted     = (venus_sign == "Pisces")

    # H7 sub-lord chain origin signal
    origin_hints: List[str] = []
    if h7_sub_lord:
        sl = planets.get(h7_sub_lord, {})
        sl_star = sl.get("star_lord")
        if sl_star:
            sl_star_house = planet_positions.get(sl_star, 0)
            if sl_star_house in (4,):
                origin_hints.append("H4 thread — same regional origin possible")
            if sl_star_house in (9, 12):
                origin_hints.append("H9/H12 thread — different region / foreign origin possible")

    # Age relation hint (Saturn proximity to Venus)
    age_hint = ""
    if venus.get("sub_lord") == "Saturn":
        age_hint = "partner may be slightly older or Saturn-mature in temperament"
    elif venus.get("sub_lord") == "Mercury":
        age_hint = "partner same age or slightly younger, intellectually compatible"

    return {
        "available":         True,
        "h7_sign":           h7_sign,
        "h7_nakshatra":      h7_nakshatra,
        "h7_star_lord":      h7_star_lord,
        "h7_sub_lord":       h7_sub_lord,
        "direction":         direction,
        "appearance_temperament": sign_body_type,
        "sign_stability":    sign_stability,
        "venus_house":       venus_house,
        "venus_sign":        venus_sign,
        "venus_debilitated": venus_debilitated,
        "venus_exalted":     venus_exalted,
        "field_hints":       venus_field_hints,
        "origin_hints":      origin_hints,
        "age_hint":          age_hint,
    }


# ── Ashtakavarga (Sarvashtakavarga totals per house) (PR fix-6, #14) ──

# Bindu contribution rules per planet (Sun, Moon, Mars, Mercury, Jupiter,
# Venus, Saturn) from each contributor (Sun, Moon, Mars, Mercury, Jupiter,
# Venus, Saturn, Lagna). The classical tables. Each entry: list of house
# numbers (1..12) where the contributor gives a bindu to the planet.
# These are STANDARD Parashari Ashtakavarga tables — used widely in KP
# practice as a strength-confirmation signal.

# Sun's bindus from each contributor (which houses get a bindu in Sun's BAV)
_SUN_BAV = {
    "Sun":     [1, 2, 4, 7, 8, 9, 10, 11],
    "Moon":    [3, 6, 10, 11],
    "Mars":    [1, 2, 4, 7, 8, 9, 10, 11],
    "Mercury": [3, 5, 6, 9, 10, 11, 12],
    "Jupiter": [5, 6, 9, 11],
    "Venus":   [6, 7, 12],
    "Saturn":  [1, 2, 4, 7, 8, 9, 10, 11],
    "Lagna":   [3, 4, 6, 10, 11, 12],
}
_MOON_BAV = {
    "Sun":     [3, 6, 7, 8, 10, 11],
    "Moon":    [1, 3, 6, 7, 10, 11],
    "Mars":    [2, 3, 5, 6, 9, 10, 11],
    "Mercury": [1, 3, 4, 5, 7, 8, 10, 11],
    "Jupiter": [1, 4, 7, 8, 10, 11, 12],
    "Venus":   [3, 4, 5, 7, 9, 10, 11],
    "Saturn":  [3, 5, 6, 11],
    "Lagna":   [3, 6, 10, 11],
}
_MARS_BAV = {
    "Sun":     [3, 5, 6, 10, 11],
    "Moon":    [3, 6, 11],
    "Mars":    [1, 2, 4, 7, 8, 10, 11],
    "Mercury": [3, 5, 6, 11],
    "Jupiter": [6, 10, 11, 12],
    "Venus":   [6, 8, 11, 12],
    "Saturn":  [1, 4, 7, 8, 9, 10, 11],
    "Lagna":   [1, 3, 6, 10, 11],
}
_MERCURY_BAV = {
    "Sun":     [5, 6, 9, 11, 12],
    "Moon":    [2, 4, 6, 8, 10, 11],
    "Mars":    [1, 2, 4, 7, 8, 9, 10, 11],
    "Mercury": [1, 3, 5, 6, 9, 10, 11, 12],
    "Jupiter": [6, 8, 11, 12],
    "Venus":   [1, 2, 3, 4, 5, 8, 9, 11],
    "Saturn":  [1, 2, 4, 7, 8, 9, 10, 11],
    "Lagna":   [1, 2, 4, 6, 8, 10, 11],
}
_JUPITER_BAV = {
    "Sun":     [1, 2, 3, 4, 7, 8, 9, 10, 11],
    "Moon":    [2, 5, 7, 9, 11],
    "Mars":    [1, 2, 4, 7, 8, 10, 11],
    "Mercury": [1, 2, 4, 5, 6, 9, 10, 11],
    "Jupiter": [1, 2, 3, 4, 7, 8, 10, 11],
    "Venus":   [2, 5, 6, 9, 10, 11],
    "Saturn":  [3, 5, 6, 12],
    "Lagna":   [1, 2, 4, 5, 6, 7, 9, 10, 11],
}
_VENUS_BAV = {
    "Sun":     [8, 11, 12],
    "Moon":    [1, 2, 3, 4, 5, 8, 9, 11, 12],
    "Mars":    [3, 5, 6, 9, 11, 12],
    "Mercury": [3, 5, 6, 9, 11],
    "Jupiter": [5, 8, 9, 10, 11],
    "Venus":   [1, 2, 3, 4, 5, 8, 9, 10, 11],
    "Saturn":  [3, 4, 5, 8, 9, 10, 11],
    "Lagna":   [1, 2, 3, 4, 5, 8, 9, 11],
}
_SATURN_BAV = {
    "Sun":     [1, 2, 4, 7, 8, 9, 10, 11],
    "Moon":    [3, 6, 11],
    "Mars":    [3, 5, 6, 10, 11, 12],
    "Mercury": [6, 8, 9, 10, 11, 12],
    "Jupiter": [5, 6, 11, 12],
    "Venus":   [6, 11, 12],
    "Saturn":  [3, 5, 6, 11],
    "Lagna":   [1, 3, 4, 6, 10, 11],
}

_BAV_TABLES = {
    "Sun":     _SUN_BAV,
    "Moon":    _MOON_BAV,
    "Mars":    _MARS_BAV,
    "Mercury": _MERCURY_BAV,
    "Jupiter": _JUPITER_BAV,
    "Venus":   _VENUS_BAV,
    "Saturn":  _SATURN_BAV,
}


# ── Gandanta detection (PR fix-7, #2) ───────────────────────────────
# Gandanta = "knot junctions" — last 3°20' of water signs (Cancer,
# Scorpio, Pisces) + first 3°20' of fire signs (Aries, Leo, Sagittarius).
# Lagna or Moon in gandanta = transformation/anxiety zones.

def is_in_gandanta(longitude: float) -> Dict[str, object]:
    """
    Returns:
        in_gandanta: bool
        zone: which junction (e.g., "Cancer-Leo", "Scorpio-Sagittarius",
              "Pisces-Aries") or "" if not in gandanta
        side: "ending water sign" | "beginning fire sign" | ""
    """
    lon = longitude % 360
    # Junctions: Cancer-Leo (90-120), Scorpio-Sag (210-240), Pisces-Aries (330-360+0)
    junctions = [
        (86.667, 90.0,  "Cancer-Leo",      "ending water sign"),
        (90.0,   93.333,"Cancer-Leo",      "beginning fire sign"),
        (206.667,210.0, "Scorpio-Sagittarius", "ending water sign"),
        (210.0,  213.333,"Scorpio-Sagittarius","beginning fire sign"),
        (326.667,330.0, "Pisces-Aries",    "ending water sign"),
        (0.0,    3.333, "Pisces-Aries",    "beginning fire sign"),
    ]
    for start, end, zone, side in junctions:
        if start <= lon < end:
            return {"in_gandanta": True, "zone": zone, "side": side}
    return {"in_gandanta": False, "zone": "", "side": ""}


# ── Nakshatra classification (PR fix-7, #3) ─────────────────────────
# KSK + classical: each of 27 nakshatras has a "nature" that affects
# what types of actions fire well during that nakshatra's moon-transit
# (or when chart's lagna/moon falls in it).

NAKSHATRA_NATURE = {
    # Mridu (mild/soft) — friendly, romantic, social events
    "Mrigashira": "Mridu", "Chitra": "Mridu", "Anuradha": "Mridu", "Revati": "Mridu",
    # Tikshna (sharp/severe) — surgeries, sharp decisions, breakups, military
    "Ardra": "Tikshna", "Ashlesha": "Tikshna", "Jyeshtha": "Tikshna", "Mula": "Tikshna",
    # Sthira (fixed/stable) — long-term commitments, foundations, marriage
    "Rohini": "Sthira", "Uttara Phalguni": "Sthira", "Uttara Ashadha": "Sthira", "Uttara Bhadrapada": "Sthira",
    # Chara (movable) — travel, change of place, transit
    "Punarvasu": "Chara", "Swati": "Chara", "Shravana": "Chara", "Dhanishta": "Chara", "Shatabhisha": "Chara",
    # Ugra (fierce/cruel) — disputes, debt collection, demolition
    "Bharani": "Ugra", "Magha": "Ugra", "Purva Phalguni": "Ugra", "Purva Ashadha": "Ugra", "Purva Bhadrapada": "Ugra",
    # Kshipra/Laghu (light/swift) — short tasks, sales, learning
    "Ashwini": "Laghu", "Pushya": "Laghu", "Hasta": "Laghu",
    # Mishra (mixed) — both benefic + malefic; ritual + healing
    "Krittika": "Mishra", "Vishakha": "Mishra",
}


def classify_nakshatra(nakshatra_name: str) -> Dict[str, str]:
    """Return nature classification + interpretive note for KSK timing application."""
    nature = NAKSHATRA_NATURE.get(nakshatra_name, "Unknown")
    notes = {
        "Mridu":   "Soft/mild — friendly, romantic, social events fire well",
        "Tikshna": "Sharp/severe — surgery, breakups, sharp decisions; avoid for soft matters",
        "Sthira":  "Fixed/stable — foundations, marriage, long-term commitments fire well",
        "Chara":   "Movable — travel, relocation, transit events fire well",
        "Ugra":    "Fierce — disputes, debt collection, demolition; avoid for harmony matters",
        "Laghu":   "Light/swift — short tasks, sales, learning; avoid for long-term commitments",
        "Mishra":  "Mixed — ritual + healing; both benefic and malefic strands",
    }
    return {"nature": nature, "note": notes.get(nature, "")}


# ── Classical exaltation / debilitation tags (PR fix-7, #8) ────────
# KSK rejects exalt/debil as primary verdict (RULE 15) but acknowledges
# them as CONTEXT for quality-of-result.

EXALT_SIGN = {
    "Sun": "Aries", "Moon": "Taurus", "Mars": "Capricorn",
    "Mercury": "Virgo", "Jupiter": "Cancer", "Venus": "Pisces",
    "Saturn": "Libra", "Rahu": "Taurus", "Ketu": "Scorpio",
}
DEBIL_SIGN = {
    "Sun": "Libra", "Moon": "Scorpio", "Mars": "Cancer",
    "Mercury": "Pisces", "Jupiter": "Capricorn", "Venus": "Virgo",
    "Saturn": "Aries", "Rahu": "Scorpio", "Ketu": "Taurus",
}
OWN_SIGNS = {
    "Sun": ["Leo"], "Moon": ["Cancer"],
    "Mars": ["Aries", "Scorpio"], "Mercury": ["Gemini", "Virgo"],
    "Jupiter": ["Sagittarius", "Pisces"], "Venus": ["Taurus", "Libra"],
    "Saturn": ["Capricorn", "Aquarius"],
}


def get_dignity(planets: dict) -> Dict[str, Dict[str, object]]:
    """For each planet: exalt/debil/own/neutral classification (CONTEXT only — RULE 12)."""
    out: Dict[str, Dict[str, object]] = {}
    for pname, p in planets.items():
        sign = p.get("sign", "")
        if sign == EXALT_SIGN.get(pname):
            tag = "exalted"
            note = f"{pname} in own exaltation sign — quality CONTEXT (not verdict)"
        elif sign == DEBIL_SIGN.get(pname):
            tag = "debilitated"
            note = f"{pname} in debilitation sign — quality CONTEXT, KP says CSL still decides"
        elif sign in OWN_SIGNS.get(pname, []):
            tag = "own"
            note = f"{pname} in own sign — strong native expression"
        else:
            tag = "neutral"
            note = ""
        out[pname] = {"sign": sign, "dignity": tag, "note": note}
    return out


# ── D9 Navamsa sign (PR fix-7, #6 + #21) ────────────────────────────

def get_d9_sign(longitude: float) -> str:
    """
    Compute the navamsa (D9) sign of a planet's longitude.
    Each sign of 30° divides into 9 navamsas of 3°20' each.
    """
    lon = longitude % 360
    sign_index = int(lon / 30)
    pos_in_sign = lon - sign_index * 30
    nav_in_sign = int(pos_in_sign / (30.0 / 9))
    sign_names = [
        "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
        "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces",
    ]
    # Movable signs start navamsa from same sign; Fixed from 9th; Dual from 5th
    movable = {"Aries","Cancer","Libra","Capricorn"}
    fixed   = {"Taurus","Leo","Scorpio","Aquarius"}
    if sign_names[sign_index] in movable:
        start = sign_index
    elif sign_names[sign_index] in fixed:
        start = (sign_index + 8) % 12
    else:  # dual
        start = (sign_index + 4) % 12
    return sign_names[(start + nav_in_sign) % 12]


# ── Intercepted signs (PR fix-8, #28) ───────────────────────────────
# Placidus often produces intercepted signs (a sign that begins AND
# ends within one house with no cusp falling in it). The intercepted
# sign's lord rules part of that house but is "buried" — its effects
# manifest LATER than expected, often after a triggering dasha unlocks
# them.

def detect_intercepted_signs(cusps: dict) -> Dict[str, object]:
    """
    For each sign 0..11, find which house its longitude range falls in.
    A sign is INTERCEPTED if no cusp falls within its 30° range AND it
    sits entirely between two cusp boundaries.

    Returns:
        intercepted_signs: list of {sign, lord, in_house, opposite_sign,
                                    opposite_lord, opposite_in_house}
        is_intercepted_chart: bool
    """
    if not cusps or "House_1" not in cusps:
        return {"intercepted_signs": [], "is_intercepted_chart": False}

    sign_names = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
    ]
    sign_lords = SIGN_LORDS  # imported from chart_engine

    cusp_lons = [
        cusps.get(f"House_{i}", {}).get("cusp_longitude", 0) % 360
        for i in range(1, 13)
    ]
    cusp_signs = [int(l / 30) for l in cusp_lons]

    # Which signs DO have a cusp falling in them?
    signs_with_cusp = set(cusp_signs)
    intercepted_idx = [i for i in range(12) if i not in signs_with_cusp]

    out: List[Dict[str, object]] = []
    for sidx in intercepted_idx:
        # Find which house contains this sign's range
        sign_start = sidx * 30.0
        sign_mid   = sign_start + 15.0
        # Walk cusps to find the house containing sign_mid
        house = 0
        for h in range(12):
            start = cusp_lons[h]
            end   = cusp_lons[(h + 1) % 12]
            if end < start:  # wraps 360
                if sign_mid >= start or sign_mid < end:
                    house = h + 1
                    break
            else:
                if start <= sign_mid < end:
                    house = h + 1
                    break

        opposite_sidx = (sidx + 6) % 12
        out.append({
            "sign":              sign_names[sidx],
            "lord":              sign_lords[sidx],
            "in_house":          house,
            "opposite_sign":     sign_names[opposite_sidx],
            "opposite_lord":     sign_lords[opposite_sidx],
            "note": (
                f"Sign {sign_names[sidx]} (lord {sign_lords[sidx]}) is intercepted in "
                f"H{house} — its themes are 'buried' and surface later in life, "
                f"typically when {sign_lords[sidx]}'s dasha or transit through "
                f"{sign_names[sidx]} activates them."
            ),
        })

    return {
        "intercepted_signs": out,
        "is_intercepted_chart": len(out) > 0,
    }


# ── Stellium detection (PR fix-8, #43) ──────────────────────────────
# A stellium = 3+ planets in the same house, especially when their
# longitudes are tightly clustered. It concentrates the house's
# themes powerfully.

def detect_stelliums(
    planet_positions: dict,
    planets: dict,
) -> List[Dict[str, object]]:
    """
    Returns list of stelliums:
        {house, planets, longitude_range_deg, tightness}
    where tightness is "tight" (<10° spread), "loose" (10-25°), or
    "wide" (25°+).
    """
    by_house: Dict[int, List[str]] = {}
    for p, h in planet_positions.items():
        if 1 <= h <= 12:
            by_house.setdefault(h, []).append(p)

    out: List[Dict[str, object]] = []
    for h, plist in by_house.items():
        if len(plist) < 3:
            continue
        lons = [planets[p].get("longitude", 0) for p in plist]
        lons_sorted = sorted(lons)
        # Spread = max - min, considering ~30° per sign
        spread = lons_sorted[-1] - lons_sorted[0]
        if spread > 180:  # crosses 0/360
            spread = 360 - spread
        tight = "tight" if spread < 10 else ("loose" if spread < 25 else "wide")
        out.append({
            "house":               h,
            "planets":             plist,
            "longitude_spread_deg": round(spread, 2),
            "tightness":           tight,
            "note": f"Stellium in H{h}: {plist} concentrate this house's themes powerfully ({tight} cluster)",
        })
    return out


# ── Lagna lord position auto-flag (PR fix-8, #44) ──────────────────

LAGNA_LORD_HOUSE_NOTES = {
    1:  "Lagna lord in own house — strong self-centered identity, robust health, self-reliant",
    2:  "Lagna lord in H2 — wealth + family-driven identity, voice/speech-oriented",
    3:  "Lagna lord in H3 — communication-driven identity, sibling-bonded, courage-defined",
    4:  "Lagna lord in H4 — home/mother-anchored identity, real-estate inclination",
    5:  "Lagna lord in H5 — creativity/children/intelligence-driven identity, romantic/playful",
    6:  "Lagna lord in H6 — service/work-grind identity, health-conscious, may be debt-prone",
    7:  "Lagna lord in H7 — partner-defined identity, public-facing, marriage-central",
    8:  "Lagna lord in H8 — transformative/research identity, hidden depths, occult-leaning",
    9:  "Lagna lord in H9 — fortune-blessed identity, philosophical, lineage-connected, often abroad",
    10: "Lagna lord in H10 — career-defined identity, status-driven, public recognition primary",
    11: "Lagna lord in H11 — gain-oriented identity, network-driven, friend-circle central",
    12: "Lagna lord in H12 — introspective/foreign/spiritual identity, sacrifice-prone",
}


def lagna_lord_disposition(
    cusps: dict,
    planets: dict,
    planet_positions: dict,
) -> Dict[str, object]:
    """Surface lagna lord's house position with interpretive note."""
    if not cusps or "House_1" not in cusps:
        return {"available": False}
    lagna_lord = get_sign_lord_for_house(1, cusps)
    if not lagna_lord or lagna_lord not in planets:
        return {"available": False, "lagna_lord": lagna_lord}
    house = planet_positions.get(lagna_lord, 0)
    lp = planets[lagna_lord]
    return {
        "available":    True,
        "lagna_lord":   lagna_lord,
        "house":        house,
        "sign":         lp.get("sign"),
        "nakshatra":    lp.get("nakshatra"),
        "star_lord":    lp.get("star_lord"),
        "sub_lord":     lp.get("sub_lord"),
        "note":         LAGNA_LORD_HOUSE_NOTES.get(house, ""),
    }


# ── Divisional charts D7, D10, D12 (PR fix-8, #35) ─────────────────
# Similar formula to D9: each sign of 30° divides into N parts of
# 30/N each. Sign assignment varies by sign type (movable/fixed/dual).

SIGN_NAMES_DIV = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]


def get_d10_sign(longitude: float) -> str:
    """
    D10 (Dasamsa) — 10 divisions of 3° each.
    Used for career deep-dive.
    Movable signs start D10 from same sign. Fixed start from 9th. Dual from 5th.
    (Same starting-rule as D9 by Parashari convention.)
    """
    lon = longitude % 360
    sidx = int(lon / 30)
    pos_in_sign = lon - sidx * 30
    div_idx = int(pos_in_sign / 3.0)
    movable = {0, 3, 6, 9}; fixed = {1, 4, 7, 10}
    if sidx in movable:    start = sidx
    elif sidx in fixed:    start = (sidx + 8) % 12
    else:                  start = (sidx + 4) % 12
    return SIGN_NAMES_DIV[(start + div_idx) % 12]


def get_d7_sign(longitude: float) -> str:
    """
    D7 (Saptamsa) — 7 divisions of 30/7 ≈ 4.286° each.
    Used for children deep-dive.
    Odd signs (Aries, Gemini, Leo, Libra, Sagittarius, Aquarius) start
    from same sign. Even signs start from the 7th sign.
    """
    lon = longitude % 360
    sidx = int(lon / 30)
    pos_in_sign = lon - sidx * 30
    div_idx = int(pos_in_sign / (30.0 / 7))
    if div_idx > 6: div_idx = 6
    if sidx % 2 == 0:   # odd signs (1st, 3rd, ... — 0-indexed even)
        start = sidx
    else:
        start = (sidx + 6) % 12
    return SIGN_NAMES_DIV[(start + div_idx) % 12]


def get_d12_sign(longitude: float) -> str:
    """
    D12 (Dwadasamsa) — 12 divisions of 2.5° each.
    Used for parents deep-dive.
    All signs start D12 from themselves.
    """
    lon = longitude % 360
    sidx = int(lon / 30)
    pos_in_sign = lon - sidx * 30
    div_idx = int(pos_in_sign / 2.5)
    if div_idx > 11: div_idx = 11
    return SIGN_NAMES_DIV[(sidx + div_idx) % 12]


# ── Decision support framework (PR fix-8, #29) ─────────────────────
# Aggregates all chart signals into a weighted go/no-go score for
# binary "should I do X" questions.

def decision_support_score(advanced: Dict[str, object]) -> Dict[str, object]:
    """
    For binary "should I do X" questions, produce a structured ledger:
        signal | weight | direction (+/-) | contribution
    Sums to a 0..100 go/no-go score with conflict-flagging.
    """
    if not advanced:
        return {"available": False}
    contributions: List[Dict[str, object]] = []
    score = 50  # neutral baseline

    # Promise verdict via confidence_score
    conf = advanced.get("confidence_score", 50)
    delta_conf = (conf - 50)  # -50..+50 contribution
    contributions.append({
        "signal": "Promise + harmony + fruitful + RP overlap composite (engine confidence)",
        "weight": 0.5,
        "direction": "+" if delta_conf > 0 else "-",
        "contribution": round(delta_conf * 0.5, 1),
        "raw": conf,
    })
    score += delta_conf * 0.5

    # Star-Sub Harmony
    h = advanced.get("star_sub_harmony") or {}
    harmony_score_map = {"HARMONY": 15, "ALIGNED": 10, "MIXED": 0, "TENSION": -10, "CONTRA": -8, "DENIED": -15}
    h_delta = harmony_score_map.get(h.get("harmony", "MIXED"), 0)
    contributions.append({
        "signal": f"Star-Sub Harmony = {h.get('harmony', 'MIXED')}",
        "weight": 1.0,
        "direction": "+" if h_delta > 0 else ("-" if h_delta < 0 else "neutral"),
        "contribution": h_delta,
    })
    score += h_delta

    # AD-sublord triggers (KSK timing rule)
    triggers = advanced.get("ad_sublord_triggers") or []
    fires = sum(1 for t in triggers if t.get("ksk_timing_active"))
    if fires:
        contributions.append({
            "signal": f"{fires} upcoming AD lord(s) match supporting-cusp-sub-lord (KSK timing fires)",
            "weight": 1.0,
            "direction": "+",
            "contribution": min(10, fires * 5),
        })
        score += min(10, fires * 5)

    # Fruitful significators
    fruitful = advanced.get("fruitful_significators") or []
    if len(fruitful) >= 3:
        contributions.append({
            "signal": f"{len(fruitful)} fruitful significators (sig ∩ RP) — strong timing readiness",
            "weight": 0.5,
            "direction": "+",
            "contribution": 8,
        })
        score += 8
    elif len(fruitful) == 0:
        contributions.append({
            "signal": "0 fruitful significators — no timing trigger active right now",
            "weight": 0.5,
            "direction": "-",
            "contribution": -5,
        })
        score -= 5

    score = max(0, min(100, score))
    verdict = (
        "STRONG GO" if score >= 75 else
        "LEAN GO" if score >= 60 else
        "MIXED" if score >= 40 else
        "LEAN NO" if score >= 25 else
        "STRONG NO"
    )

    return {
        "available":     True,
        "score":         round(score, 1),
        "verdict":       verdict,
        "contributions": contributions,
    }


# ── Conflict flagging — Vimsottari vs Yogini disagreement (PR fix-8, #39) ──

def flag_dasha_conflicts(
    advanced: Dict[str, object],
    yogini_data: Dict[str, object],
) -> List[str]:
    """
    Identify cases where Vimsottari's KSK-fires AD has a Yogini lord
    that is NOT a significator → reduce confidence by 5-10.
    """
    out: List[str] = []
    flat_sigs = []
    for h in (advanced.get("relevant_houses") or []):
        for level in ("A", "B", "C", "D"):
            flat_sigs.extend(advanced.get("significators_by_level", {}).get(h, {}).get(level, []) or [])
    flat_sigs = set(flat_sigs)

    triggers = advanced.get("ad_sublord_triggers") or []
    xc = (yogini_data or {}).get("vimsottari_xcheck") or []
    xc_by_lord = {x.get("ad_lord"): x for x in xc}
    for t in triggers:
        if not t.get("ksk_timing_active"):
            continue
        ad_lord = t.get("antardasha_lord")
        x = xc_by_lord.get(ad_lord)
        if not x:
            continue
        yog_lord = x.get("yogini_at_start")
        if yog_lord and yog_lord not in flat_sigs:
            out.append(
                f"⚠️ CONFLICT: Vimsottari AD {ad_lord} ({t['start']} → {t['end']}) "
                f"fires KSK rule, BUT concurrent Yogini lord {yog_lord} is NOT a "
                f"topic significator → systems disagree, reduce confidence by 5-10."
            )
        elif yog_lord and yog_lord in flat_sigs:
            out.append(
                f"✓ CONVERGENCE: Vimsottari AD {ad_lord} + Yogini {yog_lord} BOTH "
                f"signify topic ({t['start']} → {t['end']}) — peak window."
            )
    return out


def compute_divisional_charts(planets: dict) -> Dict[str, Dict[str, str]]:
    """
    Returns:
        {planet: {d1, d7, d9, d10, d12, vargottama_d9, vargottama_d10}}
    """
    out: Dict[str, Dict[str, str]] = {}
    for pname, p in planets.items():
        lon = p.get("longitude", 0)
        d1 = p.get("sign", "")
        d9 = get_d9_sign(lon)
        d10 = get_d10_sign(lon)
        d7 = get_d7_sign(lon)
        d12 = get_d12_sign(lon)
        out[pname] = {
            "d1":              d1,
            "d7":              d7,
            "d9":              d9,
            "d10":             d10,
            "d12":             d12,
            "vargottama_d9":   d1 == d9,
            "vargottama_d10":  d1 == d10,
        }
    return out


def detect_vargottama(planets: dict) -> Dict[str, Dict[str, object]]:
    """A planet is vargottama if D1 sign == D9 sign — strength multiplier."""
    out: Dict[str, Dict[str, object]] = {}
    for pname, p in planets.items():
        d1_sign = p.get("sign", "")
        d9_sign = get_d9_sign(p.get("longitude", 0))
        is_var = (d1_sign == d9_sign)
        out[pname] = {
            "d1_sign": d1_sign,
            "d9_sign": d9_sign,
            "vargottama": is_var,
            "note": "VARGOTTAMA — concentrated strength in both D1 + D9" if is_var else "",
        }
    return out


def compute_ashtakavarga(
    planets: dict,
    cusps: dict,
) -> Dict[str, object]:
    """
    Compute Bhinnashtakavarga (BAV) per planet and Sarvashtakavarga (SAV)
    totals per natal house.

    For each contributor (Sun, Moon, Mars, Mercury, Jupiter, Venus,
    Saturn, Lagna), we know its sign position. For each target planet's
    BAV, we look up which houses-from-contributor give a bindu, then
    map those to absolute zodiac signs. The total per sign gives BAV
    per sign for that planet. SAV per sign = sum across all 7 planets'
    BAVs.

    Returns:
        bav: {planet: [bindus_per_sign_index_0_to_11]}
        sav_per_sign: [total bindus per sign 0..11]
        sav_per_house: {1..12: total bindus in that house's sign}
    """
    if not cusps or "House_1" not in cusps:
        return {"available": False}

    # Contributor positions (sign indices 0..11)
    contributors: Dict[str, int] = {}
    for cname in ("Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"):
        p = planets.get(cname)
        if p:
            contributors[cname] = int((p.get("longitude", 0) % 360) / 30)
    # Lagna contributor
    lagna_lon = cusps["House_1"].get("cusp_longitude", 0)
    contributors["Lagna"] = int((lagna_lon % 360) / 30)

    # BAV per planet
    bav: Dict[str, List[int]] = {}
    for target_planet, table in _BAV_TABLES.items():
        bins = [0] * 12
        for contributor, contrib_sign in contributors.items():
            houses_giving_bindu = table.get(contributor, [])
            for h in houses_giving_bindu:
                # House-h-from-contributor in absolute sign
                abs_sign = (contrib_sign + h - 1) % 12
                bins[abs_sign] += 1
        bav[target_planet] = bins

    # SAV per sign
    sav_per_sign = [0] * 12
    for tp, bins in bav.items():
        for i in range(12):
            sav_per_sign[i] += bins[i]

    # SAV per native house — house's sign maps to bindu count
    sav_per_house: Dict[int, int] = {}
    for h in range(1, 13):
        cusp_lon = cusps.get(f"House_{h}", {}).get("cusp_longitude", 0)
        sign_idx = int((cusp_lon % 360) / 30)
        sav_per_house[h] = sav_per_sign[sign_idx]

    return {
        "available":     True,
        "bav":           bav,
        "sav_per_sign":  sav_per_sign,
        "sav_per_house": sav_per_house,
    }


# ── Sign categorisation ──────────────────────────────────────────────

MOVABLE_SIGNS = {"Aries", "Cancer", "Libra", "Capricorn"}
FIXED_SIGNS   = {"Taurus", "Leo", "Scorpio", "Aquarius"}
DUAL_SIGNS    = {"Gemini", "Virgo", "Sagittarius", "Pisces"}

# Per KSK strict children rule — see other_topics.txt children section.
FRUITFUL_SIGNS = {"Cancer", "Scorpio", "Pisces"}
BARREN_SIGNS   = {"Aries", "Gemini", "Leo", "Virgo", "Capricorn"}
SEMI_FRUITFUL  = {"Taurus", "Libra"}
# Sagittarius / Aquarius treated as neutral.


# ── Topic denial houses (for harmony scoring) ────────────────────────
# These match the system prompt's RULE 5 denial sets — when the
# system prompt and this dict disagree, fix BOTH at the same time.

TOPIC_DENIAL: Dict[str, List[int]] = {
    # PR A1.3-fix-2 (C3): each set is now grounded in either explicit KSK
    # rule or strict 12th-from-relevant logic; matches RULE 5 + KB.
    "marriage":       [1, 6, 10, 12],   # KSK Reader Rule 2 verbatim
    "divorce":        [2, 7, 11],       # = marriage relevant (reconciliation = denial of divorce)
    "job":            [1, 5, 9, 12],    # 12th-from [2,6,10,11] (KSK Simple Rules)
    "career":         [1, 5, 9, 12],    # alias of job
    "profession":     [1, 5, 9, 12],    # alias of job
    "business":       [1, 6, 9],        # 12th-from [7,2,10,11] — H7 primary not H6 (FIX from job copy)
    "foreign_travel": [2, 8, 11],       # 12th-from [3,9,12]
    "foreign_settle": [2, 8, 11],       # same as travel; H12 primary
    "education":      [3, 8, 10],       # KSK rule (other_topics.txt:28 + RULE 5) — was [3,5,8,12]
    "children":       [1, 4, 10],       # KSK rule (other_topics.txt) — H4=12th from H5
    "property":       [3],              # KSK: only H3 explicit (12th from H4); H10 secondary
    "litigation":     [7, 12],          # RULE 5: opponent wins via H7/H12 — was [5,7,12]
    "wealth":         [1, 8, 12],       # 12th-from H2 + debt + loss
    # Health: HOUSE_TOPICS health = [6,8,12] (disease houses = relevant for
    # "do I have/will I have disease"). TOPIC_DENIAL = wellness houses
    # [1,5,11] (denial-of-disease = healthy). No overlap with relevant.
    "health":         [1, 5, 11],
}


# ── A / B / C / D significator hierarchy (KSK Reader V) ──────────────

def get_significators_by_level(
    house_num: int,
    planets: dict,
    cusps: dict,
    planet_positions: dict,
) -> Dict[str, List[str]]:
    """
    Return KSK Reader V hierarchy for a single house:
        A = planets in star of OCCUPANT(s)            (~100% strength)
        B = OCCUPANTS of the house                    (~75%)
        C = planets in star of OWNER (sign lord)      (~50%)
        D = OWNER (sign lord) of the cusp             (~25%)

    Note: a planet can appear in multiple levels (e.g., an occupant whose
    star lord is also the sign lord). We deduplicate per-level only.
    """
    occupants: List[str] = [p for p, h in planet_positions.items() if h == house_num]
    sign_lord: Optional[str] = get_sign_lord_for_house(house_num, cusps) if cusps else None

    A: List[str] = []
    B: List[str] = list(dict.fromkeys(occupants))
    C: List[str] = []
    D: List[str] = [sign_lord] if sign_lord else []

    for pname, pdata in planets.items():
        sl = pdata.get("star_lord")
        if sl in occupants and pname not in A:
            A.append(pname)
        if sign_lord and sl == sign_lord and pname not in C:
            C.append(pname)

    return {"A": A, "B": B, "C": C, "D": D}


def get_significators_by_level_for_topic(
    topic: str,
    planets: dict,
    cusps: dict,
    planet_positions: dict,
) -> Dict[int, Dict[str, List[str]]]:
    """For each relevant house of the topic, return its A/B/C/D split."""
    if topic not in HOUSE_TOPICS:
        return {}
    out: Dict[int, Dict[str, List[str]]] = {}
    for h in HOUSE_TOPICS[topic]:
        out[h] = get_significators_by_level(h, planets, cusps, planet_positions)
    return out


# ── Fruitful significators (significator ∩ RP) ──────────────────────

def get_fruitful_significators(
    significators: List[str],
    ruling_planets_list: List[dict],
) -> List[str]:
    """
    Intersection of given significators with the current Ruling Planets.
    Per KSK timing rule: the strongest fructification trigger is when a
    house significator is ALSO ruling at the query moment.
    """
    if not ruling_planets_list:
        return []
    rp_planets = {rp.get("planet") for rp in ruling_planets_list if rp.get("planet")}
    return [s for s in significators if s in rp_planets]


# ── Self-strength (in own star) ─────────────────────────────────────

def is_self_strength(planet_name: str, planets: dict) -> bool:
    """
    True iff the planet is sitting in its OWN nakshatra (star_lord == planet
    itself). KSK calls this a "self-significator" — the planet's results
    arrive directly without colouring through another star lord.
    """
    pdata = planets.get(planet_name) or {}
    return pdata.get("star_lord") == planet_name


# PR A1.3-fix-9 — removed `self_strength_map` (dead function — replaced
# by inline dict-comp in compute_advanced_for_topic).


# ── Cusp sign type (PR fix-9: topic-scoped fruitfulness) ───────────

# Topics where fruitful/barren classification is semantically meaningful.
# For other topics (career, foreign, wealth), labeling H10 as "barren"
# is a category error (barren = fertility context, not work context).
_FRUITFULNESS_RELEVANT_TOPICS = {"children", "fertility", "marriage"}


def get_cusp_sign_type(cusp_data: dict, topic: str = None) -> Dict[str, str]:
    """
    Categorise a cusp's sign on two independent axes:
      movability:  movable | fixed | dual
      fruitfulness: fruitful | barren | semi | neutral

    PR A1.3-fix-9: fruitfulness only emitted for fertility-relevant
    topics. For career/wealth/foreign etc., the field is omitted to
    prevent the LLM from citing "Virgo barren" in a career context
    (which is a category error — barren is fertility-domain, not
    career-domain).
    """
    sign = cusp_data.get("sign", "") if cusp_data else ""
    movability = (
        "movable" if sign in MOVABLE_SIGNS else
        "fixed"   if sign in FIXED_SIGNS   else
        "dual"    if sign in DUAL_SIGNS    else "unknown"
    )
    out = {"sign": sign, "movability": movability}
    # Only emit fruitfulness for fertility-relevant topics
    if topic is None or topic in _FRUITFULNESS_RELEVANT_TOPICS:
        fruitfulness = (
            "fruitful" if sign in FRUITFUL_SIGNS else
            "barren"   if sign in BARREN_SIGNS   else
            "semi"     if sign in SEMI_FRUITFUL  else "neutral"
        )
        out["fruitfulness"] = fruitfulness
    return out


# PR A1.3-fix-9 — removed `all_cusp_sign_types` (dead function — never called externally).


# ── Star–Sub Harmony (the BIG KSK insight) ──────────────────────────

def compute_star_sub_harmony(
    csl_planet: str,
    planets: dict,
    cusps: dict,
    planet_positions: dict,
    relevant_houses: List[int],
    denial_houses: List[int],
) -> Dict[str, object]:
    """
    Split the houses signified by a CSL into THREE layers:

    SELF LAYER (the planet itself — what it embodies):
        houses occupied + owned by the CSL planet itself
    STAR LAYER (the "what" — nature of matter, KSK colouring):
        houses occupied + owned by CSL's STAR LORD
    SUB LAYER (the "whether" — KSK deciding gate):
        houses occupied + owned by CSL's SUB LORD

    PR A1.3-fix-2 (C2): when CSL is Rahu or Ketu, apply the proxy rule —
    nodes have no sign rulership, so we add their conjunction-proxy
    significations into the SELF layer (delegated to chart_engine's
    get_rahu_ketu_significations which handles conjunction + sign-lord
    chains).

    Then score harmony from STAR + SUB leans (SELF is reported but does
    not drive the verdict — the sub is still the deciding gate per KSK):
        HARMONY  — both layers lean to RELEVANT houses
        ALIGNED  — sub leans relevant, star is mixed/neutral
        MIXED    — both layers ambiguous
        TENSION  — star relevant but sub denial (block dominates)
        CONTRA   — star denial but sub relevant (fires with friction)
        DENIED   — both layers lean to denial
    """
    if csl_planet not in planets:
        return {
            "csl_planet": csl_planet, "star_lord": None, "sub_lord": None,
            "self_houses": [], "star_houses": [], "sub_houses": [],
            "self_relevant": [], "self_denial": [],
            "star_relevant": [], "star_denial": [],
            "sub_relevant": [], "sub_denial": [],
            "harmony": "UNKNOWN",
        }

    p = planets[csl_planet]
    star_lord = p.get("star_lord")
    sub_lord  = p.get("sub_lord")

    # SELF layer — CSL's own occupation + ownership
    self_houses: set = set()
    if csl_planet in planet_positions:
        self_houses.add(planet_positions[csl_planet])
    if cusps:
        self_houses.update(get_houses_owned_by_planet(csl_planet, cusps))

    # PR A1.3-fix-2 (C2): Rahu/Ketu proxy. Nodes have no sign rulership,
    # so without the proxy their SELF layer is just their occupation house
    # — drastically under-counts. Delegate to chart_engine's helper which
    # walks conjunction + star-lord chains correctly.
    if csl_planet in ("Rahu", "Ketu"):
        try:
            rk = get_rahu_ketu_significations(csl_planet, planets, cusps, planet_positions)
            for h in rk.get("all_signified_houses", []) or []:
                if isinstance(h, int) and 1 <= h <= 12:
                    self_houses.add(h)
        except Exception:
            pass  # never fail compute on RK proxy — fall back to occupation only

    # STAR layer — star lord's occupation + ownership
    star_houses: set = set()
    if star_lord and star_lord in planet_positions:
        star_houses.add(planet_positions[star_lord])
    if star_lord and cusps:
        star_houses.update(get_houses_owned_by_planet(star_lord, cusps))

    # SUB layer — sub lord's occupation + ownership
    sub_houses: set = set()
    if sub_lord and sub_lord in planet_positions:
        sub_houses.add(planet_positions[sub_lord])
    if sub_lord and cusps:
        sub_houses.update(get_houses_owned_by_planet(sub_lord, cusps))

    rel_set = set(relevant_houses or [])
    den_set = set(denial_houses or [])

    self_rel = sorted(self_houses & rel_set)
    self_den = sorted(self_houses & den_set)
    star_rel = sorted(star_houses & rel_set)
    star_den = sorted(star_houses & den_set)
    sub_rel  = sorted(sub_houses  & rel_set)
    sub_den  = sorted(sub_houses  & den_set)

    def _lean(rel: List[int], den: List[int]) -> str:
        if len(rel) > len(den): return "rel"
        if len(den) > len(rel): return "den"
        return "neutral"

    s_lean = _lean(star_rel, star_den)
    b_lean = _lean(sub_rel, sub_den)

    if   s_lean == "rel"     and b_lean == "rel":     harmony = "HARMONY"
    elif b_lean == "rel"     and s_lean != "den":     harmony = "ALIGNED"
    elif s_lean == "rel"     and b_lean == "den":     harmony = "TENSION"
    elif s_lean == "den"     and b_lean == "rel":     harmony = "CONTRA"
    elif s_lean == "den"     and b_lean == "den":     harmony = "DENIED"
    else:                                              harmony = "MIXED"

    return {
        "csl_planet": csl_planet,
        "star_lord": star_lord,
        "sub_lord":  sub_lord,
        "self_houses":   sorted(self_houses),
        "self_relevant": self_rel,
        "self_denial":   self_den,
        "star_houses": sorted(star_houses),
        "sub_houses":  sorted(sub_houses),
        "star_relevant": star_rel,
        "star_denial":   star_den,
        "sub_relevant":  sub_rel,
        "sub_denial":    sub_den,
        "harmony": harmony,
    }


def harmony_for_topic_primary_cusp(
    topic: str,
    planets: dict,
    cusps: dict,
    planet_positions: dict,
) -> Optional[Dict[str, object]]:
    """Compute Star-Sub Harmony for the topic's PRIMARY cusp's sub lord."""
    if topic not in HOUSE_TOPICS or not cusps:
        return None
    primary_house = HOUSE_TOPICS[topic][0]
    csl = cusps.get(f"House_{primary_house}", {}).get("sub_lord")
    if not csl:
        return None
    relevant = HOUSE_TOPICS[topic]
    denial   = TOPIC_DENIAL.get(topic, [])
    result = compute_star_sub_harmony(
        csl, planets, cusps, planet_positions, relevant, denial,
    )
    result["topic"] = topic
    result["primary_cusp"] = primary_house
    return result


# ── Supporting-cusp sub-lord activation (PR A1.3-fix-5) ─────────────
# KSK Reader strict timing rule: an event fructifies when an AD lord
# is the SUB-LORD of one of the topic's relevant cusps AND that
# sub-lord chain signifies the other relevant houses. The previous
# compute only looked at the PRIMARY cusp (H7 for marriage); this
# function adds the supporting cusps (H2, H11 for marriage; H6+H2+H11
# for career; H2+H11 for children; etc.) so the LLM sees ALL three
# gates and can correctly identify when the AD lord activates them.

def compute_supporting_cusp_activations(
    topic: str,
    planets: dict,
    cusps: dict,
    planet_positions: dict,
) -> List[Dict[str, object]]:
    """
    For each RELEVANT house of the topic (not just primary), compute the
    sub-lord and its 4-step chain. Returns a list of {house, sub_lord,
    signified_houses, signifies_relevant, is_primary} entries.

    LLM uses this to apply the KSK rule:
      "Marriage fructifies when AD/PAD lord is the SUB-LORD of one of
       2/7/11 AND that sub-lord signifies the other relevant houses."
    """
    if topic not in HOUSE_TOPICS or not cusps:
        return []
    relevant = HOUSE_TOPICS[topic]
    denial = TOPIC_DENIAL.get(topic, [])
    rel_set = set(relevant)
    den_set = set(denial)

    out: List[Dict[str, object]] = []
    for idx, house in enumerate(relevant):
        cusp = cusps.get(f"House_{house}", {})
        sub_lord = cusp.get("sub_lord")
        if not sub_lord or sub_lord not in planets:
            continue

        # Compute 4-step UNION of the sub-lord's signification
        p = planets[sub_lord]
        star_lord = p.get("star_lord")
        signified: set = set()
        # Self
        if sub_lord in planet_positions:
            signified.add(planet_positions[sub_lord])
        signified.update(get_houses_owned_by_planet(sub_lord, cusps))
        # Star
        if star_lord and star_lord in planet_positions:
            signified.add(planet_positions[star_lord])
        if star_lord:
            signified.update(get_houses_owned_by_planet(star_lord, cusps))
        # Sub of sub
        sub_sub = p.get("sub_lord")
        if sub_sub and sub_sub != sub_lord and sub_sub in planet_positions:
            signified.add(planet_positions[sub_sub])
        if sub_sub:
            signified.update(get_houses_owned_by_planet(sub_sub, cusps))
        # Rahu/Ketu proxy
        if sub_lord in ("Rahu", "Ketu"):
            try:
                rk = get_rahu_ketu_significations(
                    sub_lord, planets, cusps, planet_positions
                )
                for h in rk.get("all_signified_houses", []) or []:
                    if isinstance(h, int) and 1 <= h <= 12:
                        signified.add(h)
            except Exception:
                pass

        signed_rel = sorted(signified & rel_set)
        signed_den = sorted(signified & den_set)

        # KSK strict timing test: does this sub-lord signify the OTHER
        # relevant houses (excluding the cusp it's the sub-lord of)?
        other_rel = sorted((signified & rel_set) - {house})

        out.append({
            "house": house,
            "is_primary": (idx == 0),
            "sub_lord": sub_lord,
            "signified_houses": sorted(signified),
            "signified_relevant": signed_rel,
            "signified_denial": signed_den,
            "signifies_other_relevant": other_rel,
            "ksk_timing_active": len(other_rel) >= 1,  # KSK rule fires
        })
    return out


# ── RP overlap per Antardasha lord ──────────────────────────────────

def compute_rp_overlap(planet: str, ruling_planets_list: List[dict]) -> int:
    """How many RP slots a planet occupies (0..N). Higher = riper timing."""
    if not ruling_planets_list or not planet:
        return 0
    return sum(1 for rp in ruling_planets_list if rp.get("planet") == planet)


def rp_overlap_for_antardashas(
    antardashas: List[dict],
    ruling_planets_list: List[dict],
) -> List[Dict[str, object]]:
    """For each upcoming AD, return its lord + RP slot count + the slots."""
    out: List[Dict[str, object]] = []
    rp_by_planet: Dict[str, List[str]] = {}
    for rp in (ruling_planets_list or []):
        rp_by_planet.setdefault(rp.get("planet", ""), []).append(rp.get("slot", ""))
    for ad in antardashas or []:
        lord = ad.get("antardasha_lord")
        slots = rp_by_planet.get(lord, [])
        out.append({
            "antardasha_lord": lord,
            "start": ad.get("start"),
            "end":   ad.get("end"),
            "rp_overlap": len(slots),
            "rp_slots":  slots,
        })
    return out


# ── Per-topic confidence score 0–100 ────────────────────────────────

def compute_topic_confidence(
    promise_verdict: Optional[str],
    harmony: Optional[str],
    fruitful_count: int,
    rp_overlap_md: int,
    rp_overlap_ad: int,
    csl_self_strength: bool = False,
) -> int:
    """
    Weighted heuristic that synthesises the major signals into a single
    0–100 score. Calibration is INTENTIONALLY conservative — we'd rather
    say 65% and be right than say 92% and be wrong.

    Components (after PR A1.3-fix-4):
      Promise verdict tier         0–40
      Star-Sub harmony             0–25
      Fruitful significator count  0–15  (5 per fruitful, capped 15)
      MD lord RP overlap           0–10  (5 per slot, capped 10)
      AD lord RP overlap           0–10  (5 per slot, capped 10)
      CSL self-significator bonus  +5    (KSK pure-result concentration)

    Total can exceed 100 when CSL is self-significator; clamped at 100.
    """
    score = 0

    promise_map = {
        "STRONGLY PROMISED": 40,
        "PROMISED":          30,
        "CONDITIONAL":       20,
        "WEAKLY PROMISED":   10,
        "DENIED":             5,
    }
    pkey = (promise_verdict or "").strip().upper()
    score += promise_map.get(pkey, 15)

    harmony_map = {
        "HARMONY": 25, "ALIGNED": 18, "MIXED": 10,
        "TENSION":  6, "CONTRA":   6, "DENIED": 0, "UNKNOWN": 8,
    }
    score += harmony_map.get((harmony or "").upper(), 10)

    score += min(15, max(0, fruitful_count) * 5)
    score += min(10, max(0, rp_overlap_md) * 5)
    score += min(10, max(0, rp_overlap_ad) * 5)

    # PR A1.3-fix-4 (N1): KSK self-significator concentration — when the
    # primary CSL is in its own nakshatra, results arrive directly without
    # colouring through another star lord. Bonus +5.
    if csl_self_strength:
        score += 5

    return max(0, min(100, score))


# ── Top-level orchestrator ──────────────────────────────────────────

def compute_advanced_for_topic(
    topic: str,
    planets: dict,
    cusps: dict,
    planet_positions: dict,
    ruling_planets_list: List[dict],
    current_md_lord: Optional[str],
    current_ad_lord: Optional[str],
    upcoming_antardashas: List[dict],
    promise_verdict: Optional[str] = None,
) -> Dict[str, object]:
    """
    Single entry point that bundles all the A1.3c compute for a topic.
    Returns a dict ready to be merged into chart_data and emitted to
    the LLM via format_chart_for_llm.
    """
    # Significators by level for the topic's relevant houses
    sig_levels = get_significators_by_level_for_topic(
        topic, planets, cusps, planet_positions,
    )

    # Star-Sub harmony of the primary cusp
    harmony = harmony_for_topic_primary_cusp(
        topic, planets, cusps, planet_positions,
    )

    # Fruitful significators across all relevant houses
    relevant_houses = HOUSE_TOPICS.get(topic, [])
    flat_sigs: List[str] = []
    for h in relevant_houses:
        for level in ("A", "B", "C", "D"):
            for p in sig_levels.get(h, {}).get(level, []):
                if p and p not in flat_sigs:
                    flat_sigs.append(p)
    fruitful = get_fruitful_significators(flat_sigs, ruling_planets_list)

    # RP overlap on MD + AD + each upcoming AD
    md_overlap = compute_rp_overlap(current_md_lord, ruling_planets_list) if current_md_lord else 0
    ad_overlap = compute_rp_overlap(current_ad_lord, ruling_planets_list) if current_ad_lord else 0
    upcoming_overlap = rp_overlap_for_antardashas(upcoming_antardashas, ruling_planets_list)

    # Sign-type for the primary cusp (KSK overlay — esp. children/marriage)
    primary_house = relevant_houses[0] if relevant_houses else 0
    primary_cusp_data = cusps.get(f"House_{primary_house}", {}) if primary_house else {}
    # PR A1.3-fix-9 — pass topic so fruitfulness is only emitted for
    # fertility-relevant topics (children/fertility/marriage). Prevents
    # "Virgo barren" tag in career/wealth/foreign answers.
    primary_cusp_sign = get_cusp_sign_type(primary_cusp_data, topic=topic)

    # Self-strength flags for the planets that matter most for this topic
    self_strength = {p: is_self_strength(p, planets) for p in flat_sigs}

    # PR A1.3-fix-4 (N1): is the primary CSL itself a self-significator?
    csl_planet = (harmony or {}).get("csl_planet") if harmony else None
    csl_self = is_self_strength(csl_planet, planets) if csl_planet else False

    # Overall confidence
    confidence = compute_topic_confidence(
        promise_verdict=promise_verdict,
        harmony=(harmony or {}).get("harmony") if harmony else None,
        fruitful_count=len(fruitful),
        rp_overlap_md=md_overlap,
        rp_overlap_ad=ad_overlap,
        csl_self_strength=csl_self,
    )

    # PR A1.3-fix-5 — supporting cusp sub-lord activations (KSK timing rule)
    supporting_cusps = compute_supporting_cusp_activations(
        topic, planets, cusps, planet_positions,
    )

    # Identify which AD lords IN the upcoming antardasha sequence are
    # also sub-lords of one of the topic's relevant cusps. This is the
    # KSK strict timing trigger: AD-lord = supporting-cusp-sub-lord.
    cusp_sublords = {sc["sub_lord"]: sc for sc in supporting_cusps}
    ad_sublord_triggers: List[Dict[str, object]] = []
    for ad in upcoming_antardashas or []:
        ad_lord = ad.get("antardasha_lord")
        if ad_lord and ad_lord in cusp_sublords:
            sc = cusp_sublords[ad_lord]
            ad_sublord_triggers.append({
                "antardasha_lord": ad_lord,
                "start": ad.get("start"),
                "end":   ad.get("end"),
                "activates_house": sc["house"],
                "is_primary_cusp": sc["is_primary"],
                "ksk_timing_active": sc["ksk_timing_active"],
            })

    # PR A1.3-fix-6 — additional structural signals
    aspects_by_planet = compute_aspects(planet_positions)
    aspects_received  = aspects_received_by_house(aspects_by_planet)
    combustion        = detect_combustion(planets)
    conjunctions      = detect_conjunctions(planets)
    pada_per_planet   = {
        p: get_pada(planets[p].get("longitude", 0))
        for p in planets.keys()
    }
    h8_disposition    = compute_8th_lord_disposition(planets, cusps, planet_positions)
    partner_profile   = compute_partner_profile(planets, cusps, planet_positions) if topic == "marriage" else None
    ashtakavarga      = compute_ashtakavarga(planets, cusps)

    # PR A1.3-fix-7 — additional MEDIUM-priority signals
    dignity_map       = get_dignity(planets)
    vargottama_map    = detect_vargottama(planets)
    nakshatra_class   = {
        p: classify_nakshatra(planets[p].get("nakshatra", ""))
        for p in planets.keys()
    }
    # Lagna gandanta + nakshatra class
    lagna_lon = (cusps or {}).get("House_1", {}).get("cusp_longitude", 0)
    lagna_gandanta = is_in_gandanta(lagna_lon)
    lagna_nak_class = classify_nakshatra((cusps or {}).get("House_1", {}).get("nakshatra", ""))
    # Moon gandanta
    moon_lon_local = (planets or {}).get("Moon", {}).get("longitude", 0)
    moon_gandanta = is_in_gandanta(moon_lon_local)

    # PR A1.3-fix-8 — structural anomaly detection
    intercepted     = detect_intercepted_signs(cusps)
    stelliums       = detect_stelliums(planet_positions, planets)
    lagna_lord_disp = lagna_lord_disposition(cusps, planets, planet_positions)
    divisionals     = compute_divisional_charts(planets)

    # SAV strength of the topic's relevant houses — additional fitness signal
    sav_relevant: Dict[int, int] = {}
    if ashtakavarga.get("available"):
        for h in relevant_houses:
            sav_relevant[h] = ashtakavarga["sav_per_house"].get(h, 0)

    return {
        "topic": topic,
        "relevant_houses": relevant_houses,
        "denial_houses":   TOPIC_DENIAL.get(topic, []),
        "significators_by_level": sig_levels,
        "fruitful_significators": fruitful,
        "self_strength":         self_strength,
        "primary_cusp_sign_type": primary_cusp_sign,
        "star_sub_harmony":      harmony,
        "supporting_cusp_activations": supporting_cusps,  # PR A1.3-fix-5
        "ad_sublord_triggers":         ad_sublord_triggers,  # PR A1.3-fix-5
        "rp_overlap": {
            "md":  {"lord": current_md_lord, "slots": md_overlap},
            "ad":  {"lord": current_ad_lord, "slots": ad_overlap},
            "upcoming_antardashas": upcoming_overlap,
        },
        "confidence_score": confidence,
        # PR A1.3-fix-6 additions:
        "aspects_by_planet":      aspects_by_planet,
        "aspects_received":       aspects_received,
        "combustion":             combustion,
        "conjunctions":           conjunctions,
        "pada":                   pada_per_planet,
        "eighth_lord":            h8_disposition,
        "partner_profile":        partner_profile,  # only populated for marriage
        "ashtakavarga": {
            "sav_per_house":      ashtakavarga.get("sav_per_house", {}),
            "sav_relevant_houses": sav_relevant,
        },
        # PR A1.3-fix-7
        "dignity":          dignity_map,
        "vargottama":       vargottama_map,
        "nakshatra_class":  nakshatra_class,
        "lagna_gandanta":   lagna_gandanta,
        "lagna_nakshatra_class": lagna_nak_class,
        "moon_gandanta":    moon_gandanta,
        # PR A1.3-fix-8
        "intercepted_signs":  intercepted,
        "stelliums":          stelliums,
        "lagna_lord_disposition": lagna_lord_disp,
        "divisional_charts":  divisionals,
    }

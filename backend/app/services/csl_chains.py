"""
KP Cuspal Sub-Lord (CSL) Chain Pre-computation.

In KP astrology, the sub-lord of each house cusp is the DECIDING FACTOR
for that house's matters. This module pre-computes the full signification
chain for every house's CSL so Claude can interpret instead of computing.

Chain logic (4 levels):
  L1: Planet directly in that house (strongest)
  L2: Planet ruling the house sign (sign lord)
  L3: Planets in the star of any L1/L2 planet
  L4: Sub-lord of the cusp itself (deciding gate)

For the CSL chain:
  CSL sits in house X → signifies X
  CSL rules house Y (as sign lord) → signifies Y
  CSL's star lord is planet Z → Z's house significations added
  CSL's sub-lord is planet W → W's house significations added
  UNION of all → final CSL signification set
"""

from app.services.chart_engine import (
    get_sign, get_nakshatra_and_starlord, get_sub_lord,
    SIGN_LORDS as _SIGN_LORDS_LIST,
)

# PR A1.3-fix-24 — derive the dict-shaped SIGN_LORDS from chart_engine's
# canonical list, so editing one place stays in sync. Was previously a
# duplicate hardcoded dict here — silent divergence risk.
_SIGN_NAMES = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]
SIGN_LORDS = {name: _SIGN_LORDS_LIST[i] for i, name in enumerate(_SIGN_NAMES)}

HOUSE_NAMES = {
    1: "Self/Health/Lagna", 2: "Wealth/Family/Speech", 3: "Siblings/Courage/Short journeys",
    4: "Home/Mother/Property/Vehicles", 5: "Children/Romance/Education/Speculation",
    6: "Enemies/Debts/Service/Disease", 7: "Marriage/Partnerships/Contracts",
    8: "Longevity/Occult/Sudden events/Inheritance", 9: "Luck/Father/Long journeys/Religion",
    10: "Career/Status/Authority", 11: "Gains/Income/Desires fulfilled/Friends",
    12: "Losses/Expenses/Foreign/Liberation",
}


def _get_planet_house(planet_lon: float, cusp_lons: list) -> int:
    """Find which house a planet occupies given the 12 cusp longitudes."""
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
    """Return list of house numbers whose sign lord is planet_name."""
    ruled = []
    for i, lon in enumerate(cusp_lons):
        sign = get_sign(lon % 360)
        if SIGN_LORDS.get(sign) == planet_name:
            ruled.append(i + 1)
    return ruled


def _planet_lon_map(planets_list: list) -> dict:
    """Convert workspace planets array to {planet_en: longitude} dict."""
    return {p["planet_en"]: p["longitude"] for p in planets_list if "planet_en" in p}


def compute_csl_chains(cusps: list, planets: list) -> dict:
    """
    For every house cusp, compute the full CSL signification chain.

    Args:
        cusps: workspace cusps list [{house_num, cusp_longitude, sub_lord_en, star_lord_en, ...}]
        planets: workspace planets list [{planet_en, longitude, ...}]

    Returns:
        dict keyed by house number (1-12), each value has:
            csl: str — name of the Cuspal Sub-Lord
            csl_house: int — house the CSL occupies
            csl_rules: list[int] — houses CSL rules as sign lord
            csl_star_lord: str — CSL's own star lord
            csl_star_lord_house: int — house CSL's star lord occupies
            csl_star_lord_rules: list[int] — houses CSL's star lord rules
            csl_sub_lord: str — CSL's own sub-lord (one level deeper)
            csl_sub_lord_house: int — house CSL's sub-lord occupies
            all_significations: list[int] — union of all above
            chain_text: str — human-readable chain description for LLM
    """
    cusp_sorted = sorted(cusps, key=lambda c: c.get("house_num", 0))
    cusp_lons = [c["cusp_longitude"] for c in cusp_sorted]
    planet_lons = _planet_lon_map(planets)

    result = {}
    for cusp in cusp_sorted:
        h = cusp["house_num"]
        csl_name = cusp.get("sub_lord_en", "")
        if not csl_name or csl_name not in planet_lons:
            # PR A1.3-fix-24 — fill defensive defaults for ALL keys so
            # downstream consumers can read csl_chains[h]["csl_house"] etc.
            # without KeyError (today only chain_text is read, but defending
            # against future usage).
            result[h] = {
                "csl": csl_name,
                "csl_house": 0,
                "csl_rules": [],
                "csl_nakshatra": "",
                "csl_star_lord": "",
                "csl_star_lord_house": 0,
                "csl_star_lord_rules": [],
                "csl_sub_lord": "",
                "csl_sub_lord_house": 0,
                "all_significations": [],
                "chain_text": f"H{h}: CSL {csl_name} not found in planets",
            }
            continue

        csl_lon = planet_lons[csl_name]
        csl_house = _get_planet_house(csl_lon, cusp_lons)
        csl_rules = _houses_ruled_by(csl_name, cusp_lons)
        csl_nak_info = get_nakshatra_and_starlord(csl_lon)
        csl_star_lord = csl_nak_info.get("star_lord", "")
        csl_nakshatra = csl_nak_info.get("nakshatra", "")

        csl_star_lord_house = 0
        csl_star_lord_rules = []
        if csl_star_lord and csl_star_lord in planet_lons:
            csl_star_lord_house = _get_planet_house(planet_lons[csl_star_lord], cusp_lons)
            csl_star_lord_rules = _houses_ruled_by(csl_star_lord, cusp_lons)

        # One level deeper: CSL's own sub-lord
        csl_sub_lord = get_sub_lord(csl_lon)
        csl_sub_lord_house = 0
        csl_sub_lord_rules = []
        if csl_sub_lord and csl_sub_lord in planet_lons and csl_sub_lord != csl_name:
            csl_sub_lord_house = _get_planet_house(planet_lons[csl_sub_lord], cusp_lons)
            csl_sub_lord_rules = _houses_ruled_by(csl_sub_lord, cusp_lons)

        # Union of all significations
        all_signifs = sorted(set(
            [csl_house] + csl_rules +
            ([csl_star_lord_house] if csl_star_lord_house else []) + csl_star_lord_rules +
            ([csl_sub_lord_house] if csl_sub_lord_house else []) + csl_sub_lord_rules
        ))

        # Build human-readable chain text for LLM
        lines = [
            f"H{h} ({HOUSE_NAMES.get(h, '')}) — CSL = {csl_name}",
            f"  {csl_name} occupies → H{csl_house}",
        ]
        if csl_rules:
            lines.append(f"  {csl_name} rules (sign lord of) → H{', H'.join(map(str, csl_rules))}")
        else:
            lines.append(f"  {csl_name} rules → no house in this chart")
        lines.append(f"  {csl_name} nakshatra = {csl_nakshatra}, star lord = {csl_star_lord}")
        if csl_star_lord_house:
            lines.append(f"  {csl_star_lord} (star lord) occupies → H{csl_star_lord_house}")
        if csl_star_lord_rules:
            lines.append(f"  {csl_star_lord} rules → H{', H'.join(map(str, csl_star_lord_rules))}")
        lines.append(f"  {csl_name} sub-lord = {csl_sub_lord}")
        if csl_sub_lord_house:
            lines.append(f"  {csl_sub_lord} (sub-lord) occupies → H{csl_sub_lord_house}")
        if csl_sub_lord_rules:
            lines.append(f"  {csl_sub_lord} rules → H{', H'.join(map(str, csl_sub_lord_rules))}")
        lines.append(f"  ★ FINAL H{h} CSL SIGNIFICATIONS: {all_signifs}")

        result[h] = {
            "csl": csl_name,
            "csl_house": csl_house,
            "csl_rules": csl_rules,
            "csl_nakshatra": csl_nakshatra,
            "csl_star_lord": csl_star_lord,
            "csl_star_lord_house": csl_star_lord_house,
            "csl_star_lord_rules": csl_star_lord_rules,
            "csl_sub_lord": csl_sub_lord,
            "csl_sub_lord_house": csl_sub_lord_house,
            "csl_sub_lord_rules": csl_sub_lord_rules,
            "all_significations": all_signifs,
            "chain_text": "\n".join(lines),
        }

    return result


def format_csl_chains_for_llm(csl_chains: dict) -> str:
    """Format the CSL chain data as a concise text block for Claude."""
    if not csl_chains:
        return ""
    lines = ["CSL (CUSPAL SUB-LORD) CHAIN ANALYSIS — pre-computed, use these facts directly:"]
    for h in range(1, 13):
        if h in csl_chains:
            lines.append(csl_chains[h]["chain_text"])
    return "\n".join(lines)

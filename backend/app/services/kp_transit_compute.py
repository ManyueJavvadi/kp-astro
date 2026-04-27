"""
PR A1.3-fix-6 — Transit / Gocharya compute layer.

Provides the engine + LLM with structured signals about:

- Current sidereal positions of all 9 planets (today, in user's location)
- Sade Sati phase relative to natal Moon (12th/1st/2nd from Moon)
- Saturn dhaiya phases (Saturn in 4th or 8th from Moon)
- Saturn / Rahu / Ketu / Jupiter transits THROUGH key cusps of the
  native chart (marriage H7, career H10, fortune H9, etc.)
- Upcoming transit windows for each major planet through native cusps
  for the next ~3 years (sufficient for dasha-transit convergence)

KSK Reader (later editions) explicitly endorses Gocharya as a
secondary timing confirmation. The dasha gives the WINDOW; the
transit confirms the EVENT WITHIN the window.

This file is pure computation; no LLM calls, no external deps beyond
swisseph. Safe to call once per /analyze request.
"""

from datetime import datetime, timedelta, timezone as dt_tz
from typing import Dict, List, Optional

import swisseph as swe

from app.services.chart_engine import (
    PLANETS,
    NAKSHATRAS,
    SIGN_LORDS,
    get_sign,
    get_nakshatra_and_starlord,
    get_sub_lord,
    get_house_number,
)


SIGN_NAMES = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]


def _sign_index(longitude: float) -> int:
    return int((longitude % 360) / 30)


# ── Current transit positions ───────────────────────────────────────

def get_current_transits() -> Dict[str, Dict[str, object]]:
    """
    Compute today's sidereal positions (KP New ayanamsa) for all 9
    bodies. Returns {planet: {longitude, sign, nakshatra, star_lord, sub_lord}}.
    """
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    utc_now = datetime.now(dt_tz.utc)
    jd = swe.julday(
        utc_now.year, utc_now.month, utc_now.day,
        utc_now.hour + utc_now.minute / 60.0 + utc_now.second / 3600.0,
    )

    out: Dict[str, Dict[str, object]] = {}
    for planet_name, planet_id in PLANETS.items():
        result, _ = swe.calc_ut(jd, planet_id, swe.FLG_SIDEREAL)
        lon = result[0]
        if planet_name == "Rahu":
            ketu_lon = (lon + 180.0) % 360.0
            nak = get_nakshatra_and_starlord(ketu_lon)
            out["Ketu"] = {
                "longitude": round(ketu_lon, 4),
                "sign": get_sign(ketu_lon),
                "sign_index": _sign_index(ketu_lon),
                "nakshatra": nak["nakshatra"],
                "star_lord": nak["star_lord"],
                "sub_lord": get_sub_lord(ketu_lon),
            }
        nak = get_nakshatra_and_starlord(lon)
        out[planet_name] = {
            "longitude": round(lon, 4),
            "sign": get_sign(lon),
            "sign_index": _sign_index(lon),
            "nakshatra": nak["nakshatra"],
            "star_lord": nak["star_lord"],
            "sub_lord": get_sub_lord(lon),
        }
    return out


def transits_in_native_houses(
    current_transits: Dict[str, Dict[str, object]],
    natal_cusps: Dict[str, Dict[str, object]],
) -> Dict[str, int]:
    """
    For each transiting planet, return which natal house it currently
    occupies (1..12). Useful for "Saturn currently in your H10"-type reads.
    """
    out: Dict[str, int] = {}
    for pname, pdata in current_transits.items():
        try:
            out[pname] = get_house_number(float(pdata["longitude"]), natal_cusps)
        except Exception:
            out[pname] = 0
    return out


# ── Sade Sati ───────────────────────────────────────────────────────

def compute_sade_sati(
    natal_moon_longitude: float,
    saturn_current_sign_index: int,
) -> Dict[str, object]:
    """
    Sade Sati = Saturn transiting 12th, 1st, 2nd from natal Moon sign.
    Each phase ≈ 2.5 years; total ≈ 7.5 years.

    Returns:
        phase: "rising" (12th from Moon)
             | "peak"   (Moon sign itself)
             | "waning" (2nd from Moon)
             | "kantaka_4th" (Saturn dhaiya — 4th from Moon)
             | "kantaka_8th" (Saturn dhaiya — 8th from Moon)
             | "none"  (Saturn elsewhere)
        natal_moon_sign: 0..11
        saturn_current_sign: 0..11
        offset_from_moon: signed delta in signs
    """
    natal_moon_sign = int((natal_moon_longitude % 360) / 30)
    delta = (saturn_current_sign_index - natal_moon_sign) % 12

    phase_map = {
        11: "rising",      # 12th from Moon = -1 = +11 mod 12
        0:  "peak",        # Moon sign itself
        1:  "waning",      # 2nd from Moon
        3:  "kantaka_4th", # 4th from Moon (Ardhashtama / Kantaka)
        7:  "kantaka_8th", # 8th from Moon (Ashtama Shani)
    }
    phase = phase_map.get(delta, "none")

    return {
        "phase": phase,
        "natal_moon_sign":      SIGN_NAMES[natal_moon_sign],
        "natal_moon_sign_index": natal_moon_sign,
        "saturn_current_sign":  SIGN_NAMES[saturn_current_sign_index],
        "saturn_current_sign_index": saturn_current_sign_index,
        "offset_from_moon_signs": delta if delta <= 6 else delta - 12,
        "interpretation": {
            "rising":      "Sade Sati Phase 1 — first 2.5 years; foundation challenges, anxiety, work pressure",
            "peak":        "Sade Sati Phase 2 (PEAK) — middle 2.5 years; identity/career upheaval; most intense",
            "waning":      "Sade Sati Phase 3 — last 2.5 years; financial/family pressure but learning consolidates",
            "kantaka_4th": "Ardhashtama Shani / 4th Kantaka — 2.5-year domestic/property/mother stress phase",
            "kantaka_8th": "Ashtama Shani — 2.5-year health/longevity/transformation phase",
            "none":        "Saturn not in Sade Sati or Kantaka — neutral Saturn transit period",
        }.get(phase, ""),
    }


# ── Saturn / Rahu / Ketu / Jupiter through key natal cusps ──────────

def transits_through_key_cusps(
    current_transits: Dict[str, Dict[str, object]],
    natal_cusps: Dict[str, Dict[str, object]],
) -> Dict[str, Dict[str, object]]:
    """
    For Saturn, Jupiter, Rahu, Ketu, and Sun (the slow / slow-ish
    movers most relevant for life events), return:
      - current natal house
      - whether the planet is currently transiting through one of the
        chart's "trigger cusps" (H1, H4, H7, H10, H2, H11, H8, H12)
      - simple interpretation tag

    Note: this is current-moment only. Forward-looking transit windows
    are in `upcoming_key_transits`.
    """
    KEY_HOUSES = [1, 2, 4, 7, 8, 10, 11, 12]
    out: Dict[str, Dict[str, object]] = {}

    for planet in ("Saturn", "Jupiter", "Rahu", "Ketu", "Sun"):
        pdata = current_transits.get(planet)
        if not pdata:
            continue
        try:
            house = get_house_number(float(pdata["longitude"]), natal_cusps)
        except Exception:
            house = 0
        is_key = house in KEY_HOUSES
        out[planet] = {
            "current_natal_house": house,
            "current_sign": pdata.get("sign"),
            "is_in_key_house": is_key,
            "tag": _key_house_tag(planet, house),
        }
    return out


def _key_house_tag(planet: str, house: int) -> str:
    """Short interpretive tag — stays factual, avoids overreach."""
    tags = {
        ("Saturn", 1):  "Saturn over Lagna — 2.5y identity-pressure / career-discipline phase",
        ("Saturn", 4):  "Saturn 4th — domestic/property/mother stress",
        ("Saturn", 7):  "Saturn through H7 — DELAYS marriage attempts during this transit (~2.5y)",
        ("Saturn", 8):  "Saturn through H8 — chronic-health / transformation phase",
        ("Saturn", 10): "Saturn through H10 — career pressure + status discipline",
        ("Saturn", 12): "Saturn through H12 — losses / introspection / foreign expense",
        ("Jupiter", 1): "Jupiter over Lagna — confidence / opportunity expansion (~1y)",
        ("Jupiter", 2): "Jupiter through H2 — wealth / family expansion / marriage-arrangement trigger",
        ("Jupiter", 4): "Jupiter through H4 — home / property / education boost",
        ("Jupiter", 7): "Jupiter through H7 — MARRIAGE TRIGGER if dasha supports (~1y)",
        ("Jupiter", 9): "Jupiter through H9 — fortune / higher-learning peak",
        ("Jupiter", 10): "Jupiter through H10 — career growth / promotion window",
        ("Jupiter", 11): "Jupiter through H11 — MARRIAGE FULFILLMENT trigger / income peak (~1y)",
        ("Rahu", 1):  "Rahu over Lagna — identity/path upheaval; unconventional choices favoured",
        ("Rahu", 7):  "Rahu through H7 — marriage with unconventional / cross-cultural element",
        ("Rahu", 10): "Rahu through H10 — career pivot / sudden rise / tech-AI affinity",
        ("Ketu", 1):  "Ketu over Lagna — detachment / spiritual reorientation",
        ("Ketu", 7):  "Ketu through H7 — partner-detachment / fewer matches surface",
        ("Ketu", 10): "Ketu through H10 — career detachment / role-release / pivot prep",
    }
    return tags.get((planet, house), f"{planet} in H{house} — neutral for this transit")


# ── Upcoming transit windows (next 3 years) ────────────────────────

def upcoming_key_transits(
    natal_cusps: Dict[str, Dict[str, object]],
    months_ahead: int = 36,
) -> List[Dict[str, object]]:
    """
    Compute when Saturn, Jupiter, Rahu, Ketu transit INTO each key
    natal house over the next `months_ahead` months. Returns events:
        [{planet, sign, native_house, enters_at, exits_at, tag}]

    Sampling cadence: 7 days. Fine enough for these slow movers.
    """
    KEY_HOUSES = {1, 2, 4, 7, 8, 9, 10, 11, 12}
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)

    start = datetime.now(dt_tz.utc)
    end = start + timedelta(days=30 * months_ahead)
    step = timedelta(days=7)

    PLANETS_TO_TRACK = ("Saturn", "Jupiter", "Rahu", "Ketu")
    last_house: Dict[str, int] = {p: -1 for p in PLANETS_TO_TRACK}
    last_enter: Dict[str, datetime] = {}
    events: List[Dict[str, object]] = []

    t = start
    while t <= end:
        jd = swe.julday(
            t.year, t.month, t.day,
            t.hour + t.minute / 60.0,
        )
        for pname in PLANETS_TO_TRACK:
            pid = PLANETS.get(pname)
            if pid is None and pname != "Ketu":
                continue
            if pname == "Ketu":
                rahu_result, _ = swe.calc_ut(jd, PLANETS["Rahu"], swe.FLG_SIDEREAL)
                lon = (rahu_result[0] + 180.0) % 360.0
            else:
                result, _ = swe.calc_ut(jd, pid, swe.FLG_SIDEREAL)
                lon = result[0]
            try:
                house = get_house_number(lon, natal_cusps)
            except Exception:
                continue

            if house != last_house[pname]:
                # House change. Close previous event if it was a key house.
                prev_house = last_house[pname]
                if prev_house in KEY_HOUSES and pname in last_enter:
                    events.append({
                        "planet":       pname,
                        "native_house": prev_house,
                        "sign":         get_sign(lon),
                        "enters_at":    last_enter[pname].strftime("%Y-%m-%d"),
                        "exits_at":     t.strftime("%Y-%m-%d"),
                        "tag":          _key_house_tag(pname, prev_house),
                    })
                # Start new tracking if entering a key house.
                if house in KEY_HOUSES:
                    last_enter[pname] = t
                else:
                    last_enter.pop(pname, None)
                last_house[pname] = house
        t += step

    # Close any still-open events at end of window.
    for pname in PLANETS_TO_TRACK:
        if last_house[pname] in KEY_HOUSES and pname in last_enter:
            events.append({
                "planet":       pname,
                "native_house": last_house[pname],
                "sign":         "(continues past window)",
                "enters_at":    last_enter[pname].strftime("%Y-%m-%d"),
                "exits_at":     f">{end.strftime('%Y-%m-%d')}",
                "tag":          _key_house_tag(pname, last_house[pname]),
            })

    events.sort(key=lambda e: e["enters_at"])
    return events


# ── Top-level orchestrator ──────────────────────────────────────────

def compute_transit_bundle(
    natal_cusps: Dict[str, Dict[str, object]],
    natal_moon_longitude: float,
) -> Dict[str, object]:
    """One-shot: returns everything the LLM needs about transits."""
    transits = get_current_transits()
    transit_houses = transits_in_native_houses(transits, natal_cusps)
    saturn_sign_index = transits.get("Saturn", {}).get("sign_index", 0)
    sade_sati = compute_sade_sati(natal_moon_longitude, saturn_sign_index)
    key_cusps = transits_through_key_cusps(transits, natal_cusps)
    upcoming = upcoming_key_transits(natal_cusps, months_ahead=48)

    return {
        "current_transits":       transits,
        "transit_houses":         transit_houses,
        "sade_sati":              sade_sati,
        "key_cusp_transits":      key_cusps,
        "upcoming_key_transits":  upcoming,
        "computed_at_utc":        datetime.now(dt_tz.utc).strftime("%Y-%m-%d %H:%M UTC"),
    }

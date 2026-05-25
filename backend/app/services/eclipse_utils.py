"""
PR R2-PR3 — Shared eclipse + Sutak helpers.

Extracted from muhurtha_engine.py so Horary (prashna-moment check),
Match (recommended-wedding-date check), and Muhurtha (scan-window
check) can all use the same code path.

Per research (R2 round, primary sources):
  • Solar eclipse Sutak begins 12h before peak, ends at moksha (end).
  • Lunar eclipse Sutak begins  9h before peak, ends at moksha.
  • Extended advisory: ±3 days around the peak (soft caution).
  • Sutak applies at locations where the eclipsed body is ABOVE the
    horizon during any part of the eclipse — the
    "Yatra Drishyam Tatra Phalam" rule. For e.g. a wedding in LA
    during an eclipse visible only from India, Sutak does NOT apply
    at LA. The visibility test is `is_eclipse_visible(...)` below.
"""
from __future__ import annotations
from typing import Optional

import swisseph as swe


SUTAK_SOLAR_HRS = 12.0
SUTAK_LUNAR_HRS = 9.0
EXT_ADVISORY_DAYS = 3.0


def find_eclipses_in_range(start_jd: float, end_jd: float) -> list:
    """
    Find all solar + lunar eclipses whose peak falls within
    [start_jd, end_jd] and compute the classical Sutak windows around
    them.

    Returns a list of dicts:
      [{
        type: "solar" | "lunar",
        eclipse_kind: "TOTAL" | "ANNULAR" | "PARTIAL" | ...,
        peak_jd: float,
        sutak_start_jd: float,
        sutak_end_jd: float,
        ext_advisory_start_jd: float,  # 3 days before
        ext_advisory_end_jd: float,    # 3 days after
      }]
    """
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    eclipses: list = []

    # ── Solar eclipses ──
    try:
        cursor = start_jd
        for _ in range(20):  # at most ~12 solar eclipses in 5 years
            res, tret = swe.sol_eclipse_when_glob(cursor, swe.FLG_SWIEPH, 0, False)
            if not tret:
                break
            peak = tret[0]
            if peak > end_jd:
                break
            # tret indices: 0=peak, 2=eclipse_start, 3=eclipse_end (global)
            ecl_end = tret[3] if len(tret) > 3 and tret[3] else (peak + 0.1)
            kind = (
                "TOTAL" if res & swe.ECL_TOTAL else
                "ANNULAR" if res & swe.ECL_ANNULAR else
                "PARTIAL" if res & swe.ECL_PARTIAL else
                "ANNULAR_TOTAL" if res & swe.ECL_ANNULAR_TOTAL else
                "UNKNOWN"
            )
            eclipses.append({
                "type": "solar",
                "eclipse_kind": kind,
                "peak_jd": peak,
                "sutak_start_jd": peak - (SUTAK_SOLAR_HRS / 24.0),
                "sutak_end_jd":   ecl_end,
                "ext_advisory_start_jd": peak - EXT_ADVISORY_DAYS,
                "ext_advisory_end_jd":   peak + EXT_ADVISORY_DAYS,
            })
            cursor = peak + 0.5  # advance past this eclipse
    except Exception:
        pass

    # ── Lunar eclipses ──
    try:
        cursor = start_jd
        for _ in range(20):
            res, tret = swe.lun_eclipse_when(cursor, swe.FLG_SWIEPH, 0, False)
            if not tret:
                break
            peak = tret[0]
            if peak > end_jd:
                break
            ecl_end = tret[3] if len(tret) > 3 and tret[3] else (peak + 0.15)
            kind = (
                "TOTAL" if res & swe.ECL_TOTAL else
                "PARTIAL" if res & swe.ECL_PARTIAL else
                "PENUMBRAL" if res & swe.ECL_PENUMBRAL else
                "UNKNOWN"
            )
            eclipses.append({
                "type": "lunar",
                "eclipse_kind": kind,
                "peak_jd": peak,
                "sutak_start_jd": peak - (SUTAK_LUNAR_HRS / 24.0),
                "sutak_end_jd":   ecl_end,
                "ext_advisory_start_jd": peak - EXT_ADVISORY_DAYS,
                "ext_advisory_end_jd":   peak + EXT_ADVISORY_DAYS,
            })
            cursor = peak + 0.5
    except Exception:
        pass

    eclipses.sort(key=lambda e: e["peak_jd"])
    return eclipses


def is_eclipse_visible(
    eclipse: dict,
    lat: float,
    lon: float,
) -> Optional[bool]:
    """
    Per "Yatra Drishyam Tatra Phalam" (Sutak applies where eclipse is
    seen): check if the eclipsed body (Sun for solar, Moon for lunar)
    is above the horizon at the event location at the eclipse peak.

    Returns True if visible, False if invisible, None if undeterminable.
    Used to gate Sutak application for diaspora clients (e.g. wedding
    in LA during an India-only eclipse → Sutak does NOT apply at LA).
    """
    try:
        peak = eclipse["peak_jd"]
        body = swe.SUN if eclipse["type"] == "solar" else swe.MOON
        # Compute horizontal coordinates at the event location for peak JD
        # swe.azalt: (alt, az, ...) — alt > 0 means above horizon
        geopos = (lon, lat, 0.0)
        # Get apparent ecliptic position first
        xx, _ = swe.calc_ut(peak, body, swe.FLG_SWIEPH)
        # Transform to horizontal at observer
        hor = swe.azalt(peak, swe.ECL2HOR, geopos, 1013.25, 10.0, list(xx[:3]))
        # hor is (azimuth, true_alt, apparent_alt)
        true_alt = hor[1]
        return true_alt > 0
    except Exception:
        return None


def get_sutak_status(
    jd: float,
    eclipses: list,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    require_visibility: bool = True,
) -> dict:
    """
    For a given moment, return the Sutak / extended-advisory status.

    Per visibility doctrine ("Yatra Drishyam Tatra Phalam"), Sutak
    only applies at locations where the eclipsed body is above the
    horizon at the eclipse peak. Pass lat+lon to enforce visibility;
    pass require_visibility=False to apply Sutak universally
    (orthodox minority view).

    Returns:
      {
        in_sutak: dict or None,           # the eclipse causing Sutak, if active
        in_extended_advisory: dict or None,
        visibility_filtered: bool,         # True if some eclipses were dropped due to invisibility
      }
    """
    in_sutak = None
    in_extended = None
    visibility_filtered = False
    for e in eclipses:
        if require_visibility and lat is not None and lon is not None:
            visible = is_eclipse_visible(e, lat, lon)
            if visible is False:
                visibility_filtered = True
                continue
            # if None (undeterminable), be conservative — apply Sutak
        if e["sutak_start_jd"] <= jd <= e["sutak_end_jd"]:
            in_sutak = e
            break
        if e["ext_advisory_start_jd"] <= jd <= e["ext_advisory_end_jd"]:
            in_extended = e
            # don't break — sutak takes precedence if found later
    return {
        "in_sutak": in_sutak,
        "in_extended_advisory": in_extended,
        "visibility_filtered": visibility_filtered,
    }

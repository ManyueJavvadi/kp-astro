"""
PR A1.3-fix-7 — Yogini Dasha (8-year parallel cycle).

Yogini Dasha is a parallel timing system used as a CROSS-CHECK against
Vimsottari. While Vimsottari runs on a 120-year cycle, Yogini runs on
36 years (sum of 1+2+3+4+5+6+7+8). Each Yogini period is named after
a Yogini deity and ruled by a planet:

    Mangala (1y) - Moon
    Pingala (2y) - Sun
    Dhanya  (3y) - Jupiter
    Bhramari(4y) - Mars
    Bhadrika(5y) - Mercury
    Ulka    (6y) - Saturn
    Siddha  (7y) - Venus
    Sankata (8y) - Rahu
    [Total = 36 years; cycle repeats]

Starting Yogini at birth = derived from Moon's nakshatra index:
    nak_index from Ashwini=0 to Revati=26
    yogini_index = (nak_index + 1) % 8 → maps to one of 8 Yoginis

When Vimsottari and Yogini agree on the timing of a major event, the
prediction confidence is significantly higher. Disagreement = the
event is more uncertain.

This file is pure compute. No LLM. No web access.
"""

from datetime import datetime, timedelta
from typing import Dict, List


YOGINI_NAMES = [
    "Mangala", "Pingala", "Dhanya", "Bhramari",
    "Bhadrika", "Ulka", "Siddha", "Sankata",
]
YOGINI_LORDS = [
    "Moon", "Sun", "Jupiter", "Mars",
    "Mercury", "Saturn", "Venus", "Rahu",
]
YOGINI_YEARS = [1, 2, 3, 4, 5, 6, 7, 8]
TOTAL_YOGINI_YEARS = sum(YOGINI_YEARS)  # 36

NAKSHATRA_TO_YOGINI_INDEX = {
    # nakshatra index 0..26 → which Yogini starts at birth
    # Standard: Ashwini=Mangala (idx 0). Then sequential mod 8.
    0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7,
    8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 6, 15: 7,
    16: 0, 17: 1, 18: 2, 19: 3, 20: 4, 21: 5, 22: 6, 23: 7,
    24: 0, 25: 1, 26: 2,
}


def _nakshatra_index_from_longitude(lon: float) -> int:
    return int((lon % 360) / (360.0 / 27))


def calculate_yogini_dashas(
    birth_date: str,
    birth_time: str,
    moon_longitude: float,
) -> List[Dict[str, object]]:
    """
    Calculate Yogini Mahadashas from birth, similar in shape to
    Vimsottari calculate_dashas output.

    Returns list of:
        {yogini_name, yogini_lord, start, end, duration_years}

    Computes from birth through ~3 cycles (108 years) — enough for any
    natural lifetime.
    """
    birth_dt = datetime.strptime(f"{birth_date} {birth_time}", "%Y-%m-%d %H:%M")

    # Balance at birth: how much of starting Yogini remains?
    nak_index = _nakshatra_index_from_longitude(moon_longitude)
    nak_span = 360.0 / 27
    pos_in_nak = (moon_longitude % 360) - (nak_index * nak_span)
    fraction_traversed = pos_in_nak / nak_span
    fraction_remaining = 1.0 - fraction_traversed

    starting_yog_idx = NAKSHATRA_TO_YOGINI_INDEX[nak_index % 27]
    starting_years = YOGINI_YEARS[starting_yog_idx] * fraction_remaining

    out: List[Dict[str, object]] = []
    current = birth_dt
    yog_idx = starting_yog_idx
    first = True
    cycles = 0
    while cycles < 3:
        years = YOGINI_YEARS[yog_idx]
        if first:
            years = starting_years
            first = False
        end = current + timedelta(days=years * 365.25)
        out.append({
            "yogini_name":    YOGINI_NAMES[yog_idx],
            "yogini_lord":    YOGINI_LORDS[yog_idx],
            "start":          current.strftime("%Y-%m-%d"),
            "end":            end.strftime("%Y-%m-%d"),
            "duration_years": round(years, 3),
        })
        current = end
        yog_idx = (yog_idx + 1) % 8
        if yog_idx == starting_yog_idx:
            cycles += 1
    return out


def get_current_yogini(yogini_dashas: List[Dict[str, object]]) -> Dict[str, object]:
    """Find the currently-running Yogini."""
    today = datetime.now().strftime("%Y-%m-%d")
    for y in yogini_dashas:
        if y["start"] <= today <= y["end"]:
            return y
    return yogini_dashas[-1] if yogini_dashas else {}


def yogini_at_date(
    yogini_dashas: List[Dict[str, object]],
    target_date: str,
) -> Dict[str, object]:
    """Find Yogini active at a target date (used to cross-check Vimsottari AD)."""
    for y in yogini_dashas:
        if y["start"] <= target_date <= y["end"]:
            return y
    return {}


def cross_check_with_vimsottari(
    yogini_dashas: List[Dict[str, object]],
    vimsottari_antardashas: List[Dict[str, object]],
) -> List[Dict[str, object]]:
    """
    For each Vimsottari AD, identify which Yogini is running concurrently.
    When BOTH the Vimsottari AD lord AND the Yogini lord are significators
    of the topic's relevant houses, that's a CONVERGED window — peak timing.

    Returns list of:
        {ad_lord, ad_start, ad_end, yogini_lord_at_start, yogini_lord_at_end,
         shared_lord (if AD lord == Yogini lord, very rare and very strong)}
    """
    out: List[Dict[str, object]] = []
    for ad in vimsottari_antardashas or []:
        ad_start = ad.get("start", "")
        ad_end = ad.get("end", "")
        ad_lord = ad.get("antardasha_lord")
        ystart = yogini_at_date(yogini_dashas, ad_start)
        yend   = yogini_at_date(yogini_dashas, ad_end)
        out.append({
            "ad_lord":              ad_lord,
            "ad_start":             ad_start,
            "ad_end":               ad_end,
            "yogini_at_start":      ystart.get("yogini_lord"),
            "yogini_name_at_start": ystart.get("yogini_name"),
            "yogini_at_end":        yend.get("yogini_lord"),
            "yogini_name_at_end":   yend.get("yogini_name"),
            "shared_lord":          (ad_lord == ystart.get("yogini_lord")) if ad_lord else False,
        })
    return out

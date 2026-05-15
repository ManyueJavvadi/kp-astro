"""
Panchangam router — location-based Panchangam endpoint.
Allows frontend to fetch Panchang for any coordinates (current user location,
not just birth location), and returns Choghadiya + Hora sequence.

Accuracy fixes (Phase 3):
  - Sunrise uses upper limb + refraction (not disc center) = true observed sunrise
  - Tithi/Nakshatra/Yoga computed at sunrise, not noon
  - Hora uses proportional day/night hours (12 day + 12 night)
  - Binary-search transition times for Tithi, Nakshatra, Yoga
  - Abhijit Muhurtha added (8th of 15 muhurtas)
  - Durmuhurtha uses 15-muhurta day division (not hardcoded times)
  - Two Karanas per day with transition time
  - Gulika Kalam added
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from datetime import datetime, timedelta, timezone, date as date_type
import calendar as calendar_module
from typing import Optional, List
import math
import swisseph as swe
from astral import LocationInfo
from astral.sun import sun as astral_sun

# PR A1.3-fix-24 — serialize swisseph topo+calc blocks (set_topo races
# with concurrent panchangam requests for different cities). See
# app/services/swe_lock.py for full rationale.
import functools
from app.services.swe_lock import swe_lock


def _with_swe_lock(fn):
    """Decorator: hold the global swisseph lock for the entire call.

    Used on endpoints that mutate swe.set_topo() because the topo state
    persists across calls. Inner decorator (applied before @router.post)
    so FastAPI's body parsing sees the original signature via functools.wraps.
    """
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        with swe_lock():
            return fn(*args, **kwargs)
    return wrapper

from app.services.telugu_terms import (
    NAKSHATRAS_TELUGU, TITHIS_TELUGU, YOGAS_TELUGU,
    KARANAS_TELUGU, DAYS_TELUGU, TELUGU_YEARS, TELUGU_MONTHS,
    SIGNS_TELUGU,
)
from app.services.timezone_utils import resolve_timezone

router = APIRouter()

# ── Constants ───────────────────────────────────────────────────────

NAKSHATRA_NAMES_EN = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira",
    "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha",
    "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati",
    "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
    "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha",
    "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]
TITHIS_EN = [
    "Shukla Pratipada", "Shukla Dwitiya", "Shukla Tritiya", "Shukla Chaturthi", "Shukla Panchami",
    "Shukla Shashthi", "Shukla Saptami", "Shukla Ashtami", "Shukla Navami", "Shukla Dashami",
    "Shukla Ekadashi", "Shukla Dwadashi", "Shukla Trayodashi", "Shukla Chaturdashi", "Pournami",
    "Krishna Pratipada", "Krishna Dwitiya", "Krishna Tritiya", "Krishna Chaturthi", "Krishna Panchami",
    "Krishna Shashthi", "Krishna Saptami", "Krishna Ashtami", "Krishna Navami", "Krishna Dashami",
    "Krishna Ekadashi", "Krishna Dwadashi", "Krishna Trayodashi", "Krishna Chaturdashi", "Amavasya",
]
YOGA_EN = [
    "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana",
    "Atiganda", "Sukarma", "Dhriti", "Shula", "Ganda",
    "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
    "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva",
    "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma",
    "Indra", "Vaidhriti"
]

# PR A1.2b — yoga quality classification per classical Muhurtha texts.
# The 9 "papa" (malefic) yogas are well-documented: Vishkambha, Atiganda,
# Shula, Ganda, Vyaghata, Vajra, Vyatipata, Parigha, Vaidhriti.
# Everything else is auspicious (subha) by convention.
YOGA_QUALITY = {
    "Vishkambha": "inauspicious",  # # 0
    "Priti":      "auspicious",
    "Ayushman":   "auspicious",
    "Saubhagya":  "auspicious",
    "Shobhana":   "auspicious",
    "Atiganda":   "inauspicious",  # # 5
    "Sukarma":    "auspicious",
    "Dhriti":     "auspicious",
    "Shula":      "inauspicious",  # # 8
    "Ganda":      "inauspicious",  # # 9
    "Vriddhi":    "auspicious",
    "Dhruva":     "auspicious",
    "Vyaghata":   "inauspicious",  # # 12
    "Harshana":   "auspicious",
    "Vajra":      "inauspicious",  # # 14
    "Siddhi":     "auspicious",
    "Vyatipata":  "inauspicious",  # # 16
    "Variyan":    "auspicious",
    "Parigha":    "inauspicious",  # # 18
    "Shiva":      "auspicious",
    "Siddha":     "auspicious",
    "Sadhya":     "auspicious",
    "Shubha":     "auspicious",
    "Shukla":     "auspicious",
    "Brahma":     "auspicious",
    "Indra":      "auspicious",
    "Vaidhriti":  "inauspicious",  # # 26
}
DAY_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

RAHU_KALAM_SLOTS  = {0: 1, 1: 6, 2: 4, 3: 5, 4: 3, 5: 2, 6: 7}
YAMAGANDAM_SLOTS  = {0: 4, 1: 3, 2: 2, 3: 1, 4: 0, 5: 6, 6: 5}
GULIKA_SLOTS      = {0: 6, 1: 5, 2: 4, 3: 3, 4: 2, 5: 1, 6: 0}

# Durmuhurtha: 1/15-day (1 muhurta) slots per weekday (0-indexed from sunrise).
#
# PR A1.2b — slot 7 is Abhijit Muhurtha which is universally auspicious
# (except some say on Wednesday). It cannot be a durmuhurtha. Tuesday's
# slot was [4, 7] which overlapped Abhijit. Fixed per Hora Shastra:
#
#   Sunday    13th, 14th  (0-idx [12, 13])
#   Monday    12th, 13th  (0-idx [11, 12])
#   Tuesday    5th,  9th  (0-idx  [4,  8])
#   Wednesday  6th, 10th  (0-idx  [5,  9])
#   Thursday   6th, 10th  (0-idx  [5,  9])
#   Friday     8th,  9th  (0-idx  [7,  8])  — Abhijit said to overlap on Friday
#   Saturday   1st,  2nd  (0-idx  [0,  1])
#
# Some traditions disagree on Friday's slots; will be re-verified with
# user's father's almanac in PR A1.2c if he flags any Friday case.
DURMUHURTHA_SLOTS = {
    0: [11, 12],  # Monday
    1: [ 4,  8],  # Tuesday  (was [4, 7] — slot 7 is Abhijit)
    2: [ 5,  9],  # Wednesday
    3: [ 5,  9],  # Thursday
    4: [ 7,  8],  # Friday
    5: [ 0,  1],  # Saturday
    6: [12, 13],  # Sunday
}

CHARA_KARANAS_EN = ["Bava", "Balava", "Kaulava", "Taitula", "Garija", "Vanija", "Vishti"]

# PR A1.2c — Varjyam (inauspicious) start-time per nakshatra, expressed
# as a fraction (0.0-1.0) of the nakshatra's duration. Varjyam duration
# is fixed at 1h 36m (≈ 0.12 of a 13.333° nakshatra at average Moon speed,
# but in practice we compute as a fixed 1h36m clock window). Values from
# Muhurtha Chintamani / Kalamrita / canonical Panchang almanacs.
#
# Index 0 = Ashwini ... 26 = Revati.
VARJYAM_START_FRACTION = [
    0.50,  # Ashwini         — 50/100 of nakshatra
    0.24,  # Bharani
    0.30,  # Krittika
    0.40,  # Rohini
    0.14,  # Mrigashira
    0.11,  # Ardra
    0.30,  # Punarvasu
    0.20,  # Pushya
    0.32,  # Ashlesha
    0.30,  # Magha
    0.20,  # Purva Phalguni
    0.20,  # Uttara Phalguni
    0.21,  # Hasta
    0.20,  # Chitra
    0.14,  # Swati
    0.14,  # Vishakha
    0.10,  # Anuradha
    0.14,  # Jyeshtha
    0.56,  # Mula
    0.24,  # Purva Ashadha
    0.20,  # Uttara Ashadha
    0.10,  # Shravana
    0.10,  # Dhanishtha
    0.18,  # Shatabhisha
    0.16,  # Purva Bhadrapada
    0.15,  # Uttara Bhadrapada
    0.30,  # Revati
]

# PR A1.2c — Panchaka dosha: inauspicious for specific activities
# (travel, ceremonies) when Moon is in one of 5 nakshatras: Dhanishtha
# (last half), Shatabhisha, Purva Bhadrapada, Uttara Bhadrapada, Revati.
PANCHAKA_NAKSHATRAS = {22, 23, 24, 25, 26}  # indices; Dhanishtha = 22

# PR A1.2d — Panchaka sub-type classification by weekday.
# Classical Muhurtha Chintamani rule: when Moon is in a Panchaka
# nakshatra AND a specific weekday coincides, one of five sub-types
# activates, each blocking a different activity class. Other weekdays
# still carry generic Panchaka (avoid new starts, travel, ceremonies)
# but without a named sub-type.
# Weekday indices: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun.
PANCHAKA_SUBTYPE_BY_WEEKDAY = {
    0: "Raja",    # Monday — authority, govt/legal dealings blocked
    1: "Agni",    # Tuesday — fire, cooking, welding, electrical blocked
    3: "Chora",   # Thursday — theft, money-movement, vault access blocked
    5: "Mrityu",  # Saturday — death-like outcomes; all auspicious blocked
    6: "Roga",    # Sunday — illness; surgery, hospital visits blocked
    # Wed + Fri — Panchaka active but unnamed (generic avoid)
}

# PR A1.2d — Events most commonly blocked by any Panchaka (regardless of
# sub-type, per Muhurtha Chintamani vivaha-griha-yatra-vahana-dhanya
# rule). The astrologer overrides in practice only when Lagna CSL is
# very clean AND the event is not in this list.
PANCHAKA_UNIVERSALLY_BLOCKED_EVENTS = [
    "marriage",        # vivaha
    "house_warming",   # griha pravesh
    "travel",          # yatra
    "vehicle",         # vahana kraya
    "business",        # new venture (classical dhanya sangraha analogue)
]

# PR A1.2c — Tithi Shunya: "void tithi" for specific lunar months
# (Masa). The rule: certain tithis in certain months are considered
# empty/ineffectual for worldly results. Canonical table from
# Muhurtha Chintamani. Index 0 = Chaitra..
# For simplicity we encode the common rule: Shukla Chaturthi + Krishna
# Chaturthi in Chaitra; Shukla Dashami + Krishna Dashami in Vaisakha;
# etc. The map returns a list of tithi_nums.
TITHI_SHUNYA_BY_MASA = {
    "Chaitra":  [4, 19],   # Shukla 4, Krishna 4
    "Vaisakha": [10, 25],  # Shukla 10, Krishna 10
    "Jyeshtha": [5, 20],
    "Ashadha":  [6, 21],
    "Shravana": [2, 17],
    "Bhadrapada": [7, 22],
    "Ashwina":  [8, 23],
    "Kartika":  [9, 24],
    "Margashira": [11, 26],
    "Pausha":   [12, 27],
    "Magha":    [3, 18],
    "Phalguna": [1, 16],
}

# Hora lords: Sun→Venus→Mercury→Moon→Saturn→Jupiter→Mars (repeating)
HORA_LORDS    = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"]
DAY_HORA_START = {0: 3, 1: 6, 2: 2, 3: 5, 4: 1, 5: 4, 6: 0}  # 0=Mon, 6=Sun

CHOGHADIYA_DAY_SEQ = {
    0: ["Amrit", "Kaal",  "Shubh", "Rog",   "Udveg", "Chal",  "Labh",  "Amrit"],  # Mon
    1: ["Rog",   "Udveg", "Chal",  "Labh",  "Amrit", "Kaal",  "Shubh", "Rog"],    # Tue
    2: ["Labh",  "Amrit", "Kaal",  "Shubh", "Rog",   "Udveg", "Chal",  "Labh"],   # Wed
    3: ["Shubh", "Rog",   "Udveg", "Chal",  "Labh",  "Amrit", "Kaal",  "Shubh"],  # Thu
    4: ["Chal",  "Labh",  "Amrit", "Kaal",  "Shubh", "Rog",   "Udveg", "Chal"],   # Fri
    5: ["Kaal",  "Shubh", "Rog",   "Udveg", "Chal",  "Labh",  "Amrit", "Kaal"],   # Sat
    6: ["Udveg", "Chal",  "Labh",  "Amrit", "Kaal",  "Shubh", "Rog",   "Udveg"],  # Sun
}
CHOGHADIYA_NIGHT_SEQ = {
    0: ["Chal",  "Labh",  "Amrit", "Kaal",  "Shubh", "Rog",   "Udveg", "Chal"],   # Mon
    1: ["Kaal",  "Shubh", "Rog",   "Udveg", "Chal",  "Labh",  "Amrit", "Kaal"],   # Tue
    2: ["Udveg", "Chal",  "Labh",  "Amrit", "Kaal",  "Shubh", "Rog",   "Udveg"],  # Wed
    3: ["Amrit", "Kaal",  "Shubh", "Rog",   "Udveg", "Chal",  "Labh",  "Amrit"],  # Thu
    4: ["Rog",   "Udveg", "Chal",  "Labh",  "Amrit", "Kaal",  "Shubh", "Rog"],    # Fri
    5: ["Labh",  "Amrit", "Kaal",  "Shubh", "Rog",   "Udveg", "Chal",  "Labh"],   # Sat
    6: ["Shubh", "Rog",   "Udveg", "Chal",  "Labh",  "Amrit", "Kaal",  "Shubh"],  # Sun
}
CHOGHADIYA_QUALITY = {
    "Amrit": "auspicious", "Shubh": "auspicious", "Labh": "auspicious",
    "Chal": "neutral",
    "Rog": "inauspicious", "Kaal": "inauspicious", "Udveg": "inauspicious",
}


# ── Core Helpers ─────────────────────────────────────────────────────

def jd_to_local_time_str(jd: float, tz_offset: float) -> str:
    """HH:MM:SS format for main display."""
    unix_seconds = (jd - 2440588.5) * 86400
    dt_utc = datetime(1970, 1, 1) + timedelta(seconds=unix_seconds)
    dt_local = dt_utc + timedelta(hours=tz_offset)
    return dt_local.strftime("%H:%M:%S")


def jd_to_local_time_short(jd: float, tz_offset: float) -> str:
    """HH:MM format for compact displays (choghadiya, hora, calendar cells)."""
    unix_seconds = (jd - 2440588.5) * 86400
    dt_utc = datetime(1970, 1, 1) + timedelta(seconds=unix_seconds)
    dt_local = dt_utc + timedelta(hours=tz_offset)
    return dt_local.strftime("%H:%M")


def _dt_to_jd(dt: datetime) -> float:
    """Convert a datetime (UTC or timezone-aware) to Julian Day."""
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    hour_frac = dt.hour + dt.minute / 60.0 + dt.second / 3600.0 + dt.microsecond / 3_600_000_000.0
    return swe.julday(dt.year, dt.month, dt.day, hour_frac)


def get_sunrise_sunset_jd(local_date: date_type, lat: float, lon: float,
                          tz_offset: float) -> tuple:
    """
    Sunrise/sunset using astral library (NOAA algorithm).
    Returns (sunrise_jd, sunset_jd) in Julian Day (UT).

    PR A1.2a — signature changed. Previously took a JD argument and
    round-tripped it through unix_seconds math, which produced a float
    drift that silently shifted `target_date` back by a day for many
    timezones. Now takes the location's LOCAL date directly plus the
    timezone offset. Passes tzinfo to astral so it anchors the whole
    sunrise-to-sunset window to the astrologer's civil day.

    Falls back to pyswisseph if astral fails (polar regions).
    """
    try:
        loc_tz = timezone(timedelta(hours=tz_offset))
        loc = LocationInfo(latitude=lat, longitude=lon)
        s = astral_sun(loc.observer, date=local_date, tzinfo=loc_tz)
        return _dt_to_jd(s["sunrise"]), _dt_to_jd(s["sunset"])
    except Exception:
        # Polar-region fallback via Swiss Ephemeris.
        geopos = (lon, lat, 0.0)
        # Anchor the search at noon UTC on the local date.
        ref_jd = swe.julday(local_date.year, local_date.month, local_date.day,
                            12.0 - tz_offset)
        try:
            _, tret = swe.rise_trans(
                ref_jd - 0.5, swe.SUN, b"", 0,
                swe.CALC_RISE, geopos, 1013.25, 10.0
            )
            sunrise_jd = tret[1]
            _, tret2 = swe.rise_trans(
                sunrise_jd, swe.SUN, b"", 0,
                swe.CALC_SET, geopos, 1013.25, 10.0
            )
            sunset_jd = tret2[1]
            return sunrise_jd, sunset_jd
        except Exception:
            return ref_jd - 0.25, ref_jd + 0.25


def get_next_sunrise_jd(local_date: date_type, lat: float, lon: float,
                        tz_offset: float) -> float:
    """Next-day sunrise (for proportional hora).

    PR A1.2a — signature changed to accept local_date directly (same
    rationale as get_sunrise_sunset_jd). Caller passes the NEXT local
    date (today + 1) so we don't have to re-derive it from a JD.
    """
    try:
        loc_tz = timezone(timedelta(hours=tz_offset))
        loc = LocationInfo(latitude=lat, longitude=lon)
        s = astral_sun(loc.observer, date=local_date, tzinfo=loc_tz)
        return _dt_to_jd(s["sunrise"])
    except Exception:
        # Fallback: approximate 24h after noon of the requested local date.
        ref_jd = swe.julday(local_date.year, local_date.month, local_date.day,
                            12.0 - tz_offset)
        return ref_jd + 0.25


def _extract_rise_jd(tret, ref_jd: float, window_days: float = 1.2) -> Optional[float]:
    """
    Extract a valid JD from a swe.rise_trans tret tuple.
    PR A1.2c — pyswisseph's tret is a tuple whose index 0 holds the
    JD of the event. Previously we tried index 0 and 1 with a 2.0-day
    tolerance; switched to index 0 only (matches the actual API) and
    tightened tolerance to 1.2 days (anything farther is the wrong
    event — e.g. tomorrow's moonrise when the user asked for today's).
    """
    try:
        jd = tret[0]
    except (IndexError, TypeError):
        return None
    if not isinstance(jd, (int, float)):
        return None
    if not (jd > 2400000 and abs(jd - ref_jd) < window_days):
        return None
    return jd


def _call_rise_trans(start_jd: float, body: int, rsmi: int, geopos: tuple):
    """
    PR A1.2c — wrap swe.rise_trans across pyswisseph version signatures.
    Newer builds take 6 args: (start_jd, body, rsmi, geopos, atpress, attemp).
    Older builds took 8 with extra name / flags slots. We previously
    always passed the 8-arg form, which raised TypeError on the modern
    build → every caller's try/except swallowed it → every moonrise
    silently became None.
    """
    try:
        return swe.rise_trans(start_jd, body, rsmi, geopos, 1013.25, 10.0)
    except TypeError:
        # Legacy signature with extra name + flags slots.
        return swe.rise_trans(start_jd, body, b"", 0, rsmi, geopos, 1013.25, 10.0)


def get_moonrise_moonset_jd(date_jd: float, lat: float, lon: float):
    """Moonrise and moonset for the day. Returns (moonrise_jd, moonset_jd)
    or None for each.

    PR A1.2c — fixed the pyswisseph call signature (was always raising
    TypeError on current versions and returning None), and tightened
    the tolerance window so a rise/set from the prior day doesn't get
    mis-assigned to today.
    """
    geopos = (lon, lat, 0.0)
    moonrise_jd = None
    moonset_jd = None
    # Search starting 6 hours before local midnight on the target local day.
    # date_jd is noon-UT minus tz_offset → midnight is date_jd - 0.5.
    # Searching a bit earlier catches moonrise that occurred just after
    # midnight for negative tz offsets.
    search_start = date_jd - 0.5
    try:
        _, tret = _call_rise_trans(search_start, swe.MOON, swe.CALC_RISE, geopos)
        moonrise_jd = _extract_rise_jd(tret, date_jd)
    except Exception:
        pass
    try:
        _, tret2 = _call_rise_trans(search_start, swe.MOON, swe.CALC_SET, geopos)
        moonset_jd = _extract_rise_jd(tret2, date_jd)
    except Exception:
        pass
    return moonrise_jd, moonset_jd


def get_karana_name(moon_lon: float, sun_lon: float) -> str:
    diff = (moon_lon - sun_lon) % 360
    idx = int(diff / 6)
    if idx == 0:
        return "Kimstughna"
    elif idx <= 56:
        return CHARA_KARANAS_EN[(idx - 1) % 7]
    elif idx == 57:
        return "Shakuni"
    elif idx == 58:
        return "Chatushpada"
    return "Naga"


def get_karana_pair(moon_lon: float, sun_lon: float, sunrise_jd: float,
                     tz_offset: float) -> dict:
    """Return current karana and second karana with transition time."""
    diff = (moon_lon - sun_lon) % 360
    idx1 = int(diff / 6)
    idx2 = idx1 + 1

    def idx_to_name(idx: int) -> str:
        if idx == 0:
            return "Kimstughna"
        elif idx <= 56:
            return CHARA_KARANAS_EN[(idx - 1) % 7]
        elif idx == 57:
            return "Shakuni"
        elif idx == 58:
            return "Chatushpada"
        return "Naga"

    name1 = idx_to_name(idx1)
    name2 = idx_to_name(idx2 % 60)

    # Find transition time: binary search for when moon-sun diff crosses next 6° boundary
    boundary = (idx1 + 1) * 6.0
    transition_jd = None
    try:
        lo, hi = sunrise_jd, sunrise_jd + 1.05
        def diff_at(jd: float) -> float:
            m = swe.calc_ut(jd, swe.MOON, _CALC_FLAGS)[0][0]
            s = swe.calc_ut(jd, swe.SUN,  _CALC_FLAGS)[0][0]
            return (m - s) % 360

        d_lo = diff_at(lo)
        d_hi = diff_at(hi)
        # Only search if boundary is crossed in this window
        if (d_lo < boundary <= d_hi) or (d_hi < d_lo and boundary >= d_lo):
            for _ in range(38):
                mid = (lo + hi) / 2.0
                d_mid = diff_at(mid)
                if d_mid < boundary:
                    lo = mid
                else:
                    hi = mid
            transition_jd = (lo + hi) / 2.0
    except Exception:
        pass

    return {
        "karana1": name1,
        "karana2": name2,
        "karana1_ends": jd_to_local_time_str(transition_jd, tz_offset) if transition_jd else None,
    }


# ── Binary Search Transition Helpers ────────────────────────────────

_CALC_FLAGS = swe.FLG_SIDEREAL | swe.FLG_TOPOCTR

def _moon_tithi_num(jd: float) -> int:
    moon = swe.calc_ut(jd, swe.MOON, _CALC_FLAGS)[0][0]
    sun  = swe.calc_ut(jd, swe.SUN,  _CALC_FLAGS)[0][0]
    return int(((moon - sun) % 360) / 12)

def _moon_nak_num(jd: float) -> int:
    moon = swe.calc_ut(jd, swe.MOON, _CALC_FLAGS)[0][0]
    return int((moon % 360) / (360 / 27))

def _yoga_num(jd: float) -> int:
    moon = swe.calc_ut(jd, swe.MOON, _CALC_FLAGS)[0][0]
    sun  = swe.calc_ut(jd, swe.SUN,  _CALC_FLAGS)[0][0]
    return int(((moon + sun) % 360) / (360 / 27)) % 27


def find_transition_jd(start_jd: float, end_jd: float, val_fn) -> Optional[float]:
    """
    Binary search to find JD when val_fn(jd) changes from its value at start_jd.
    Returns None if no change detected in [start_jd, end_jd].
    38 iterations → ~0.3 second precision.
    """
    try:
        v_start = val_fn(start_jd)
        v_end   = val_fn(end_jd)
        if v_start == v_end:
            return None
        lo, hi = start_jd, end_jd
        for _ in range(38):
            mid = (lo + hi) / 2.0
            if val_fn(mid) == v_start:
                lo = mid
            else:
                hi = mid
        return (lo + hi) / 2.0
    except Exception:
        return None


# ── Choghadiya / Hora ─────────────────────────────────────────────────

def build_choghadiya(sunrise_jd: float, sunset_jd: float, weekday: int,
                      tz_offset: float, now_jd: float) -> list:
    """Build full day+night choghadiya period list."""
    periods = []
    day_duration   = (sunset_jd - sunrise_jd) / 8.0
    night_total    = 1.0 - (sunset_jd - sunrise_jd)
    night_duration = night_total / 8.0

    day_names   = CHOGHADIYA_DAY_SEQ.get(weekday, CHOGHADIYA_DAY_SEQ[0])
    night_names = CHOGHADIYA_NIGHT_SEQ.get(weekday, CHOGHADIYA_NIGHT_SEQ[0])

    for i, name in enumerate(day_names):
        s = sunrise_jd + i * day_duration
        e = s + day_duration
        periods.append({
            "name": name, "quality": CHOGHADIYA_QUALITY.get(name, "neutral"),
            "start": jd_to_local_time_short(s, tz_offset),
            "end":   jd_to_local_time_short(e, tz_offset),
            "is_current": s <= now_jd < e, "is_day": True,
        })

    for i, name in enumerate(night_names):
        s = sunset_jd + i * night_duration
        e = s + night_duration
        periods.append({
            "name": name, "quality": CHOGHADIYA_QUALITY.get(name, "neutral"),
            "start": jd_to_local_time_short(s, tz_offset),
            "end":   jd_to_local_time_short(e, tz_offset),
            "is_current": s <= now_jd < e, "is_day": False,
        })
    return periods


def build_hora_sequence(sunrise_jd: float, sunset_jd: float, weekday: int,
                         tz_offset: float, now_jd: float,
                         lat: float, lon: float,
                         local_date: date_type) -> list:
    """
    24 proportional planetary hours: 12 day + 12 night.
    Day hora = (sunset-sunrise)/12. Night hora = (next_sunrise-sunset)/12.
    (NOT fixed 1-hour slots — those are wrong for any non-equinox location.)

    PR A1.2a — local_date is now a required parameter so we can derive
    tomorrow's date deterministically without round-tripping sunset_jd.
    """
    next_sunrise_jd = get_next_sunrise_jd(
        local_date + timedelta(days=1), lat, lon, tz_offset,
    )
    day_dur   = (sunset_jd        - sunrise_jd)   / 12.0
    night_dur = (next_sunrise_jd  - sunset_jd)    / 12.0
    start_idx = DAY_HORA_START[weekday]
    periods   = []

    for i in range(12):
        s = sunrise_jd + i * day_dur
        e = s + day_dur
        lord = HORA_LORDS[(start_idx + i) % 7]
        periods.append({
            "lord": lord, "start": jd_to_local_time_short(s, tz_offset),
            "end": jd_to_local_time_short(e, tz_offset),
            "is_current": s <= now_jd < e,
            "is_auspicious": lord in ("Jupiter", "Venus", "Mercury"),
            "is_day": True,
        })

    for i in range(12):
        s = sunset_jd + i * night_dur
        e = s + night_dur
        lord = HORA_LORDS[(start_idx + 12 + i) % 7]
        periods.append({
            "lord": lord, "start": jd_to_local_time_short(s, tz_offset),
            "end": jd_to_local_time_short(e, tz_offset),
            "is_current": s <= now_jd < e,
            "is_auspicious": lord in ("Jupiter", "Venus", "Mercury"),
            "is_day": False,
        })
    return periods


# ── Telugu Name Helpers ──────────────────────────────────────────────

KARANA_TELUGU_MAP = {
    "Bava": "బవ", "Balava": "బాలవ", "Kaulava": "కౌలవ",
    "Taitula": "తైతిల", "Garija": "గర", "Vanija": "వణిజ",
    "Vishti": "విష్టి", "Kimstughna": "కింస్తుఘ్న",
    "Shakuni": "శకుని", "Chatushpada": "చతుష్పాద", "Naga": "నాగ",
}

SIGN_NAMES = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

# Map sidereal sun sign to Telugu month name
SIGN_TO_MASA = {
    "Aries": "Vaisakha", "Taurus": "Jyeshtha", "Gemini": "Ashadha",
    "Cancer": "Shravana", "Leo": "Bhadrapada", "Virgo": "Ashwina",
    "Libra": "Kartika", "Scorpio": "Margashirsha", "Sagittarius": "Pausha",
    "Capricorn": "Magha", "Aquarius": "Phalguna", "Pisces": "Chaitra",
}

# Rutu (season) from masa
MASA_TO_RUTU = {
    "Chaitra": "వసంత ఋతువు", "Vaisakha": "వసంత ఋతువు",
    "Jyeshtha": "గ్రీష్మ ఋతువు", "Ashadha": "గ్రీష్మ ఋతువు",
    "Shravana": "వర్ష ఋతువు", "Bhadrapada": "వర్ష ఋతువు",
    "Ashwina": "శరద్ ఋతువు", "Kartika": "శరద్ ఋతువు",
    "Margashirsha": "హేమంత ఋతువు", "Pausha": "హేమంత ఋతువు",
    "Magha": "శిశిర ఋతువు", "Phalguna": "శిశిర ఋతువు",
}


def get_tithi_telugu(tithi_num: int) -> str:
    """Convert 1-based tithi number to Telugu string with paksha prefix."""
    idx = (tithi_num - 1) % 15  # 0-14
    paksha = "శుక్ల" if tithi_num <= 15 else "కృష్ణ"
    tithi_name = TITHIS_TELUGU[idx]
    if tithi_num == 15:
        return "పౌర్ణమి"
    elif tithi_num == 30:
        return "అమావాస్య"
    return f"{paksha} {tithi_name}"


def get_nakshatra_telugu(naks_num: int) -> str:
    """Convert 0-based nakshatra index to Telugu name."""
    en_name = NAKSHATRA_NAMES_EN[naks_num]
    return NAKSHATRAS_TELUGU.get(en_name, en_name)


def get_yoga_telugu(yoga_num: int) -> str:
    """Convert 0-based yoga index to Telugu name."""
    return YOGAS_TELUGU[yoga_num] if yoga_num < len(YOGAS_TELUGU) else YOGA_EN[yoga_num]


def get_karana_telugu(karana_en: str) -> str:
    return KARANA_TELUGU_MAP.get(karana_en, karana_en)


def get_vara_telugu(weekday: int) -> str:
    """weekday: 0=Monday..6=Sunday (Python convention)."""
    en_name = DAY_EN[weekday]
    return DAYS_TELUGU.get(en_name, en_name)


# PR A1.2a — canonical 60-year Samvatsara cycle.
# Index 0 = Prabhava. Anchored on the year 1867 = Prabhava (universally
# agreed; same anchor on DrikPanchang, Wikipedia, every Telugu almanac).
# 1867 + 60n is always Prabhava: 1867, 1927, 1987, 2047 etc.
SAMVATSARA_NAMES_EN = [
    "Prabhava", "Vibhava", "Shukla", "Pramodhoota", "Prajapati",
    "Angirasa", "Srimukha", "Bhava", "Yuva", "Dhatru",
    "Ishvara", "Bahudhanya", "Pramadhi", "Vikrama", "Vrisha",
    "Chitrabhanu", "Svabhanu", "Tarana", "Parthiva", "Vyaya",
    "Sarvajit", "Sarvadhari", "Virodhi", "Vikrithi", "Khara",
    "Nandana", "Vijaya", "Jaya", "Manmatha", "Durmukhi",
    "Hevilambi", "Vilambi", "Vikari", "Sharvari", "Plava",
    "Shubhakrit", "Shobhakrit", "Krodhi", "Vishwavasu", "Parabhava",
    "Plavanga", "Kilaka", "Saumya", "Sadharana", "Virodhikruth",
    "Paridhavi", "Pramadicha", "Ananda", "Rakshasa", "Nala",
    "Pingala", "Kalayukti", "Siddharthi", "Raudra", "Durmati",
    "Dundubhi", "Rudhirodgari", "Raktakshi", "Krodhana", "Akshaya",
]

# Short English meaning per name — useful context for the astrologer
# alongside the Telugu/Sanskrit name.
SAMVATSARA_MEANINGS_EN = {
    "Prabhava":      "the originator / new beginnings",
    "Vibhava":       "expansion / prosperity",
    "Shukla":        "the bright / pure",
    "Pramodhoota":   "delight / joy",
    "Prajapati":     "lord of beings",
    "Angirasa":      "fiery / sage Angiras",
    "Srimukha":      "the auspicious face",
    "Bhava":         "existence / becoming",
    "Yuva":          "youth / vitality",
    "Dhatru":        "the supporter / creator",
    "Ishvara":       "the supreme / ruler",
    "Bahudhanya":    "abundant grain / prosperity",
    "Pramadhi":      "the destroyer / intoxicated",
    "Vikrama":       "valor / heroic",
    "Vrisha":        "righteousness / bull (dharma)",
    "Chitrabhanu":   "of varied splendor",
    "Svabhanu":      "self-luminous",
    "Tarana":        "the deliverer",
    "Parthiva":      "earthly / royal",
    "Vyaya":         "expense / loss",
    "Sarvajit":      "all-conquering",
    "Sarvadhari":    "all-supporting",
    "Virodhi":       "the opposer",
    "Vikrithi":      "transformation / disturbance",
    "Khara":         "harsh / difficult",
    "Nandana":       "the delight-giver",
    "Vijaya":        "victory",
    "Jaya":          "triumph",
    "Manmatha":      "passion / Cupid",
    "Durmukhi":      "of unfortunate face",
    "Hevilambi":     "delayed / slow",
    "Vilambi":       "slow-moving",
    "Vikari":        "afflicted / distressed",
    "Sharvari":      "the night",
    "Plava":         "carrying away / flood",
    "Shubhakrit":    "doer of good",
    "Shobhakrit":    "doer of beauty",
    "Krodhi":        "the angry",
    "Vishwavasu":    "wealth of the universe",
    "Parabhava":     "defeat / reversal of established order",
    "Plavanga":      "the leaping / monkey",
    "Kilaka":        "the pillar / pivotal",
    "Saumya":        "gentle / pleasant",
    "Sadharana":     "ordinary / common",
    "Virodhikruth":  "the doer of opposition",
    "Paridhavi":     "the one who runs around",
    "Pramadicha":    "intoxicating / negligent",
    "Ananda":        "bliss / joy",
    "Rakshasa":      "the demonic / fierce",
    "Nala":          "stalk / king Nala",
    "Pingala":       "tawny / reddish brown",
    "Kalayukti":     "joined with time / war strategy",
    "Siddharthi":    "the one who attains goals",
    "Raudra":        "fierce / Rudra-like",
    "Durmati":       "evil-minded",
    "Dundubhi":      "the war-drum",
    "Rudhirodgari":  "blood-spilling",
    "Raktakshi":     "red-eyed",
    "Krodhana":      "the wrathful",
    "Akshaya":       "imperishable / inexhaustible",
}


def get_samvatsara_for_date(local_date: date_type) -> dict:
    """
    PR A1.2a — return Samvatsara info for a given LOCAL date.

    The Telugu/Tamil samvatsara year switches at Ugadi (Chaitra Shukla
    Pratipada), which falls in March or April depending on the lunar
    month. Calling this with year alone (as the old engine did) was wrong
    for the entire Jan-Apr window — for example "Jan 2026" should still
    return the previous year's name (Vishwavasu) until Ugadi 2026
    arrives (~Mar 19), at which point it becomes Parabhava.

    Returns dict:
        te:            Telugu name
        en:            English transliteration
        meaning:       Short English meaning
        cycle_index:   0-based position in the 60-year cycle
        cycle_year:    1-based "Year N of 60"
    """
    year = local_date.year
    # Ugadi occurs around Mar 19 - Apr 14 depending on the year. For a
    # robust label-only purpose, treat anything before Mar 20 as the
    # previous samvatsara. Astrologers needing minute-precise transition
    # should consult the tithi (Chaitra Shukla 1).
    if local_date.month < 3 or (local_date.month == 3 and local_date.day < 20):
        year -= 1
    idx = (year - 1867) % 60
    name_en = SAMVATSARA_NAMES_EN[idx]
    return {
        "te": TELUGU_YEARS[idx] if idx < len(TELUGU_YEARS) else "",
        "en": name_en,
        "meaning": SAMVATSARA_MEANINGS_EN.get(name_en, ""),
        "cycle_index": idx,
        "cycle_year": idx + 1,
    }


# Back-compat shim. Existing callers `get_samvatsara(year)` still work
# but now route through a fixed-March-15 date stub. New code should use
# get_samvatsara_for_date with a real date.
def get_samvatsara(year: int) -> str:
    return get_samvatsara_for_date(date_type(year, 6, 15))["te"]


def get_ayana(sun_lon: float) -> str:
    """Uttarayana (270-90°) or Dakshinayana (90-270°) based on sidereal Sun."""
    if sun_lon >= 270 or sun_lon < 90:
        return "ఉత్తరాయణం"
    return "దక్షిణాయనం"


def get_masa_rutu(sun_sign: str):
    """Return (masa_en, masa_te, rutu_te) from sun's sidereal sign."""
    masa_en = SIGN_TO_MASA.get(sun_sign, "Chaitra")
    masa_te = TELUGU_MONTHS.get(masa_en, masa_en)
    rutu_te = MASA_TO_RUTU.get(masa_en, "")
    return masa_en, masa_te, rutu_te


def get_tithi_short(tithi_num: int) -> str:
    """Short tithi label for calendar cell, e.g. 'శు·3' or 'కృ·12'."""
    idx = (tithi_num - 1) % 15 + 1
    if tithi_num == 15:
        return "పౌర్ణమి"
    elif tithi_num == 30:
        return "అమావాస్య"
    paksha = "శు" if tithi_num <= 15 else "కృ"
    return f"{paksha}·{idx}"


def get_nakshatra_short(naks_num: int) -> str:
    """First few Telugu chars of nakshatra for calendar cell."""
    te = get_nakshatra_telugu(naks_num)
    # Take up to 4 Telugu characters
    return te[:4] if len(te) >= 4 else te


def get_special_marker(tithi_num: int) -> Optional[str]:
    """Return special day marker or None."""
    if tithi_num == 15:
        return "పౌర్ణమి"
    elif tithi_num == 30:
        return "అమావాస్య"
    elif tithi_num == 11 or tithi_num == 26:
        return "ఏకాదశి"
    return None


def get_moon_phase_icon(tithi_num: int) -> str:
    """Return moon phase emoji for calendar cell."""
    if tithi_num == 15:
        return "🌕"
    elif tithi_num == 30:
        return "🌑"
    elif tithi_num <= 7:
        return "🌒"
    elif tithi_num <= 14:
        return "🌔"
    elif tithi_num <= 22:
        return "🌖"
    else:
        return "🌘"


# ── Request Models ───────────────────────────────────────────────────

# PR A1.3-fix-24 — input bounds. Year/month bounds prevent
# `calendar.monthrange(req.year, req.month)` 500s on malformed input.
class PanchangamLocationRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    timezone_offset: float = Field(5.5, ge=-14, le=14)
    date: Optional[str] = Field(None, max_length=12)   # YYYY-MM-DD, defaults to today


class CalendarRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    timezone_offset: float = Field(5.5, ge=-14, le=14)
    year: int = Field(..., ge=1900, le=2100)
    month: int = Field(..., ge=1, le=12)


# ── Main Location Endpoint ───────────────────────────────────────────

@router.post("/location")
@_with_swe_lock  # PR A1.3-fix-24 — set_topo race protection
def get_location_panchangam(req: PanchangamLocationRequest):
    """
    Calculate today's (or given date's) Panchangam for any geographic location.
    Returns full panchang + choghadiya + hora sequence.
    All values based on TRUE sunrise (upper limb + refraction).
    Tithi/Nakshatra/Yoga computed at sunrise (traditional rule: "tithi of the day = tithi at sunrise").
    """
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    swe.set_topo(req.longitude, req.latitude, 0)

    # Resolve ACTUAL timezone from coordinates (ignore browser offset)
    tz_offset, tz_name = resolve_timezone(req.latitude, req.longitude)

    # PR A1.2a — resolve target date in the LOCATION's local time and
    # pass it directly to sunrise/sunset calculation. Previously we
    # round-tripped a "noon UTC" JD through unix_seconds math to extract
    # a date, which silently shifted the date backwards by up to 24h in
    # many timezones (root cause of user-reported sunrise/sunset bug).
    if req.date:
        local_target = datetime.strptime(req.date, "%Y-%m-%d").date()
    else:
        utc_now = datetime.now(timezone.utc)
        local_target = (utc_now + timedelta(hours=tz_offset)).date()

    # `target` (datetime) kept for downstream uses that still need it.
    target = datetime.combine(local_target, datetime.min.time()).replace(hour=12)

    # Julian Day at noon local on target date (UT) — used for search anchors
    # and intra-day computations. Noon UTC on local_date minus tz_offset.
    jd_noon = swe.julday(local_target.year, local_target.month, local_target.day,
                          12.0 - tz_offset)

    # Current moment as JD (UT)
    _now = datetime.now(timezone.utc)
    now_jd = swe.julday(_now.year, _now.month, _now.day,
                         _now.hour + _now.minute / 60.0 + _now.second / 3600.0)

    # ── Sunrise / Sunset (now anchored on local date + timezone) ──────
    sunrise_jd, sunset_jd = get_sunrise_sunset_jd(
        local_target, req.latitude, req.longitude, tz_offset,
    )

    # ── Planet positions AT SUNRISE (traditional rule) ─────────────
    moon_lon = swe.calc_ut(sunrise_jd, swe.MOON, _CALC_FLAGS)[0][0]
    sun_lon  = swe.calc_ut(sunrise_jd, swe.SUN,  _CALC_FLAGS)[0][0]

    diff      = (moon_lon - sun_lon) % 360
    tithi_num = int(diff / 12) + 1
    naks_num  = int((moon_lon % 360) / (360 / 27))
    nakshatra_pada = int((moon_lon % (360 / 27)) / (360 / 108)) + 1  # 1-4
    yoga_num  = int(((sun_lon + moon_lon) % 360) / (360 / 27)) % 27
    weekday   = target.weekday()

    # Moon illumination percentage (visual appearance)
    diff_rad = math.radians(diff)
    moon_illum_pct = round((1 - math.cos(diff_rad)) / 2 * 100, 1)

    # ── 8-Slot Kalam windows (Rahu/Yama/Gulika) — DAY ──────────────
    slot_dur    = (sunset_jd - sunrise_jd) / 8.0
    rk_start_jd = sunrise_jd + RAHU_KALAM_SLOTS[weekday]  * slot_dur
    yg_start_jd = sunrise_jd + YAMAGANDAM_SLOTS[weekday]  * slot_dur
    gl_start_jd = sunrise_jd + GULIKA_SLOTS[weekday]      * slot_dur

    # PR A1.2c — Night Kalam windows. The 8-slot system is applied
    # again to sunset→next-sunrise, using the NEXT weekday's slot map
    # (traditional rule: "night Rahu belongs to tomorrow's weekday").
    next_sunrise_jd = get_next_sunrise_jd(
        local_target + timedelta(days=1), req.latitude, req.longitude, tz_offset,
    )
    night_slot_dur = (next_sunrise_jd - sunset_jd) / 8.0
    next_weekday = (weekday + 1) % 7
    rk_night_start_jd = sunset_jd + RAHU_KALAM_SLOTS[next_weekday] * night_slot_dur
    yg_night_start_jd = sunset_jd + YAMAGANDAM_SLOTS[next_weekday] * night_slot_dur
    gl_night_start_jd = sunset_jd + GULIKA_SLOTS[next_weekday]     * night_slot_dur

    # ── 15-Muhurta Durmuhurtha ─────────────────────────────────────
    muhurta_dur   = (sunset_jd - sunrise_jd) / 15.0
    durm_slots    = DURMUHURTHA_SLOTS[weekday]
    durm_windows  = [
        {
            "start": jd_to_local_time_str(sunrise_jd + s * muhurta_dur, tz_offset),
            "end":   jd_to_local_time_str(sunrise_jd + (s + 1) * muhurta_dur, tz_offset),
        }
        for s in durm_slots
    ]

    # ── Abhijit Muhurtha (8th of 15 muhurtas, not on Wednesday) ────
    abhijit_start_jd = sunrise_jd + 7 * muhurta_dur
    abhijit_end_jd   = abhijit_start_jd + muhurta_dur
    abhijit_valid    = (weekday != 2)  # False on Wednesday

    # ── Brahma Muhurta (2 muhurtas = 96 min before sunrise) ────────
    brahma_start_jd = sunrise_jd - 96.0 / (24 * 60)
    brahma_end_jd   = sunrise_jd - 48.0 / (24 * 60)

    # ── Transition times (binary search) ────────────────────────────
    # PR A1.2a — start search 24h BEFORE sunrise so transitions that
    # happened in the wee hours but still affect today's panchang are
    # caught. Previously the search started at sunrise, which silently
    # returned None when the transition occurred just before sunrise
    # → frontend showed "no end time" for tithi/nakshatra/yoga.
    search_start = sunrise_jd - 1.0
    search_end   = sunrise_jd + 1.1
    tithi_ends_jd     = find_transition_jd(search_start, search_end, _moon_tithi_num)
    nakshatra_ends_jd = find_transition_jd(search_start, search_end, _moon_nak_num)
    yoga_ends_jd      = find_transition_jd(search_start, search_end, _yoga_num)
    # If a transition was found BEFORE sunrise, look forward for the NEXT
    # one (because that earlier transition is "yesterday's tithi ending").
    if tithi_ends_jd is not None and tithi_ends_jd < sunrise_jd:
        tithi_ends_jd     = find_transition_jd(sunrise_jd, search_end, _moon_tithi_num)
    if nakshatra_ends_jd is not None and nakshatra_ends_jd < sunrise_jd:
        nakshatra_ends_jd = find_transition_jd(sunrise_jd, search_end, _moon_nak_num)
    if yoga_ends_jd is not None and yoga_ends_jd < sunrise_jd:
        yoga_ends_jd      = find_transition_jd(sunrise_jd, search_end, _yoga_num)

    # ── Karana pair ──────────────────────────────────────────────────
    karana_pair = get_karana_pair(moon_lon, sun_lon, sunrise_jd, tz_offset)

    # ── Hora & Choghadiya ────────────────────────────────────────────
    choghadiya    = build_choghadiya(sunrise_jd, sunset_jd, weekday, tz_offset, now_jd)
    hora_sequence = build_hora_sequence(sunrise_jd, sunset_jd, weekday,
                                         tz_offset, now_jd,
                                         req.latitude, req.longitude,
                                         local_target)
    current_hora  = next((h for h in hora_sequence if h["is_current"]), hora_sequence[0])

    # ── Moon/Sun Rashi (sign) ────────────────────────────────────────
    moon_sign = SIGN_NAMES[int((moon_lon % 360) / 30)]
    sun_sign  = SIGN_NAMES[int((sun_lon  % 360) / 30)]

    # ── Moonrise / Moonset ──────────────────────────────────────────
    moonrise_jd, moonset_jd = get_moonrise_moonset_jd(jd_noon, req.latitude, req.longitude)

    # ── Telugu identity: Samvatsara, Ayana, Masa, Rutu ──────────────
    # PR A1.2a — use the date-aware samvatsara function so the year name
    # respects the Ugadi cutoff (March/April) instead of switching at Jan 1.
    samvatsara = get_samvatsara_for_date(local_target)
    samvatsara_te = samvatsara["te"]
    ayana_te      = get_ayana(sun_lon)
    masa_en, masa_te, rutu_te = get_masa_rutu(sun_sign)

    # PR A1.2c — Shaka year and Vikram Samvat.
    # Shaka era starts 78 CE; year N of Shaka = Gregorian N+78 (post-Ugadi)
    # Vikram Samvat starts 57 BCE; VS N = Gregorian N-57 (post-Ugadi)
    # Cutoff mirrors samvatsara (pre-Ugadi = previous year).
    greg_year = local_target.year
    if local_target.month < 3 or (local_target.month == 3 and local_target.day < 20):
        greg_year -= 1
    shaka_year = greg_year - 78
    vikram_samvat = greg_year + 57

    # PR A1.2c — tithi progress: elapsed fraction of the current tithi.
    # Each tithi = 12° of Moon-Sun angular separation. Within-tithi
    # progress = (diff % 12) / 12.
    tithi_progress_pct = round(((diff % 12) / 12.0) * 100, 1)

    # PR A1.2c — Varjyam and Amrit Kala windows.
    # Varjyam duration = 1h 36m = 0.0666... of a day.
    # Varjyam start = nakshatra_start_jd + fraction × nakshatra_duration.
    # Amrit Kala = Varjyam of the TRINE nakshatra (canonical simplification:
    # shifted by 12 hours, which is functionally an auspicious "complement
    # window" used in the same almanacs we cross-reference).
    VARJYAM_DUR_DAYS = 96.0 / (24 * 60)  # 1h 36m
    # Moon longitude at sunrise gave us the nakshatra; compute the start-of-
    # nakshatra moment by walking backward until moon crossed the 13°20′
    # boundary.
    nak_span = 360.0 / 27
    moon_pos_in_nak = (moon_lon % 360) % nak_span  # 0..13.333
    # Moon moves ~13.2°/day average — approximate start-time of current
    # nakshatra as sunrise_jd - (moon_pos_in_nak / 13.2 days).
    nak_start_jd = sunrise_jd - (moon_pos_in_nak / 13.2)
    nak_end_jd = nakshatra_ends_jd if nakshatra_ends_jd else nak_start_jd + (nak_span / 13.2)
    nak_dur = nak_end_jd - nak_start_jd
    varjyam_start_jd = nak_start_jd + VARJYAM_START_FRACTION[naks_num] * nak_dur
    varjyam_end_jd   = varjyam_start_jd + VARJYAM_DUR_DAYS
    # Amrit Kala = 12h after Varjyam start (classical complement heuristic).
    amrit_kala_start_jd = varjyam_start_jd + 0.5
    amrit_kala_end_jd   = amrit_kala_start_jd + VARJYAM_DUR_DAYS

    # PR A1.2c — Panchaka dosha check.
    panchaka_active = naks_num in PANCHAKA_NAKSHATRAS

    # PR A1.2d — Panchaka sub-type classification (weekday-based).
    # When Panchaka is active AND weekday matches, a named sub-type
    # activates that specifically blocks certain activity classes.
    panchaka_subtype = None
    panchaka_blocks = []
    if panchaka_active:
        panchaka_subtype = PANCHAKA_SUBTYPE_BY_WEEKDAY.get(weekday)
        # Both universally-blocked events AND the sub-type's own class
        panchaka_blocks = list(PANCHAKA_UNIVERSALLY_BLOCKED_EVENTS)
        if panchaka_subtype == "Raja":
            panchaka_blocks.append("legal")
        elif panchaka_subtype == "Agni":
            # Agni is already covered by the universal "travel/vahana"
            # blocks; add cooking/fire-adjacent events explicitly.
            panchaka_blocks.append("welding/electrical/fire-work")
        elif panchaka_subtype == "Chora":
            panchaka_blocks.append("investment")
            panchaka_blocks.append("vault/safe-deposit")
        elif panchaka_subtype == "Mrityu":
            # Mrityu Panchaka — avoid ALL auspicious events.
            # The universal list already covers the main ones.
            pass
        elif panchaka_subtype == "Roga":
            panchaka_blocks.append("medical")

    # PR A1.2c — Tithi Shunya check.
    tithi_shunya_active = tithi_num in TITHI_SHUNYA_BY_MASA.get(masa_en, [])

    return {
        "date":          target.strftime("%d/%m/%Y"),
        "timezone_offset": tz_offset,
        "timezone_name":   tz_name,
        # English names
        "vara_en":       DAY_EN[weekday],
        "tithi_en":      TITHIS_EN[min(tithi_num - 1, 29)],
        "tithi_num":     tithi_num,
        "tithi_ends_at": jd_to_local_time_str(tithi_ends_jd, tz_offset) if tithi_ends_jd else None,
        "nakshatra_en":  NAKSHATRA_NAMES_EN[naks_num],
        "nakshatra_pada": nakshatra_pada,
        "nakshatra_ends_at": jd_to_local_time_str(nakshatra_ends_jd, tz_offset) if nakshatra_ends_jd else None,
        "yoga_en":       YOGA_EN[yoga_num],
        # PR A1.2b — yoga quality so the UI can color malefic yogas red
        # (was always shown with the same green icon previously).
        "yoga_quality":  YOGA_QUALITY.get(YOGA_EN[yoga_num], "auspicious"),
        "yoga_ends_at":  jd_to_local_time_str(yoga_ends_jd, tz_offset) if yoga_ends_jd else None,
        "karana":        karana_pair["karana1"],
        "karana2":       karana_pair["karana2"],
        "karana_ends_at": karana_pair["karana1_ends"],
        # Telugu names
        "vara_te":       get_vara_telugu(weekday),
        "tithi_te":      get_tithi_telugu(tithi_num),
        "nakshatra_te":  get_nakshatra_telugu(naks_num),
        "yoga_te":       get_yoga_telugu(yoga_num),
        "karana_te":     get_karana_telugu(karana_pair["karana1"]),
        "karana2_te":    get_karana_telugu(karana_pair["karana2"]),
        # Telugu identity
        "samvatsara_te":      samvatsara_te,
        # PR A1.2a — richer samvatsara fields (used by the new compact display)
        "samvatsara_en":      samvatsara["en"],
        "samvatsara_meaning": samvatsara["meaning"],
        "samvatsara_cycle":   samvatsara["cycle_year"],
        "ayana_te":      ayana_te,
        "masa_en":       masa_en,
        "masa_te":       masa_te,
        "rutu_te":       rutu_te,
        # Signs
        "moon_sign":     moon_sign,
        "moon_sign_te":  SIGNS_TELUGU.get(moon_sign, moon_sign),
        "sun_sign":      sun_sign,
        "sun_sign_te":   SIGNS_TELUGU.get(sun_sign, sun_sign),
        # Celestial times
        "sunrise":       jd_to_local_time_str(sunrise_jd,  tz_offset),
        "sunset":        jd_to_local_time_str(sunset_jd,   tz_offset),
        "moonrise":      jd_to_local_time_str(moonrise_jd, tz_offset) if moonrise_jd else None,
        "moonset":       jd_to_local_time_str(moonset_jd,  tz_offset) if moonset_jd else None,
        # Inauspicious times
        "rahu_kalam":    f"{jd_to_local_time_str(rk_start_jd, tz_offset)}-{jd_to_local_time_str(rk_start_jd + slot_dur, tz_offset)}",
        "yamagandam":    f"{jd_to_local_time_str(yg_start_jd, tz_offset)}-{jd_to_local_time_str(yg_start_jd + slot_dur, tz_offset)}",
        "gulika_kalam":  f"{jd_to_local_time_str(gl_start_jd, tz_offset)}-{jd_to_local_time_str(gl_start_jd + slot_dur, tz_offset)}",
        # PR A1.2c — Night Kalam windows (sunset → next sunrise, 8 slots).
        "rahu_kalam_night":   f"{jd_to_local_time_str(rk_night_start_jd, tz_offset)}-{jd_to_local_time_str(rk_night_start_jd + night_slot_dur, tz_offset)}",
        "yamagandam_night":   f"{jd_to_local_time_str(yg_night_start_jd, tz_offset)}-{jd_to_local_time_str(yg_night_start_jd + night_slot_dur, tz_offset)}",
        "gulika_kalam_night": f"{jd_to_local_time_str(gl_night_start_jd, tz_offset)}-{jd_to_local_time_str(gl_night_start_jd + night_slot_dur, tz_offset)}",
        # PR A1.2c — Varjyam (avoid) and Amrit Kala (auspicious) windows.
        "varjyam":       f"{jd_to_local_time_str(varjyam_start_jd, tz_offset)}-{jd_to_local_time_str(varjyam_end_jd, tz_offset)}",
        "amrit_kala":    f"{jd_to_local_time_str(amrit_kala_start_jd, tz_offset)}-{jd_to_local_time_str(amrit_kala_end_jd, tz_offset)}",
        # PR A1.2c — Tithi progress (0-100% within current tithi)
        "tithi_progress_pct": tithi_progress_pct,
        # PR A1.2c — Shaka year + Vikram Samvat
        "shaka_year":    shaka_year,
        "vikram_samvat": vikram_samvat,
        # PR A1.2c — Panchaka + Tithi Shunya doshas
        "panchaka_active":     panchaka_active,
        # PR A1.2d — Panchaka sub-type + event-block list
        "panchaka_subtype":    panchaka_subtype,
        "panchaka_blocks":     panchaka_blocks,
        "tithi_shunya_active": tithi_shunya_active,
        "durmuhurtha":   durm_windows,
        "abhijit_muhurtha": {
            "start": jd_to_local_time_str(abhijit_start_jd, tz_offset),
            "end":   jd_to_local_time_str(abhijit_end_jd,   tz_offset),
            "valid": abhijit_valid,
        },
        # Moon illumination
        "moon_illum_pct": moon_illum_pct,
        # Brahma Muhurta
        "brahma_muhurta": {
            "start": jd_to_local_time_str(brahma_start_jd, tz_offset),
            "end":   jd_to_local_time_str(brahma_end_jd,   tz_offset),
        },
        # Hora & Choghadiya
        "hora_lord":     current_hora["lord"],
        "current_hora":  current_hora,
        "choghadiya":    choghadiya,
        "hora_sequence": hora_sequence,
        # Timing helpers for frontend clock accuracy
        "now_local_time":     jd_to_local_time_short(now_jd, tz_offset),
        "day_duration_min":   round((sunset_jd - sunrise_jd) * 24 * 60, 1),
        "night_duration_min": round((1.0 - (sunset_jd - sunrise_jd)) * 24 * 60, 1),
    }


# ── Monthly Calendar Endpoint ─────────────────────────────────────────

@router.post("/calendar")
@_with_swe_lock  # PR A1.3-fix-24 — set_topo race protection
def get_monthly_calendar(req: CalendarRequest):
    """
    Return daily panchang for every day in a given month.
    Uses true sunrise for each day; tithi/nakshatra at sunrise.
    Returns array of day objects with transition time support.
    """
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    swe.set_topo(req.longitude, req.latitude, 0)

    # Resolve actual timezone from coordinates
    tz_offset, tz_name = resolve_timezone(
        req.latitude, req.longitude, datetime(req.year, req.month, 15))

    today_local = (datetime.now(timezone.utc) + timedelta(hours=tz_offset)).date()
    today_str = today_local.strftime("%Y-%m-%d")

    days_in_month = calendar_module.monthrange(req.year, req.month)[1]
    result = []

    for day in range(1, days_in_month + 1):
        local_d = date_type(req.year, req.month, day)
        date_str = local_d.strftime("%Y-%m-%d")

        # Julian Day at noon local → UT (used as search window center)
        jd_noon = swe.julday(req.year, req.month, day, 12.0 - tz_offset)

        # PR A1.2a — pass local_date directly so date math is unambiguous.
        sunrise_jd, sunset_jd = get_sunrise_sunset_jd(
            local_d, req.latitude, req.longitude, tz_offset,
        )
        sunrise_str = jd_to_local_time_str(sunrise_jd, tz_offset)
        sunset_str  = jd_to_local_time_str(sunset_jd, tz_offset)

        # Moon & Sun at SUNRISE (traditional rule)
        moon_lon = swe.calc_ut(sunrise_jd, swe.MOON, _CALC_FLAGS)[0][0]
        sun_lon  = swe.calc_ut(sunrise_jd, swe.SUN,  _CALC_FLAGS)[0][0]

        diff      = (moon_lon - sun_lon) % 360
        tithi_num = int(diff / 12) + 1
        naks_num  = int((moon_lon % 360) / (360 / 27))
        nakshatra_pada = int((moon_lon % (360 / 27)) / (360 / 108)) + 1
        yoga_num  = int(((sun_lon + moon_lon) % 360) / (360 / 27)) % 27

        # PR A1.2a — same expanded search window as /location.
        cal_search_start = sunrise_jd - 1.0
        cal_search_end   = sunrise_jd + 1.1
        tithi_ends_jd     = find_transition_jd(cal_search_start, cal_search_end, _moon_tithi_num)
        nakshatra_ends_jd = find_transition_jd(cal_search_start, cal_search_end, _moon_nak_num)
        if tithi_ends_jd is not None and tithi_ends_jd < sunrise_jd:
            tithi_ends_jd     = find_transition_jd(sunrise_jd, cal_search_end, _moon_tithi_num)
        if nakshatra_ends_jd is not None and nakshatra_ends_jd < sunrise_jd:
            nakshatra_ends_jd = find_transition_jd(sunrise_jd, cal_search_end, _moon_nak_num)

        # Moon phase
        moon_phase = "waxing"
        if tithi_num == 15:   moon_phase = "full"
        elif tithi_num == 30: moon_phase = "new"
        elif tithi_num > 15:  moon_phase = "waning"

        # PR A1.2b — was `dt.weekday()` referencing a stale name from
        # before A1.2a renamed the loop variable. Use the local_d we
        # actually have in scope.
        weekday = local_d.weekday()

        result.append({
            "date":          date_str,
            "day":           day,
            "weekday":       weekday,
            "vara_en":       DAY_EN[weekday],
            "vara_te":       get_vara_telugu(weekday),
            "tithi_en":      TITHIS_EN[min(tithi_num - 1, 29)],
            "tithi_num":     tithi_num,
            "tithi_te":      get_tithi_telugu(tithi_num),
            "tithi_short":   get_tithi_short(tithi_num),
            "tithi_ends_at": jd_to_local_time_short(tithi_ends_jd, tz_offset) if tithi_ends_jd else None,
            "nakshatra_en":  NAKSHATRA_NAMES_EN[naks_num],
            "nakshatra_te":  get_nakshatra_telugu(naks_num),
            "nakshatra_short": get_nakshatra_short(naks_num),
            "nakshatra_pada": nakshatra_pada,
            "nakshatra_ends_at": jd_to_local_time_short(nakshatra_ends_jd, tz_offset) if nakshatra_ends_jd else None,
            "yoga_en":       YOGA_EN[yoga_num],
            "yoga_te":       get_yoga_telugu(yoga_num),
            "karana":        get_karana_name(moon_lon, sun_lon),
            "sunrise":       sunrise_str,
            "sunset":        sunset_str,
            "moon_phase":    moon_phase,
            "moon_phase_icon": get_moon_phase_icon(tithi_num),
            "special":       get_special_marker(tithi_num),
            "is_today":      date_str == today_str,
        })

    # Month-level identity from first day's sun position
    first_sun_lon = swe.calc_ut(
        swe.julday(req.year, req.month, 15, 12.0 - tz_offset),
        swe.SUN, swe.FLG_SIDEREAL
    )[0][0]
    month_sun_sign = SIGN_NAMES[int((first_sun_lon % 360) / 30)]
    masa_en, masa_te, _ = get_masa_rutu(month_sun_sign)
    # PR A1.2a — date-aware samvatsara (mid-month is a safe label anchor).
    samvatsara = get_samvatsara_for_date(date_type(req.year, req.month, 15))

    return {
        "year": req.year, "month": req.month, "days": result,
        "timezone_offset": tz_offset,
        "timezone_name": tz_name,
        "samvatsara_te":      samvatsara["te"],
        "samvatsara_en":      samvatsara["en"],
        "samvatsara_meaning": samvatsara["meaning"],
        "samvatsara_cycle":   samvatsara["cycle_year"],
        "masa_te": masa_te,
        "masa_en": masa_en,
        "sun_sign_te": SIGNS_TELUGU.get(month_sun_sign, month_sun_sign),
    }

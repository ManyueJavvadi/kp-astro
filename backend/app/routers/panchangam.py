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
from pydantic import BaseModel
from datetime import datetime, timedelta, date as date_type
import calendar as calendar_module
from typing import Optional, List
import math
import swisseph as swe

from app.services.telugu_terms import (
    NAKSHATRAS_TELUGU, TITHIS_TELUGU, YOGAS_TELUGU,
    KARANAS_TELUGU, DAYS_TELUGU, TELUGU_YEARS, TELUGU_MONTHS,
    SIGNS_TELUGU,
)

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
DAY_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

RAHU_KALAM_SLOTS  = {0: 1, 1: 6, 2: 4, 3: 5, 4: 3, 5: 2, 6: 7}
YAMAGANDAM_SLOTS  = {0: 4, 1: 3, 2: 2, 3: 1, 4: 0, 5: 6, 6: 5}
GULIKA_SLOTS      = {0: 6, 1: 5, 2: 4, 3: 3, 4: 2, 5: 1, 6: 0}

# Durmuhurtha: two 1/15-day (1 muhurta) slots per weekday (0-indexed from sunrise)
DURMUHURTHA_SLOTS = {
    0: [6, 7],   # Monday
    1: [4, 7],   # Tuesday
    2: [5, 7],   # Wednesday
    3: [5, 7],   # Thursday
    4: [2, 7],   # Friday
    5: [7, 8],   # Saturday
    6: [2, 6],   # Sunday
}

CHARA_KARANAS_EN = ["Bava", "Balava", "Kaulava", "Taitula", "Garija", "Vanija", "Vishti"]

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


def get_sunrise_sunset_jd(date_jd: float, lat: float, lon: float) -> tuple:
    """
    True observed sunrise/sunset: upper limb of Sun + atmospheric refraction.
    (NOT disc center — that would be geometric sunrise, 2-3 min later than observed)
    """
    geopos = (lon, lat, 0.0)
    try:
        _, tret = swe.rise_trans(
            date_jd - 0.5, swe.SUN, b"", 0,
            swe.CALC_RISE,  # upper limb + refraction (no BIT_DISC_CENTER)
            geopos, 1013.25, 10.0
        )
        sunrise_jd = tret[0]
        _, tret2 = swe.rise_trans(
            sunrise_jd, swe.SUN, b"", 0,
            swe.CALC_SET,   # upper limb + refraction
            geopos, 1013.25, 10.0
        )
        sunset_jd = tret2[0]
        return sunrise_jd, sunset_jd
    except Exception:
        return date_jd - 0.25, date_jd + 0.25


def get_next_sunrise_jd(sunset_jd: float, lat: float, lon: float) -> float:
    """Get the next sunrise JD after a given sunset JD (for proportional hora)."""
    geopos = (lon, lat, 0.0)
    try:
        _, tret = swe.rise_trans(
            sunset_jd, swe.SUN, b"", 0,
            swe.CALC_RISE,
            geopos, 1013.25, 10.0
        )
        return tret[0]
    except Exception:
        return sunset_jd + 0.5  # fallback: ~12 hours later


def get_moonrise_moonset_jd(date_jd: float, lat: float, lon: float):
    """Moonrise and moonset for the day. Returns (moonrise_jd, moonset_jd) or None for each."""
    geopos = (lon, lat, 0.0)
    moonrise_jd = None
    moonset_jd = None
    try:
        _, tret = swe.rise_trans(
            date_jd - 0.5, swe.MOON, b"", 0,
            swe.CALC_RISE, geopos, 1013.25, 10.0
        )
        moonrise_jd = tret[0]
    except Exception:
        pass
    try:
        _, tret2 = swe.rise_trans(
            date_jd - 0.5, swe.MOON, b"", 0,
            swe.CALC_SET, geopos, 1013.25, 10.0
        )
        moonset_jd = tret2[0]
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
            m = swe.calc_ut(jd, swe.MOON, _MOON_FLAGS)[0][0]
            s = swe.calc_ut(jd, swe.SUN,  swe.FLG_SIDEREAL)[0][0]
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

_MOON_FLAGS = swe.FLG_SIDEREAL | swe.FLG_TOPOCTR

def _moon_tithi_num(jd: float) -> int:
    moon = swe.calc_ut(jd, swe.MOON, _MOON_FLAGS)[0][0]
    sun  = swe.calc_ut(jd, swe.SUN,  swe.FLG_SIDEREAL)[0][0]
    return int(((moon - sun) % 360) / 12)

def _moon_nak_num(jd: float) -> int:
    moon = swe.calc_ut(jd, swe.MOON, _MOON_FLAGS)[0][0]
    return int((moon % 360) / (360 / 27))

def _yoga_num(jd: float) -> int:
    moon = swe.calc_ut(jd, swe.MOON, _MOON_FLAGS)[0][0]
    sun  = swe.calc_ut(jd, swe.SUN,  swe.FLG_SIDEREAL)[0][0]
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
                         lat: float, lon: float) -> list:
    """
    24 proportional planetary hours: 12 day + 12 night.
    Day hora = (sunset-sunrise)/12. Night hora = (next_sunrise-sunset)/12.
    (NOT fixed 1-hour slots — those are wrong for any non-equinox location.)
    """
    next_sunrise_jd = get_next_sunrise_jd(sunset_jd, lat, lon)
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


def get_samvatsara(year: int) -> str:
    """60-year cycle samvatsara name in Telugu."""
    idx = (year + 3101 - 1) % 60
    return TELUGU_YEARS[idx] if idx < len(TELUGU_YEARS) else ""


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

class PanchangamLocationRequest(BaseModel):
    latitude: float
    longitude: float
    timezone_offset: float = 5.5
    date: Optional[str] = None   # YYYY-MM-DD, defaults to today


class CalendarRequest(BaseModel):
    latitude: float
    longitude: float
    timezone_offset: float = 5.5
    year: int
    month: int  # 1-12


# ── Main Location Endpoint ───────────────────────────────────────────

@router.post("/location")
def get_location_panchangam(req: PanchangamLocationRequest):
    """
    Calculate today's (or given date's) Panchangam for any geographic location.
    Returns full panchang + choghadiya + hora sequence.
    All values based on TRUE sunrise (upper limb + refraction).
    Tithi/Nakshatra/Yoga computed at sunrise (traditional rule: "tithi of the day = tithi at sunrise").
    """
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    swe.set_topo(req.longitude, req.latitude, 0)

    # Resolve target date
    if req.date:
        target = datetime.strptime(req.date, "%Y-%m-%d")
    else:
        utc_now = datetime.utcnow()
        target  = utc_now + timedelta(hours=req.timezone_offset)
        target  = target.replace(hour=12, minute=0, second=0, microsecond=0)

    # Julian Day at noon on target date (UTC) — used only for sunrise search window
    jd_noon = swe.julday(target.year, target.month, target.day,
                          12.0 - req.timezone_offset)

    # Current moment as JD (UT)
    _now = datetime.utcnow()
    now_jd = swe.julday(_now.year, _now.month, _now.day,
                         _now.hour + _now.minute / 60.0 + _now.second / 3600.0)

    # ── Sunrise / Sunset ──────────────────────────────────────────
    sunrise_jd, sunset_jd = get_sunrise_sunset_jd(jd_noon, req.latitude, req.longitude)

    # ── Planet positions AT SUNRISE (traditional rule) ─────────────
    moon_lon = swe.calc_ut(sunrise_jd, swe.MOON, _MOON_FLAGS)[0][0]
    sun_lon  = swe.calc_ut(sunrise_jd, swe.SUN,  swe.FLG_SIDEREAL)[0][0]

    diff      = (moon_lon - sun_lon) % 360
    tithi_num = int(diff / 12) + 1
    naks_num  = int((moon_lon % 360) / (360 / 27))
    nakshatra_pada = int((moon_lon % (360 / 27)) / (360 / 108)) + 1  # 1-4
    yoga_num  = int(((sun_lon + moon_lon) % 360) / (360 / 27)) % 27
    weekday   = target.weekday()

    # Moon illumination percentage (visual appearance)
    diff_rad = math.radians(diff)
    moon_illum_pct = round((1 - math.cos(diff_rad)) / 2 * 100, 1)

    # ── 8-Slot Kalam windows (Rahu/Yama/Gulika) ────────────────────
    slot_dur    = (sunset_jd - sunrise_jd) / 8.0
    rk_start_jd = sunrise_jd + RAHU_KALAM_SLOTS[weekday]  * slot_dur
    yg_start_jd = sunrise_jd + YAMAGANDAM_SLOTS[weekday]  * slot_dur
    gl_start_jd = sunrise_jd + GULIKA_SLOTS[weekday]      * slot_dur

    # ── 15-Muhurta Durmuhurtha ─────────────────────────────────────
    muhurta_dur   = (sunset_jd - sunrise_jd) / 15.0
    durm_slots    = DURMUHURTHA_SLOTS[weekday]
    durm_windows  = [
        {
            "start": jd_to_local_time_str(sunrise_jd + s * muhurta_dur, req.timezone_offset),
            "end":   jd_to_local_time_str(sunrise_jd + (s + 1) * muhurta_dur, req.timezone_offset),
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
    search_end = sunrise_jd + 1.1  # search until ~1 day ahead
    tithi_ends_jd     = find_transition_jd(sunrise_jd, search_end, _moon_tithi_num)
    nakshatra_ends_jd = find_transition_jd(sunrise_jd, search_end, _moon_nak_num)
    yoga_ends_jd      = find_transition_jd(sunrise_jd, search_end, _yoga_num)

    # ── Karana pair ──────────────────────────────────────────────────
    karana_pair = get_karana_pair(moon_lon, sun_lon, sunrise_jd, req.timezone_offset)

    # ── Hora & Choghadiya ────────────────────────────────────────────
    choghadiya    = build_choghadiya(sunrise_jd, sunset_jd, weekday, req.timezone_offset, now_jd)
    hora_sequence = build_hora_sequence(sunrise_jd, sunset_jd, weekday,
                                         req.timezone_offset, now_jd,
                                         req.latitude, req.longitude)
    current_hora  = next((h for h in hora_sequence if h["is_current"]), hora_sequence[0])

    # ── Moon/Sun Rashi (sign) ────────────────────────────────────────
    moon_sign = SIGN_NAMES[int((moon_lon % 360) / 30)]
    sun_sign  = SIGN_NAMES[int((sun_lon  % 360) / 30)]

    # ── Moonrise / Moonset ──────────────────────────────────────────
    moonrise_jd, moonset_jd = get_moonrise_moonset_jd(jd_noon, req.latitude, req.longitude)

    # ── Telugu identity: Samvatsara, Ayana, Masa, Rutu ──────────────
    samvatsara_te = get_samvatsara(target.year)
    ayana_te      = get_ayana(sun_lon)
    masa_en, masa_te, rutu_te = get_masa_rutu(sun_sign)

    return {
        "date":          target.strftime("%d/%m/%Y"),
        # English names
        "vara_en":       DAY_EN[weekday],
        "tithi_en":      TITHIS_EN[min(tithi_num - 1, 29)],
        "tithi_num":     tithi_num,
        "tithi_ends_at": jd_to_local_time_str(tithi_ends_jd, req.timezone_offset) if tithi_ends_jd else None,
        "nakshatra_en":  NAKSHATRA_NAMES_EN[naks_num],
        "nakshatra_pada": nakshatra_pada,
        "nakshatra_ends_at": jd_to_local_time_str(nakshatra_ends_jd, req.timezone_offset) if nakshatra_ends_jd else None,
        "yoga_en":       YOGA_EN[yoga_num],
        "yoga_ends_at":  jd_to_local_time_str(yoga_ends_jd, req.timezone_offset) if yoga_ends_jd else None,
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
        "samvatsara_te": samvatsara_te,
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
        "sunrise":       jd_to_local_time_str(sunrise_jd,  req.timezone_offset),
        "sunset":        jd_to_local_time_str(sunset_jd,   req.timezone_offset),
        "moonrise":      jd_to_local_time_str(moonrise_jd, req.timezone_offset) if moonrise_jd else None,
        "moonset":       jd_to_local_time_str(moonset_jd,  req.timezone_offset) if moonset_jd else None,
        # Inauspicious times
        "rahu_kalam":    f"{jd_to_local_time_str(rk_start_jd, req.timezone_offset)}-{jd_to_local_time_str(rk_start_jd + slot_dur, req.timezone_offset)}",
        "yamagandam":    f"{jd_to_local_time_str(yg_start_jd, req.timezone_offset)}-{jd_to_local_time_str(yg_start_jd + slot_dur, req.timezone_offset)}",
        "gulika_kalam":  f"{jd_to_local_time_str(gl_start_jd, req.timezone_offset)}-{jd_to_local_time_str(gl_start_jd + slot_dur, req.timezone_offset)}",
        "durmuhurtha":   durm_windows,
        "abhijit_muhurtha": {
            "start": jd_to_local_time_str(abhijit_start_jd, req.timezone_offset),
            "end":   jd_to_local_time_str(abhijit_end_jd,   req.timezone_offset),
            "valid": abhijit_valid,
        },
        # Moon illumination
        "moon_illum_pct": moon_illum_pct,
        # Brahma Muhurta
        "brahma_muhurta": {
            "start": jd_to_local_time_str(brahma_start_jd, req.timezone_offset),
            "end":   jd_to_local_time_str(brahma_end_jd,   req.timezone_offset),
        },
        # Hora & Choghadiya
        "hora_lord":     current_hora["lord"],
        "current_hora":  current_hora,
        "choghadiya":    choghadiya,
        "hora_sequence": hora_sequence,
        # Timing helpers for frontend clock accuracy
        "now_local_time":     jd_to_local_time_short(now_jd, req.timezone_offset),
        "day_duration_min":   round((sunset_jd - sunrise_jd) * 24 * 60, 1),
        "night_duration_min": round((1.0 - (sunset_jd - sunrise_jd)) * 24 * 60, 1),
    }


# ── Monthly Calendar Endpoint ─────────────────────────────────────────

@router.post("/calendar")
def get_monthly_calendar(req: CalendarRequest):
    """
    Return daily panchang for every day in a given month.
    Uses true sunrise for each day; tithi/nakshatra at sunrise.
    Returns array of day objects with transition time support.
    """
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    swe.set_topo(req.longitude, req.latitude, 0)

    today_utc = datetime.utcnow() + timedelta(hours=req.timezone_offset)
    today_str = today_utc.strftime("%Y-%m-%d")

    days_in_month = calendar_module.monthrange(req.year, req.month)[1]
    result = []
    geopos = (req.longitude, req.latitude, 0.0)

    for day in range(1, days_in_month + 1):
        dt = datetime(req.year, req.month, day)
        date_str = dt.strftime("%Y-%m-%d")

        # Julian Day at noon local → UT (used as search window center)
        jd_noon = swe.julday(req.year, req.month, day, 12.0 - req.timezone_offset)

        # True sunrise for this day
        try:
            _, tret_r = swe.rise_trans(jd_noon - 0.5, swe.SUN, b"", 0,
                                       swe.CALC_RISE, geopos, 1013.25, 10.0)
            sunrise_jd = tret_r[0]
            _, tret_s = swe.rise_trans(sunrise_jd, swe.SUN, b"", 0,
                                       swe.CALC_SET, geopos, 1013.25, 10.0)
            sunset_jd = tret_s[0]
            sunrise_str = jd_to_local_time_str(sunrise_jd, req.timezone_offset)
            sunset_str  = jd_to_local_time_str(sunset_jd,  req.timezone_offset)
        except Exception:
            sunrise_jd  = jd_noon - 0.25
            sunset_jd   = jd_noon + 0.25
            sunrise_str = "—"
            sunset_str  = "—"

        # Moon & Sun at SUNRISE (traditional rule)
        moon_lon = swe.calc_ut(sunrise_jd, swe.MOON, _MOON_FLAGS)[0][0]
        sun_lon  = swe.calc_ut(sunrise_jd, swe.SUN,  swe.FLG_SIDEREAL)[0][0]

        diff      = (moon_lon - sun_lon) % 360
        tithi_num = int(diff / 12) + 1
        naks_num  = int((moon_lon % 360) / (360 / 27))
        nakshatra_pada = int((moon_lon % (360 / 27)) / (360 / 108)) + 1
        yoga_num  = int(((sun_lon + moon_lon) % 360) / (360 / 27)) % 27

        # Tithi/Nakshatra transition times
        tithi_ends_jd     = find_transition_jd(sunrise_jd, sunrise_jd + 1.1, _moon_tithi_num)
        nakshatra_ends_jd = find_transition_jd(sunrise_jd, sunrise_jd + 1.1, _moon_nak_num)

        # Moon phase
        moon_phase = "waxing"
        if tithi_num == 15:   moon_phase = "full"
        elif tithi_num == 30: moon_phase = "new"
        elif tithi_num > 15:  moon_phase = "waning"

        weekday = dt.weekday()

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
            "tithi_ends_at": jd_to_local_time_short(tithi_ends_jd, req.timezone_offset) if tithi_ends_jd else None,
            "nakshatra_en":  NAKSHATRA_NAMES_EN[naks_num],
            "nakshatra_te":  get_nakshatra_telugu(naks_num),
            "nakshatra_short": get_nakshatra_short(naks_num),
            "nakshatra_pada": nakshatra_pada,
            "nakshatra_ends_at": jd_to_local_time_short(nakshatra_ends_jd, req.timezone_offset) if nakshatra_ends_jd else None,
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
        swe.julday(req.year, req.month, 15, 12.0 - req.timezone_offset),
        swe.SUN, swe.FLG_SIDEREAL
    )[0][0]
    month_sun_sign = SIGN_NAMES[int((first_sun_lon % 360) / 30)]
    masa_en, masa_te, _ = get_masa_rutu(month_sun_sign)
    samvatsara_te = get_samvatsara(req.year)

    return {
        "year": req.year, "month": req.month, "days": result,
        "samvatsara_te": samvatsara_te,
        "masa_te": masa_te,
        "masa_en": masa_en,
        "sun_sign_te": SIGNS_TELUGU.get(month_sun_sign, month_sun_sign),
    }

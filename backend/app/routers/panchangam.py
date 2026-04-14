"""
Panchangam router — location-based Panchangam endpoint.
Allows frontend to fetch Panchang for any coordinates (current user location,
not just birth location), and returns Choghadiya + Hora sequence.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timedelta, date as date_type
from typing import Optional
import swisseph as swe

router = APIRouter()

# ── Constants (shared with astrologer.py) ───────────────────────

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

RAHU_KALAM_SLOTS = {0: 1, 1: 6, 2: 4, 3: 5, 4: 3, 5: 2, 6: 7}
YAMAGANDAM_SLOTS  = {0: 4, 1: 3, 2: 2, 3: 1, 4: 0, 5: 6, 6: 5}

CHARA_KARANAS_EN = ["Bava", "Balava", "Kaulava", "Taitula", "Garija", "Vanija", "Vishti"]

# Hora lords: Sun→Venus→Mercury→Moon→Saturn→Jupiter→Mars (repeating)
HORA_LORDS = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"]
DAY_HORA_START = {0: 3, 1: 6, 2: 2, 3: 5, 4: 1, 5: 4, 6: 0}  # 0=Mon, 6=Sun

# Choghadiya day sequence starting from weekday lord
# Order: day starts from this index into CHOGHADIYA_NAMES
CHOGHADIYA_DAY_SEQ = {
    0: ["Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Chal", "Labh", "Amrit"],  # Mon
    1: ["Rog", "Udveg", "Chal", "Labh", "Amrit", "Kaal", "Shubh", "Rog"],   # Tue
    2: ["Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Chal", "Labh"],  # Wed
    3: ["Shubh", "Rog", "Udveg", "Chal", "Labh", "Amrit", "Kaal", "Shubh"], # Thu
    4: ["Chal", "Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Chal"],  # Fri
    5: ["Kaal", "Shubh", "Rog", "Udveg", "Chal", "Labh", "Amrit", "Kaal"],  # Sat
    6: ["Udveg", "Chal", "Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg"], # Sun
}
CHOGHADIYA_NIGHT_SEQ = {
    0: ["Chal", "Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Chal"],  # Mon
    1: ["Kaal", "Shubh", "Rog", "Udveg", "Chal", "Labh", "Amrit", "Kaal"],  # Tue
    2: ["Udveg", "Chal", "Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg"], # Wed
    3: ["Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Chal", "Labh", "Amrit"], # Thu
    4: ["Rog", "Udveg", "Chal", "Labh", "Amrit", "Kaal", "Shubh", "Rog"],   # Fri
    5: ["Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Chal", "Labh"],  # Sat
    6: ["Shubh", "Rog", "Udveg", "Chal", "Labh", "Amrit", "Kaal", "Shubh"], # Sun
}

CHOGHADIYA_QUALITY = {
    "Amrit": "auspicious", "Shubh": "auspicious", "Labh": "auspicious",
    "Chal": "neutral",
    "Rog": "inauspicious", "Kaal": "inauspicious", "Udveg": "inauspicious",
}


# ── Helpers ─────────────────────────────────────────────────────

def jd_to_local_time_str(jd: float, tz_offset: float) -> str:
    unix_seconds = (jd - 2440588.5) * 86400
    dt_utc = datetime(1970, 1, 1) + timedelta(seconds=unix_seconds)
    dt_local = dt_utc + timedelta(hours=tz_offset)
    return dt_local.strftime("%H:%M")


def get_sunrise_sunset_jd(date_jd: float, lat: float, lon: float) -> tuple:
    geopos = (lon, lat, 0.0)
    try:
        _, tret = swe.rise_trans(
            date_jd - 0.5, swe.SUN, b"", 0,
            swe.CALC_RISE | swe.BIT_DISC_CENTER,
            geopos, 1013.25, 10.0
        )
        sunrise_jd = tret[1]
        _, tret2 = swe.rise_trans(
            sunrise_jd, swe.SUN, b"", 0,
            swe.CALC_SET | swe.BIT_DISC_CENTER,
            geopos, 1013.25, 10.0
        )
        sunset_jd = tret2[1]
        return sunrise_jd, sunset_jd
    except Exception:
        return date_jd - 0.25, date_jd + 0.25


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


def build_choghadiya(sunrise_jd: float, sunset_jd: float, weekday: int,
                      tz_offset: float, now_jd: float) -> list:
    """Build full day+night choghadiya period list."""
    periods = []
    day_duration = (sunset_jd - sunrise_jd) / 8.0
    night_total = 1.0 - (sunset_jd - sunrise_jd)  # remainder = night
    night_duration = night_total / 8.0

    day_names   = CHOGHADIYA_DAY_SEQ.get(weekday, CHOGHADIYA_DAY_SEQ[0])
    night_names = CHOGHADIYA_NIGHT_SEQ.get(weekday, CHOGHADIYA_NIGHT_SEQ[0])

    for i, name in enumerate(day_names):
        s = sunrise_jd + i * day_duration
        e = s + day_duration
        periods.append({
            "name": name,
            "quality": CHOGHADIYA_QUALITY.get(name, "neutral"),
            "start": jd_to_local_time_str(s, tz_offset),
            "end":   jd_to_local_time_str(e, tz_offset),
            "is_current": s <= now_jd < e,
            "is_day": True,
        })

    for i, name in enumerate(night_names):
        s = sunset_jd + i * night_duration
        e = s + night_duration
        periods.append({
            "name": name,
            "quality": CHOGHADIYA_QUALITY.get(name, "neutral"),
            "start": jd_to_local_time_str(s, tz_offset),
            "end":   jd_to_local_time_str(e, tz_offset),
            "is_current": s <= now_jd < e,
            "is_day": False,
        })
    return periods


def build_hora_sequence(sunrise_jd: float, weekday: int,
                         tz_offset: float, now_jd: float) -> list:
    """24 planetary hours starting from sunrise."""
    start_idx = DAY_HORA_START[weekday]
    periods = []
    for i in range(24):
        s = sunrise_jd + i / 24.0
        e = s + 1 / 24.0
        lord = HORA_LORDS[(start_idx + i) % 7]
        periods.append({
            "lord": lord,
            "start": jd_to_local_time_str(s, tz_offset),
            "end":   jd_to_local_time_str(e, tz_offset),
            "is_current": s <= now_jd < e,
            "is_auspicious": lord in ("Jupiter", "Venus", "Mercury"),
        })
    return periods


# ── Request / Response ────────────────────────────────────────────

class PanchangamLocationRequest(BaseModel):
    latitude: float
    longitude: float
    timezone_offset: float = 5.5
    date: Optional[str] = None   # YYYY-MM-DD, defaults to today


@router.post("/location")
def get_location_panchangam(req: PanchangamLocationRequest):
    """
    Calculate today's (or given date's) Panchangam for any geographic location.
    Returns full panchang + choghadiya + hora sequence.
    """
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)

    # Resolve target date
    if req.date:
        target = datetime.strptime(req.date, "%Y-%m-%d")
    else:
        # Today in the target timezone
        utc_now = datetime.utcnow()
        target = utc_now + timedelta(hours=req.timezone_offset)
        target = target.replace(hour=12, minute=0, second=0, microsecond=0)

    # Julian Day at noon on target date (UTC)
    jd_noon = swe.julday(target.year, target.month, target.day,
                          12.0 - req.timezone_offset)

    # Current moment as JD
    now_jd = swe.julday(*datetime.utcnow().timetuple()[:3],
                         datetime.utcnow().hour + datetime.utcnow().minute / 60.0)

    # Planet positions
    moon_lon = swe.calc_ut(jd_noon, swe.MOON, swe.FLG_SIDEREAL)[0][0]
    sun_lon  = swe.calc_ut(jd_noon, swe.SUN,  swe.FLG_SIDEREAL)[0][0]

    diff      = (moon_lon - sun_lon) % 360
    tithi_num = int(diff / 12) + 1
    naks_num  = int((moon_lon % 360) / (360 / 27))
    yoga_num  = int(((sun_lon + moon_lon) % 360) / (360 / 27)) % 27
    weekday   = target.weekday()  # 0=Mon

    # Sunrise / sunset
    sunrise_jd, sunset_jd = get_sunrise_sunset_jd(jd_noon, req.latitude, req.longitude)
    slot_dur = (sunset_jd - sunrise_jd) / 8.0

    rk_slot = RAHU_KALAM_SLOTS[weekday]
    rk_start_jd = sunrise_jd + rk_slot * slot_dur
    rk_end_jd   = rk_start_jd + slot_dur

    yg_slot = YAMAGANDAM_SLOTS[weekday]
    yg_start_jd = sunrise_jd + yg_slot * slot_dur
    yg_end_jd   = yg_start_jd + slot_dur

    # Hora & Choghadiya
    choghadiya   = build_choghadiya(sunrise_jd, sunset_jd, weekday, req.timezone_offset, now_jd)
    hora_sequence = build_hora_sequence(sunrise_jd, weekday, req.timezone_offset, now_jd)
    current_hora  = next((h for h in hora_sequence if h["is_current"]), hora_sequence[0])

    return {
        "date":         target.strftime("%d/%m/%Y"),
        "vara_en":      DAY_EN[weekday],
        "tithi_en":     TITHIS_EN[min(tithi_num - 1, 29)],
        "tithi_num":    tithi_num,
        "nakshatra_en": NAKSHATRA_NAMES_EN[naks_num],
        "yoga_en":      YOGA_EN[yoga_num],
        "karana":       get_karana_name(moon_lon, sun_lon),
        "sunrise":      jd_to_local_time_str(sunrise_jd, req.timezone_offset),
        "sunset":       jd_to_local_time_str(sunset_jd,  req.timezone_offset),
        "rahu_kalam":   f"{jd_to_local_time_str(rk_start_jd, req.timezone_offset)}-{jd_to_local_time_str(rk_end_jd, req.timezone_offset)}",
        "yamagandam":   f"{jd_to_local_time_str(yg_start_jd, req.timezone_offset)}-{jd_to_local_time_str(yg_end_jd, req.timezone_offset)}",
        "hora_lord":    current_hora["lord"],
        "current_hora": current_hora,
        "choghadiya":   choghadiya,
        "hora_sequence": hora_sequence,
    }

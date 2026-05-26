from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
import json
import swisseph as swe
from astral import LocationInfo
from astral.sun import sun as astral_sun

from app.services.chart_engine import (
    generate_chart, calculate_dashas, get_current_dasha,
    calculate_antardashas, get_current_antardasha,
    calculate_pratyantardashas, get_current_pratyantardasha,
    get_ruling_planets, get_all_house_significators
)
from app.services.telugu_terms import (
    get_planet_telugu, get_planet_short, get_sign_telugu,
    get_nakshatra_telugu, get_house_telugu,
    UI_LABELS, PLANETS_TELUGU
)
from app.services.llm_service import (
    get_prediction, get_prediction_stream, detect_topic,
    resolve_effective_topic,
)
from app.services.csl_chains import compute_csl_chains, format_csl_chains_for_llm
from app.services.timezone_utils import resolve_timezone, resolve_birth_offset
from app.services.chart_formatter import format_chart_for_frontend
from app.services.chart_pipeline import _resolve_rp_triple, build_rp_meta

router = APIRouter()

# PR A1.3-fix-24 — Field-level input bounds across all request models in
# this router. Without bounds, attacker-crafted inputs flowed unchecked
# into LLM prompts (cost amplification + injection surface) and into
# swisseph (crashes). Caps are 3-5× realistic max so legitimate users
# never hit them. Latitude/longitude/timezone_offset have astronomical
# bounds. See backend/app/services/llm_service.py:_normalize_mode for
# the matching defensive guard at the LLM layer.
class WorkspaceRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    date: str = Field(..., min_length=8, max_length=12)
    time: str = Field(..., min_length=4, max_length=8)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    timezone_offset: float = Field(5.5, ge=-14, le=14)
    gender: str = Field("", max_length=20)  # PR A1.3a — frontend now sends gender so AI doesn't guess from name
    live_latitude: float | None = Field(None, ge=-90, le=90)
    live_longitude: float | None = Field(None, ge=-180, le=180)
    live_timezone_offset: float | None = Field(None, ge=-14, le=14)

class AnalysisRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    date: str = Field(..., min_length=8, max_length=12)
    time: str = Field(..., min_length=4, max_length=8)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    timezone_offset: float = Field(5.5, ge=-14, le=14)
    gender: str = Field("", max_length=20)  # PR A1.3a — male/female/other; "" if unknown
    topic: str = Field(..., min_length=1, max_length=60)
    question: str = Field("", max_length=4000)
    history: list = Field(default_factory=list, max_length=20)
    language: str = Field("telugu_english", max_length=20)
    # PR A1.3-fix-23 — Format A (7-section) vs Format B (5-section narrative)
    # routing hint. Frontend sends "full_topic" from handleTopicAnalysis
    # and "sub_question" from handleWorkspaceChat. Backend resolves "auto"
    # via heuristic if not provided. See _resolve_question_type in
    # llm_service.py.
    question_type: str = Field("auto", max_length=20)
    live_latitude: float | None = Field(None, ge=-90, le=90)
    live_longitude: float | None = Field(None, ge=-180, le=180)
    live_timezone_offset: float | None = Field(None, ge=-14, le=14)


# PR A1.3-fix-20 / fix-21 — helper to compute Tara Chakra + Chandra Bala
# for the workspace endpoint.
def _build_tara_chakra(janma_nakshatra: str, natal_moon_sign: str = "") -> dict:
    """Return Tara Chakra + Chandra Bala payload for the workspace response.

    Includes:
      - Full 27-nakshatra chakra (Tara Bala)
      - Native's natal Moon sign (for Chandra Bala compute on demand)
      - Pariharam (remedies) per Tara
    Today's-tara, transit-taras, and Chandra Bala for current Moon are
    computed inside chart_pipeline.build_full_chart_data and surface in
    the /astrologer/analyze response.
    """
    try:
        from app.services.kp_tara_chakra import (
            compute_tara_chakra, TARA_PARIHARAM,
        )
        return {
            "chakra": compute_tara_chakra(janma_nakshatra),
            "natal_moon_sign": natal_moon_sign,
            "pariharam": TARA_PARIHARAM,
        }
    except Exception:
        return {"chakra": {"nakshatras": []}}


# PR A1.3a — helper to compute current age in years from a YYYY-MM-DD birth string
# PR A1.3-fix-24 — switched datetime.utcnow() (deprecated 3.12+) to IST helper
def _compute_age_years(birth_date_str: str) -> int:
    try:
        bd = datetime.strptime(birth_date_str, "%Y-%m-%d")
        from app.services.today import now_ist
        today = now_ist()
        years = today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
        return max(0, years)
    except Exception as e:
        import logging
        logging.getLogger("astrologer").warning(
            "_compute_age_years failed for %r: %s", birth_date_str, e
        )
        return 0


# ── House calculation ─────────────────────────────────────────

def get_planet_house(planet_lon: float, cusp_longitudes: list) -> int:
    for i in range(12):
        cusp_start = cusp_longitudes[i] % 360
        cusp_end = cusp_longitudes[(i + 1) % 12] % 360
        planet = planet_lon % 360
        if cusp_end > cusp_start:
            if cusp_start <= planet < cusp_end:
                return i + 1
        else:
            if planet >= cusp_start or planet < cusp_end:
                return i + 1
    return 1


# ── Panchangam ────────────────────────────────────────────────

NAKSHATRA_NAMES_EN = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira",
    "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha",
    "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati",
    "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
    "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha",
    "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]
NAKSHATRA_TE = [
    "అశ్వని", "భరణి", "కృత్తిక", "రోహిణి", "మృగశిర",
    "ఆర్ద్ర", "పునర్వసు", "పుష్యమి", "ఆశ్లేష", "మఖ",
    "పూర్వ ఫల్గుణి", "ఉత్తర ఫల్గుణి", "హస్త", "చిత్త", "స్వాతి",
    "విశాఖ", "అనూరాధ", "జ్యేష్ఠ", "మూల", "పూర్వాషాఢ",
    "ఉత్తరాషాఢ", "శ్రవణం", "ధనిష్ఠ", "శతభిష", "పూర్వభాద్ర",
    "ఉత్తరభాద్ర", "రేవతి"
]
TITHIS_TE = [
    # Shukla Paksha (1-15)
    "పాడ్యమి", "విదియ", "తదియ", "చవితి", "పంచమి",
    "షష్ఠి", "సప్తమి", "అష్టమి", "నవమి", "దశమి",
    "ఏకాదశి", "ద్వాదశి", "త్రయోదశి", "చతుర్దశి", "పౌర్ణమి",
    # Krishna Paksha (16-30)
    "బహుళ పాడ్యమి", "బహుళ విదియ", "బహుళ తదియ", "బహుళ చవితి", "బహుళ పంచమి",
    "బహుళ షష్ఠి", "బహుళ సప్తమి", "బహుళ అష్టమి", "బహుళ నవమి", "బహుళ దశమి",
    "బహుళ ఏకాదశి", "బహుళ ద్వాదశి", "బహుళ త్రయోదశి", "బహుళ చతుర్దశి", "అమావాస్య",
]
TITHIS_EN = [
    "Shukla Pratipada", "Shukla Dwitiya", "Shukla Tritiya", "Shukla Chaturthi", "Shukla Panchami",
    "Shukla Shashthi", "Shukla Saptami", "Shukla Ashtami", "Shukla Navami", "Shukla Dashami",
    "Shukla Ekadashi", "Shukla Dwadashi", "Shukla Trayodashi", "Shukla Chaturdashi", "Pournami",
    "Krishna Pratipada", "Krishna Dwitiya", "Krishna Tritiya", "Krishna Chaturthi", "Krishna Panchami",
    "Krishna Shashthi", "Krishna Saptami", "Krishna Ashtami", "Krishna Navami", "Krishna Dashami",
    "Krishna Ekadashi", "Krishna Dwadashi", "Krishna Trayodashi", "Krishna Chaturdashi", "Amavasya",
]
YOGA_TE = [
    "విష్కంభ", "ప్రీతి", "ఆయుష్మాన్", "సౌభాగ్య", "శోభన",
    "అతిగంద", "సుకర్మ", "ధృతి", "శూల", "గంద",
    "వృద్ధి", "ధ్రువ", "వ్యాఘాత", "హర్షణ", "వజ్ర",
    "సిద్ధి", "వ్యతీపాత", "వరీయాన్", "పరిఘ", "శివ",
    "సిద్ధ", "సాధ్య", "శుభ", "శుక్ల", "బ్రహ్మ",
    "ఇంద్ర", "వైధృతి"
]
YOGA_EN = [
    "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana",
    "Atiganda", "Sukarma", "Dhriti", "Shula", "Ganda",
    "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
    "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva",
    "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma",
    "Indra", "Vaidhriti"
]
DAY_TE = ["సోమవారం", "మంగళవారం", "బుధవారం", "గురువారం", "శుక్రవారం", "శనివారం", "ఆదివారం"]
DAY_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# Rahu Kalam: 0-based slot index within 8 equal daylight segments (weekday 0=Mon, 6=Sun)
RAHU_KALAM_SLOTS = {0: 1, 1: 6, 2: 4, 3: 5, 4: 3, 5: 2, 6: 7}

CHARA_KARANAS_EN = ["Bava", "Balava", "Kaulava", "Taitula", "Garija", "Vanija", "Vishti"]
CHARA_KARANAS_TE = ["బవ", "బాలవ", "కౌలవ", "తైతిల", "గరజ", "వణిజ", "విష్టి"]

# Hora lords cycle: Sun→Venus→Mercury→Moon→Saturn→Jupiter→Mars
HORA_LORDS_EN = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"]
# Starting hora lord index for each weekday (0=Mon, 6=Sun)
DAY_HORA_START = {0: 3, 1: 6, 2: 2, 3: 5, 4: 1, 5: 4, 6: 0}


def jd_to_local_time_str(jd: float, timezone_offset: float) -> str:
    """Convert Julian Day (UT) to local time HH:MM string."""
    unix_seconds = (jd - 2440588.5) * 86400
    dt_utc = datetime(1970, 1, 1) + timedelta(seconds=unix_seconds)
    dt_local = dt_utc + timedelta(hours=timezone_offset)
    return dt_local.strftime("%H:%M")


def get_sunrise_sunset_jd(date_jd: float, lat: float, lon: float) -> tuple:
    """Sunrise/sunset using astral (NOAA). Falls back to pyswisseph, then 6AM/6PM."""
    try:
        unix_seconds = (date_jd - 2440588.5) * 86400
        dt_utc = datetime(1970, 1, 1) + timedelta(seconds=unix_seconds)
        target_date = dt_utc.date()
        loc = LocationInfo(latitude=lat, longitude=lon)
        s = astral_sun(loc.observer, date=target_date)
        sr = s["sunrise"]
        ss = s["sunset"]
        # Convert timezone-aware datetime to JD (UT)
        from datetime import timezone
        sr_utc = sr.astimezone(timezone.utc).replace(tzinfo=None)
        ss_utc = ss.astimezone(timezone.utc).replace(tzinfo=None)
        sr_h = sr_utc.hour + sr_utc.minute / 60.0 + sr_utc.second / 3600.0
        ss_h = ss_utc.hour + ss_utc.minute / 60.0 + ss_utc.second / 3600.0
        sunrise_jd = swe.julday(sr_utc.year, sr_utc.month, sr_utc.day, sr_h)
        sunset_jd = swe.julday(ss_utc.year, ss_utc.month, ss_utc.day, ss_h)
        return sunrise_jd, sunset_jd
    except Exception:
        # Fallback to pyswisseph
        # PR Mu0f — match the modern pyswisseph signature (7 args max)
        # and try the old 8-arg form on TypeError. Mirrors the same fix
        # applied to muhurtha_engine._get_sunrise_sunset_jd (PR Mu0d).
        # Without this both 8-arg calls below raise TypeError → caught
        # by `except Exception` → returns a fake 06:00 / 18:00 day,
        # silently degrading sunrise/sunset for the astrologer router's
        # Vedic-day-lord computation.
        geopos = (lon, lat, 0.0)
        try:
            try:
                rflag, tret = swe.rise_trans(
                    date_jd - 0.5, swe.SUN, swe.CALC_RISE, geopos, 1013.25, 10.0
                )
            except TypeError:
                rflag, tret = swe.rise_trans(
                    date_jd - 0.5, swe.SUN, b"", 0,
                    swe.CALC_RISE, geopos, 1013.25, 10.0
                )
            sunrise_jd = tret[0]
            try:
                sflag, tret2 = swe.rise_trans(
                    sunrise_jd, swe.SUN, swe.CALC_SET, geopos, 1013.25, 10.0
                )
            except TypeError:
                sflag, tret2 = swe.rise_trans(
                    sunrise_jd, swe.SUN, b"", 0,
                    swe.CALC_SET, geopos, 1013.25, 10.0
                )
            sunset_jd = tret2[0]
            return sunrise_jd, sunset_jd
        except Exception:
            return date_jd - 0.25, date_jd + 0.25


def get_karana_name(moon_lon: float, sun_lon: float) -> tuple:
    """Return (karana_en, karana_te) for current position."""
    diff = (moon_lon - sun_lon) % 360
    idx = int(diff / 6)  # 0 to 59
    if idx == 0:
        return "Kimstughna", "కింస్తుఘ్న"
    elif idx <= 56:
        ci = (idx - 1) % 7
        return CHARA_KARANAS_EN[ci], CHARA_KARANAS_TE[ci]
    elif idx == 57:
        return "Shakuni", "శకుని"
    elif idx == 58:
        return "Chatushpada", "చతుష్పాద"
    else:
        return "Naga", "నాగ"


def get_hora_lord(dt_obj: datetime, sunrise_jd: float, timezone_offset: float, weekday: int) -> str:
    """Return current hora lord based on hours elapsed since sunrise."""
    sunrise_str = jd_to_local_time_str(sunrise_jd, timezone_offset)
    sr_h, sr_m = map(int, sunrise_str.split(":"))
    sunrise_minutes = sr_h * 60 + sr_m
    current_minutes = dt_obj.hour * 60 + dt_obj.minute
    minutes_since_sunrise = (current_minutes - sunrise_minutes) % (24 * 60)
    hora_num = int(minutes_since_sunrise / 60) % 7
    return HORA_LORDS_EN[(DAY_HORA_START[weekday] + hora_num) % 7]


def calc_panchangam_for_dt(dt_obj: datetime, timezone_offset: float = 5.5,
                            lat: float = 17.385, lon: float = 78.4867) -> dict:
    """Calculate panchangam for a datetime object with location-based Rahu Kalam."""
    # Auto-resolve timezone from coordinates (overrides browser-supplied offset)
    resolved_offset, _ = resolve_timezone(lat, lon, dt_obj)
    timezone_offset = resolved_offset

    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    jd = swe.julday(
        dt_obj.year, dt_obj.month, dt_obj.day,
        dt_obj.hour + dt_obj.minute / 60 - timezone_offset
    )
    moon_lon = swe.calc_ut(jd, swe.MOON, swe.FLG_SIDEREAL)[0][0]
    sun_lon = swe.calc_ut(jd, swe.SUN, swe.FLG_SIDEREAL)[0][0]

    diff = (moon_lon - sun_lon) % 360
    tithi_num = int(diff / 12) + 1
    nakshatra_num = int((moon_lon % 360) / (360 / 27))
    yoga_num = int(((sun_lon + moon_lon) % 360) / (360 / 27)) % 27
    weekday = dt_obj.weekday()  # 0=Monday, 6=Sunday

    # Sunrise/sunset → actual Rahu Kalam
    sunrise_jd, sunset_jd = get_sunrise_sunset_jd(jd, lat, lon)
    slot_duration = (sunset_jd - sunrise_jd) / 8.0
    rk_slot = RAHU_KALAM_SLOTS[weekday]
    rk_start_jd = sunrise_jd + rk_slot * slot_duration
    rk_end_jd = rk_start_jd + slot_duration

    sunrise_str = jd_to_local_time_str(sunrise_jd, timezone_offset)
    sunset_str = jd_to_local_time_str(sunset_jd, timezone_offset)
    rk_start_str = jd_to_local_time_str(rk_start_jd, timezone_offset)
    rk_end_str = jd_to_local_time_str(rk_end_jd, timezone_offset)

    karana_en, karana_te = get_karana_name(moon_lon, sun_lon)
    hora_lord = get_hora_lord(dt_obj, sunrise_jd, timezone_offset, weekday)

    tithi_idx = max(0, min(tithi_num - 1, 29))
    return {
        "tithi": TITHIS_TE[tithi_idx],
        "tithi_en": TITHIS_EN[tithi_idx],
        "tithi_num": tithi_num,
        "nakshatra": NAKSHATRA_TE[nakshatra_num],
        "nakshatra_en": NAKSHATRA_NAMES_EN[nakshatra_num],
        "yoga": YOGA_TE[yoga_num],
        "yoga_en": YOGA_EN[yoga_num],
        "vara": DAY_TE[weekday],
        "vara_en": DAY_EN[weekday],
        "rahu_kalam": f"{rk_start_str}-{rk_end_str}",
        "sunrise": sunrise_str,
        "sunset": sunset_str,
        "karana": karana_en,
        "karana_te": karana_te,
        "hora_lord": hora_lord,
        "date": dt_obj.strftime("%d/%m/%Y"),
        "time": dt_obj.strftime("%H:%M"),
    }


def get_today_panchangam(timezone_offset: float = 5.5, lat: float = 17.385, lon: float = 78.4867) -> dict:
    return calc_panchangam_for_dt(datetime.now(), timezone_offset, lat, lon)


def get_birth_panchangam(date: str, time: str, timezone_offset: float = 5.5,
                          lat: float = 17.385, lon: float = 78.4867) -> dict:
    birth_dt = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")
    return calc_panchangam_for_dt(birth_dt, timezone_offset, lat, lon)


# ── Telugu planet name reference for prompts ─────────────────

def build_telugu_reference() -> str:
    """Build a Telugu planet name reference to inject into prompts."""
    lines = ["PLANET NAMES IN TELUGU (use these in Telugu+English analysis):"]
    for en, te in PLANETS_TELUGU.items():
        lines.append(f"  {en} = {te}")
    return "\n".join(lines)


# ── Workspace endpoint ────────────────────────────────────────

@router.post("/workspace")
def get_workspace(request: WorkspaceRequest):
    # PR A1.12 — backend is now source of truth for the UTC offset.
    # Frontend's `timezone_offset` is fallback only. See
    # timezone_utils.resolve_birth_offset for the full bug story.
    tz_offset, tz_name = resolve_birth_offset(
        request.latitude, request.longitude,
        request.date, request.time,
        fallback_offset=request.timezone_offset,
    )
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    chart = generate_chart(
        request.date, request.time,
        request.latitude, request.longitude,
        tz_offset,
    )
    moon_longitude = chart["planets"]["Moon"]["longitude"]
    dashas = calculate_dashas(request.date, request.time, moon_longitude, tz_offset)
    current_md = get_current_dasha(dashas)
    antardashas = calculate_antardashas(current_md)
    current_ad = get_current_antardasha(antardashas)
    pratyantardashas = calculate_pratyantardashas(current_ad)
    current_pad = get_current_pratyantardasha(pratyantardashas)
    all_significators = get_all_house_significators(chart["planets"], chart["cusps"])
    # Shared rp triple resolver — all-or-nothing on live (never mix live
    # lat/lon with natal tz, see chart_pipeline._resolve_rp_triple docstring).
    rp_lat, rp_lon, rp_tz, rp_source = _resolve_rp_triple(
        natal_lat=request.latitude, natal_lon=request.longitude, natal_tz=tz_offset,
        live_lat=request.live_latitude, live_lon=request.live_longitude,
        live_tz=request.live_timezone_offset,
    )
    ruling_planets = get_ruling_planets(rp_lat, rp_lon, rp_tz)
    rp_meta = build_rp_meta(rp_lat, rp_lon, rp_tz, source=rp_source)

    cusp_longitudes = [data.get("cusp_longitude", 0) for data in chart["cusps"].values()]

    # Use shared formatter for planets + cusps
    _formatted = format_chart_for_frontend(chart)
    planets_formatted = _formatted["planets"]
    cusps_formatted = _formatted["cusps"]

    significators_formatted = {}
    for house, sig in all_significators.items():
        house_num = int(house.replace("House_", ""))
        # Phase 2 / PR 5 — surface the L1 and L3 buckets the engine already
        # computes. Stress-test finding #5: HousePanel was rendering only
        # L2 (occupants) and L4 (house lord), making the "(4 LEVELS)"
        # subheader misleading. Backend has the data — we just expose it
        # with the same `_en` / `_te` translation pattern as the rest.
        l1 = sig.get("planets_in_star_of_occupants", [])
        l3 = sig.get("planets_in_star_of_lord", [])
        significators_formatted[house] = {
            "house_num": house_num,
            "house_te": get_house_telugu(house_num),
            "occupants_en": sig.get("occupants", []),
            "occupants_te": [get_planet_telugu(p) for p in sig.get("occupants", [])],
            "house_lord_en": sig.get("house_lord", ""),
            "house_lord_te": get_planet_telugu(sig.get("house_lord", "")),
            "planets_in_star_of_occupants_en": l1,
            "planets_in_star_of_occupants_te": [get_planet_telugu(p) for p in l1],
            "planets_in_star_of_lord_en": l3,
            "planets_in_star_of_lord_te": [get_planet_telugu(p) for p in l3],
            "all_significators_en": sig.get("all_significators", []),
            "all_significators_te": [get_planet_telugu(p) for p in sig.get("all_significators", [])],
        }

    dashas_formatted = []
    for ad in antardashas:
        dashas_formatted.append({
            "lord_en": ad.get("antardasha_lord", ""),
            "lord_te": get_planet_telugu(ad.get("antardasha_lord", "")),
            "start": ad.get("start", ""),
            "end": ad.get("end", ""),
            "is_current": (
                ad.get("antardasha_lord") == current_ad.get("antardasha_lord") and
                ad.get("start") == current_ad.get("start")
            )
        })

    # Phase 2 / PR 4 — surface the extended Asc/Moon Sub Lords as their own
    # `*_en` / `*_te` keys to match the pattern of the core 5. The values
    # already exist in `rp_context`; we just promote them so the frontend
    # doesn't need a client-side English→Telugu planet map.
    _ctx = ruling_planets.get("rp_context", {})
    rp_formatted = {
        "day_lord_en": ruling_planets.get("day_lord", ""),
        "day_lord_te": get_planet_telugu(ruling_planets.get("day_lord", "")),
        "lagna_sign_lord_en": ruling_planets.get("lagna_sign_lord", ""),
        "lagna_sign_lord_te": get_planet_telugu(ruling_planets.get("lagna_sign_lord", "")),
        "lagna_star_lord_en": ruling_planets.get("lagna_star_lord", ""),
        "lagna_star_lord_te": get_planet_telugu(ruling_planets.get("lagna_star_lord", "")),
        "moon_sign_lord_en": ruling_planets.get("moon_sign_lord", ""),
        "moon_sign_lord_te": get_planet_telugu(ruling_planets.get("moon_sign_lord", "")),
        "moon_star_lord_en": ruling_planets.get("moon_star_lord", ""),
        "moon_star_lord_te": get_planet_telugu(ruling_planets.get("moon_star_lord", "")),
        # Extended pair — KSK 5+2 system. Empty string when missing keeps
        # the frontend's truthy-check pattern happy.
        "lagna_sub_lord_en": _ctx.get("lagna_sub_lord", ""),
        "lagna_sub_lord_te": get_planet_telugu(_ctx.get("lagna_sub_lord", "")),
        "moon_sub_lord_en":  _ctx.get("moon_sub_lord", ""),
        "moon_sub_lord_te":  get_planet_telugu(_ctx.get("moon_sub_lord", "")),
        "all_en": ruling_planets.get("ruling_planets", []),
        "all_te": [get_planet_telugu(p) for p in ruling_planets.get("ruling_planets", [])],
        "query_time": ruling_planets.get("query_time", ""),
        # PR A1.1f — unified 7-slot context. Frontend reads this to render
        # the same "RP context" strip Horary uses.
        "rp_context": _ctx,
    }

    birth_dt = datetime.strptime(f"{request.date} {request.time}", "%Y-%m-%d %H:%M")

    return {
        "name": request.name,
        "date": request.date,
        "time": request.time,
        "latitude": request.latitude,
        "longitude": request.longitude,
        # PR A1.12 — return the engine's resolved offset, not the raw
        # frontend input. Frontend reads this back to display the
        # correct tz label after server validation.
        "timezone_offset": tz_offset,
        "timezone_iana": tz_name,
        "planets": planets_formatted,
        "cusps": cusps_formatted,
        "significators": significators_formatted,
        "mahadasha": {
            "lord_en": current_md.get("lord", ""),
            "lord_te": get_planet_telugu(current_md.get("lord", "")),
            "start": current_md.get("start", ""),
            "end": current_md.get("end", ""),
        },
        "current_antardasha": {
            "lord_en": current_ad.get("antardasha_lord", ""),
            "lord_te": get_planet_telugu(current_ad.get("antardasha_lord", "")),
            "start": current_ad.get("start", ""),
            "end": current_ad.get("end", ""),
        },
        "current_pratyantardasha": {
            "lord_en": current_pad.get("pratyantardasha_lord", ""),
            "lord_te": get_planet_telugu(current_pad.get("pratyantardasha_lord", "")),
            "start": current_pad.get("start", ""),
            "end": current_pad.get("end", ""),
        },
        "antardashas": dashas_formatted,
        "pratyantardashas": [
            {
                "lord_en": p.get("pratyantardasha_lord", ""),
                "lord_te": get_planet_telugu(p.get("pratyantardasha_lord", "")),
                "start": p.get("start", ""),
                "end": p.get("end", ""),
                "is_current": (
                    p.get("pratyantardasha_lord") == current_pad.get("pratyantardasha_lord") and
                    p.get("start") == current_pad.get("start")
                ),
            }
            for p in pratyantardashas
        ],
        "ruling_planets": rp_formatted,
        # rp_meta — see services/chart_pipeline.build_rp_meta. Frontend
        # uses this to render the RP source pill + per-tab inline labels
        # so the astrologer always knows where every RP citation came from
        # (their live location vs the natal-fallback when geolocation is
        # missing / denied).
        "rp_meta": rp_meta,
        "panchangam_today": get_today_panchangam(tz_offset, request.latitude, request.longitude),
        "panchangam_birth": get_birth_panchangam(request.date, request.time, tz_offset, request.latitude, request.longitude),
        "csl_chains": compute_csl_chains(cusps_formatted, planets_formatted),
        # PR A1.3-fix-20 / fix-21 — Tara Chakra (Navatara) + Chandra Bala +
        # Pariharam. Native's full chakra relative to janma nakshatra +
        # natal Moon sign for Chandra Bala compute. Today's tara, transit
        # taras, and Chandra Bala for current Moon come from
        # chart_pipeline.build_full_chart_data (in /analyze response).
        "tara_chakra": _build_tara_chakra(
            chart["planets"].get("Moon", {}).get("nakshatra", ""),
            chart["planets"].get("Moon", {}).get("sign", ""),
        ),
        "ui_labels": UI_LABELS,
        # Full mahadasha list for timeline visualization
        "dashas": [
            {
                "lord": md.get("lord", ""),
                "lord_en": md.get("lord", ""),
                "lord_te": get_planet_telugu(md.get("lord", "")),
                "start": md.get("start", ""),
                "end": md.get("end", ""),
                "years": md.get("years", 0),
            }
            for md in dashas
        ],
        # Current dasha (alias for mahadasha with unified field names)
        "current_dasha": {
            "lord": current_md.get("lord", ""),
            "lord_en": current_md.get("lord", ""),
            "lord_te": get_planet_telugu(current_md.get("lord", "")),
            "start": current_md.get("start", ""),
            "end": current_md.get("end", ""),
        },
    }


# ── Analysis endpoint ─────────────────────────────────────────

@router.post("/analyze")
def analyze_topic(request: AnalysisRequest):
    # PR A1.3-fix-14 — refactored to use the shared chart_pipeline so
    # /astrologer/analyze and /prediction/ask have identical compute.
    # The 200+ lines of compute orchestration that used to live here now
    # live in chart_pipeline.build_full_chart_data().
    from app.services.chart_pipeline import build_full_chart_data
    # PR A2.7 — Upgrade topic to one with engine-house support if frontend
    # sent "general"/"auto"/unknown (was producing 25/100 floor confidence
    # because compute_advanced_for_topic was getting empty relevant_houses).
    topic = resolve_effective_topic(request.topic, request.question)
    chart_data = build_full_chart_data(
        name=request.name,
        date=request.date,
        time=request.time,
        latitude=request.latitude,
        longitude=request.longitude,
        timezone_offset=request.timezone_offset,
        gender=request.gender,
        topic=topic,
        live_latitude=request.live_latitude,
        live_longitude=request.live_longitude,
        live_timezone_offset=request.live_timezone_offset,
    )
    # Strip internal-only keys (raw chart + moon_long) — not consumed by
    # get_prediction or the response payload.
    chart_data.pop("_chart_raw", None)
    chart_data.pop("_moon_longitude", None)
    promise = chart_data.get("promise_analysis", {})
    timing = chart_data.get("timing_analysis", {})

    # Build language instruction with Telugu planet name reference
    lang_instruction = ""
    if request.language == "telugu_english":
        telugu_ref = build_telugu_reference()
        lang_instruction = f"""

LANGUAGE INSTRUCTIONS:
Write analysis in Telugu mixed with English KP terms.
CRITICAL SCRIPT RULE: Use ONLY Telugu script (Unicode range U+0C00–U+0C7F).
NEVER use: Hindi/Devanagari (ह, क, म etc), Chinese, Japanese, or any other script.
If you cannot write a word in Telugu, write it in English instead.

- Explanations and sentences: Telugu script only
- KP technical terms kept in English: Sub Lord, Cusp, Significator, Antardasha, Mahadasha, Ruling Planets, house numbers (H7, H2 etc), PROMISED, CONDITIONAL, DENIED
- Planet names: USE TELUGU from this reference:
{telugu_ref}
- Example correct: "H7 యొక్క Sub Lord రాహువు, houses 2, 4, 8 ని signify చేస్తోంది"
- Example correct: "శుక్రుడు H7 మరియు H11 lord కాబట్టి marriage కి strong significator"
- NEVER write English planet names like Venus, Mars, Saturn — always use Telugu from the reference above"""

    question = request.question or f"{topic} గురించి పూర్తి KP విశ్లేషణ చేయండి"
    if lang_instruction:
        question = question + lang_instruction

    answer = get_prediction(
        chart_data, question,
        request.history,
        mode="astrologer",
        topic=topic,  # PR A1.3-fix-1 (C1): pass topic explicitly so detect_topic Haiku call is skipped
        question_type=request.question_type,  # PR A1.3-fix-23 — Format A vs B routing
    )

    # rp_meta — surface the RP location/time source so the frontend can
    # render the source pill above this answer and warn the astrologer
    # if natal-fallback was used instead of their live location.
    return {
        "topic": topic, "answer": answer, "promise": promise, "timing": timing,
        "rp_meta": chart_data.get("rp_meta"),
    }


# ════════════════════════════════════════════════════════════════
# STREAMING ENDPOINT (PR A1.3-fix-22)
# ════════════════════════════════════════════════════════════════
# Server-Sent Events (SSE) variant of /analyze for astrologer mode.
# Mirrors /prediction/ask-stream so the Analysis tab can show first
# tokens in 1-2s instead of the prior 25-60s blocking wait.
#
# SSE event types yielded:
#   - "meta"   — initial event with topic + promise + timing payload
#                that powers the Analysis tab's verdict scaffolding.
#                Sent FIRST so the UI can render the section shell
#                before any LLM text arrives.
#   - "chunk"  — text token from the LLM response. Frontend appends
#                to the AI message bubble in real time.
#   - "done"   — stream complete; signals frontend to stop reading.
#   - "error"  — error during stream; frontend shows fallback.
#
# Same compute pipeline as /analyze, same Sonnet 4.6 model selection,
# same Telugu lang_instruction, same RULE 32 output budget.

@router.post("/analyze-stream")
async def analyze_topic_stream(request: AnalysisRequest):
    from app.services.chart_pipeline import build_full_chart_data

    # Phase 13.2 — entry log so we can see WHEN this endpoint is hit,
    # independently of whether a downstream Anthropic call actually
    # fires (cache hits skip Anthropic). Pair this with the
    # [ANTHROPIC_AUDIT] line emitted by llm_service.cost_audit to
    # reconcile every request → cost.
    import logging
    logging.getLogger("astrologer").warning(
        "[ENDPOINT_HIT] /astrologer/analyze-stream topic=%s qlen=%d hist=%d qtype=%s",
        request.topic, len(request.question or ""),
        len(request.history or []), request.question_type,
    )

    # PR A2.7 — Upgrade topic to one with engine-house support if frontend
    # sent "general"/"auto"/unknown (see resolve_effective_topic docstring).
    topic = resolve_effective_topic(request.topic, request.question)
    chart_data = build_full_chart_data(
        name=request.name,
        date=request.date,
        time=request.time,
        latitude=request.latitude,
        longitude=request.longitude,
        timezone_offset=request.timezone_offset,
        gender=request.gender,
        topic=topic,
        live_latitude=request.live_latitude,
        live_longitude=request.live_longitude,
        live_timezone_offset=request.live_timezone_offset,
    )
    chart_data.pop("_chart_raw", None)
    chart_data.pop("_moon_longitude", None)
    promise = chart_data.get("promise_analysis", {})
    timing = chart_data.get("timing_analysis", {})

    # Telugu language instruction (same as blocking /analyze)
    lang_instruction = ""
    if request.language == "telugu_english":
        telugu_ref = build_telugu_reference()
        lang_instruction = f"""

LANGUAGE INSTRUCTIONS:
Write analysis in Telugu mixed with English KP terms.
CRITICAL SCRIPT RULE: Use ONLY Telugu script (Unicode range U+0C00–U+0C7F).
NEVER use: Hindi/Devanagari (ह, क, म etc), Chinese, Japanese, or any other script.
If you cannot write a word in Telugu, write it in English instead.

- Explanations and sentences: Telugu script only
- KP technical terms kept in English: Sub Lord, Cusp, Significator, Antardasha, Mahadasha, Ruling Planets, house numbers (H7, H2 etc), PROMISED, CONDITIONAL, DENIED
- Planet names: USE TELUGU from this reference:
{telugu_ref}
- Example correct: "H7 యొక్క Sub Lord రాహువు, houses 2, 4, 8 ని signify చేస్తోంది"
- Example correct: "శుక్రుడు H7 మరియు H11 lord కాబట్టి marriage కి strong significator"
- NEVER write English planet names like Venus, Mars, Saturn — always use Telugu from the reference above"""

    question = request.question or f"{topic} గురించి పూర్తి KP విశ్లేషణ చేయండి"
    if lang_instruction:
        question = question + lang_instruction

    # Cache key inputs (Phase 2 24h answer cache — same shape as
    # /prediction/ask-stream so the cache can dedupe across endpoints
    # for identical natal+question+mode combinations).
    cache_input = {
        "birth_date": request.date,
        "birth_time": request.time,
        "latitude": request.latitude,
        "longitude": request.longitude,
        "timezone_offset": request.timezone_offset,
        "gender": request.gender,
        "topic": topic,
        "mode": "astrologer",
        "question": question,
    }

    meta_payload = {
        "topic": topic,
        "promise": promise,
        "timing": timing,
        # rp_meta — surfaces in the SSE meta event so the Analysis tab
        # can render the source pill above the streaming answer the
        # moment the stream opens (before chunks arrive).  Frontend
        # tolerates missing field gracefully.
        "rp_meta": chart_data.get("rp_meta"),
    }

    async def event_stream():
        try:
            yield f"event: meta\ndata: {json.dumps(meta_payload, default=str)}\n\n"

            async for chunk in get_prediction_stream(
                chart_data,
                question,
                [{"question": h.get("question", ""), "answer": h.get("answer", "")}
                 for h in (request.history or [])],
                mode="astrologer",
                topic=topic,
                cache_key_input=cache_input,
                question_type=request.question_type,  # PR A1.3-fix-23 — Format A vs B routing
            ):
                yield f"event: chunk\ndata: {json.dumps({'text': chunk})}\n\n"

            yield "event: done\ndata: {}\n\n"
        except Exception as e:
            # PR A1.3-fix-24 — log full server-side, generic message to client
            import logging
            logging.getLogger("astrologer").exception("analyze-stream failed: %s", e)
            err_payload = json.dumps({"error": "stream_failed"})
            yield f"event: error\ndata: {err_payload}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable proxy buffering for streams
        },
    )


# ── Quick Insights endpoint ───────────────────────────────────

class QuickInsightsRequest(BaseModel):
    # PR A1.3-fix-24 — input bounds (see WorkspaceRequest above for rationale)
    name: str = Field(..., min_length=1, max_length=120)
    date: str = Field(..., min_length=8, max_length=12)
    time: str = Field(..., min_length=4, max_length=8)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    timezone_offset: float = Field(5.5, ge=-14, le=14)
    gender: str = Field("", max_length=20)  # PR A1.3a — same gender wiring as /analyze
    topics: list = Field(default_factory=lambda: ["marriage", "career", "health"], max_length=15)
    language: str = Field("telugu_english", max_length=20)


@router.post("/quick-insights")
def quick_insights(request: QuickInsightsRequest):
    """
    Phase 13.1 — endpoint hard-disabled (HTTP 410 Gone).

    Original purpose: generate 3-4 bullet-point chart-specific observations
    for each requested topic. Auto-fired by the Analysis tab on every open
    and was the single biggest preventable cost (~$0.30 per visit at
    Sonnet rates × N opens per session).

    Phase 13 / PR 31 removed the frontend auto-fire. We then hard-killed
    the endpoint as defence-in-depth so:
      • a stale Vercel CDN bundle still serving the old `loadQuickInsights`
        code can't bill anything (returns 410 immediately, no LLM call)
      • a future caller who imports this endpoint by mistake gets a clear
        404-class signal instead of silently spending credits.

    Cost-optimization arc (May 2026): the unreachable dead body that was
    kept verbatim below the raise — including ~120 lines of chart
    construction + per-topic LLM dispatch — has been removed. With
    `get_quick_insights()` itself also dropped from llm_service.py, the
    only thing left here is the raise (the intentional 410 surface).

    To re-enable this feature later, re-architect it as an OPT-IN button
    on the Analysis tab (not an auto-fire on open), with explicit per-user
    cost gating. The git history at .claude/research/cost-optimization-2026-05.md
    + PR R3-PR... has the original body if anyone wants to reference it.
    """
    raise HTTPException(
        status_code=410,
        detail=(
            "quick-insights endpoint disabled (Phase 13.1) — was auto-firing "
            "Sonnet calls on every Analysis tab open. Use the explicit topic "
            "click flow (POST /astrologer/analyze-stream) instead."
        ),
    )

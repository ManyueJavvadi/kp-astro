from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
import swisseph as swe

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
from app.services.llm_service import get_prediction, detect_topic

router = APIRouter()

class WorkspaceRequest(BaseModel):
    name: str
    date: str
    time: str
    latitude: float
    longitude: float
    timezone_offset: float = 5.5

class AnalysisRequest(BaseModel):
    name: str
    date: str
    time: str
    latitude: float
    longitude: float
    timezone_offset: float = 5.5
    topic: str
    question: str = ""
    history: list = []
    language: str = "telugu_english"


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
    "పాడ్యమి", "విదియ", "తదియ", "చవితి", "పంచమి",
    "షష్ఠి", "సప్తమి", "అష్టమి", "నవమి", "దశమి",
    "ఏకాదశి", "ద్వాదశి", "త్రయోదశి", "చతుర్దశి", "పౌర్ణమి"
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
RAHU_KALAM = {0: "07:30-09:00", 1: "15:00-16:30", 2: "12:00-13:30",
              3: "13:30-15:00", 4: "10:30-12:00", 5: "09:00-10:30", 6: "16:30-18:00"}


def calc_panchangam_for_dt(dt_obj: datetime, timezone_offset: float = 5.5) -> dict:
    """Calculate panchangam for a datetime object. Uses datetime.weekday() for accuracy."""
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

    # Use Python datetime weekday() — reliable, no JD math errors
    weekday = dt_obj.weekday()  # 0=Monday, 5=Saturday, 6=Sunday

    return {
        "tithi": TITHIS_TE[min(tithi_num - 1, 14)],
        "tithi_num": tithi_num,
        "nakshatra": NAKSHATRA_TE[nakshatra_num],
        "nakshatra_en": NAKSHATRA_NAMES_EN[nakshatra_num],
        "yoga": YOGA_TE[yoga_num],
        "yoga_en": YOGA_EN[yoga_num],
        "vara": DAY_TE[weekday],
        "vara_en": DAY_EN[weekday],
        "rahu_kalam": RAHU_KALAM[weekday],
        "date": dt_obj.strftime("%d/%m/%Y"),
        "time": dt_obj.strftime("%H:%M"),
    }


def get_today_panchangam(timezone_offset: float = 5.5) -> dict:
    return calc_panchangam_for_dt(datetime.now(), timezone_offset)


def get_birth_panchangam(date: str, time: str, timezone_offset: float = 5.5) -> dict:
    birth_dt = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")
    return calc_panchangam_for_dt(birth_dt, timezone_offset)


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
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    chart = generate_chart(
        request.date, request.time,
        request.latitude, request.longitude,
        request.timezone_offset
    )
    moon_longitude = chart["planets"]["Moon"]["longitude"]
    dashas = calculate_dashas(request.date, request.time, moon_longitude, request.timezone_offset)
    current_md = get_current_dasha(dashas)
    antardashas = calculate_antardashas(current_md)
    current_ad = get_current_antardasha(antardashas)
    pratyantardashas = calculate_pratyantardashas(current_ad)
    current_pad = get_current_pratyantardasha(pratyantardashas)
    all_significators = get_all_house_significators(chart["planets"], chart["cusps"])
    ruling_planets = get_ruling_planets(request.timezone_offset)

    cusp_longitudes = [data.get("cusp_longitude", 0) for data in chart["cusps"].values()]

    planets_formatted = []
    for planet, data in chart["planets"].items():
        planet_lon = data.get("longitude", 0)
        house_num = get_planet_house(planet_lon, cusp_longitudes)
        planets_formatted.append({
            "planet_en": planet,
            "planet_te": get_planet_telugu(planet),
            "planet_short": get_planet_short(planet),
            "sign_en": data.get("sign", ""),
            "sign_te": get_sign_telugu(data.get("sign", "")),
            "longitude": round(planet_lon, 4),
            "degree_in_sign": round(planet_lon % 30, 2),
            "nakshatra_en": data.get("nakshatra", ""),
            "nakshatra_te": get_nakshatra_telugu(data.get("nakshatra", "")),
            "star_lord_en": data.get("star_lord", ""),
            "star_lord_te": get_planet_telugu(data.get("star_lord", "")),
            "sub_lord_en": data.get("sub_lord", ""),
            "sub_lord_te": get_planet_telugu(data.get("sub_lord", "")),
            "house": str(house_num),
            "retrograde": data.get("retrograde", False),
        })

    cusps_formatted = []
    for i, (house, data) in enumerate(chart["cusps"].items(), 1):
        cusps_formatted.append({
            "house_num": i,
            "house_te": get_house_telugu(i),
            "sign_en": data.get("sign", ""),
            "sign_te": get_sign_telugu(data.get("sign", "")),
            "cusp_longitude": round(data.get("cusp_longitude", 0), 4),
            "degree_in_sign": round(data.get("cusp_longitude", 0) % 30, 2),
            "nakshatra_en": data.get("nakshatra", ""),
            "nakshatra_te": get_nakshatra_telugu(data.get("nakshatra", "")),
            "star_lord_en": data.get("star_lord", ""),
            "star_lord_te": get_planet_telugu(data.get("star_lord", "")),
            "sub_lord_en": data.get("sub_lord", ""),
            "sub_lord_te": get_planet_telugu(data.get("sub_lord", "")),
        })

    significators_formatted = {}
    for house, sig in all_significators.items():
        house_num = int(house.replace("House_", ""))
        significators_formatted[house] = {
            "house_num": house_num,
            "house_te": get_house_telugu(house_num),
            "occupants_en": sig.get("occupants", []),
            "occupants_te": [get_planet_telugu(p) for p in sig.get("occupants", [])],
            "house_lord_en": sig.get("house_lord", ""),
            "house_lord_te": get_planet_telugu(sig.get("house_lord", "")),
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
        "all_en": ruling_planets.get("ruling_planets", []),
        "all_te": [get_planet_telugu(p) for p in ruling_planets.get("ruling_planets", [])],
        "query_time": ruling_planets.get("query_time", ""),
    }

    birth_dt = datetime.strptime(f"{request.date} {request.time}", "%Y-%m-%d %H:%M")

    return {
        "name": request.name,
        "date": request.date,
        "time": request.time,
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
        "panchangam_today": get_today_panchangam(request.timezone_offset),
        "panchangam_birth": get_birth_panchangam(request.date, request.time, request.timezone_offset),
        "ui_labels": UI_LABELS,
    }


# ── Analysis endpoint ─────────────────────────────────────────

@router.post("/analyze")
def analyze_topic(request: AnalysisRequest):
    chart = generate_chart(
        request.date, request.time,
        request.latitude, request.longitude,
        request.timezone_offset
    )
    moon_longitude = chart["planets"]["Moon"]["longitude"]
    dashas = calculate_dashas(request.date, request.time, moon_longitude, request.timezone_offset)
    current_md = get_current_dasha(dashas)
    antardashas = calculate_antardashas(current_md)
    current_ad = get_current_antardasha(antardashas)

    # PAD calculation
    pratyantardashas = calculate_pratyantardashas(current_ad)
    current_pad = get_current_pratyantardasha(pratyantardashas)

    from app.services.chart_engine import (
        check_promise, check_dasha_relevance, get_all_house_significators
    )

    topic = request.topic
    promise = check_promise(topic, chart["cusps"], chart["planets"])
    timing = check_dasha_relevance(topic, current_md, current_ad, chart["planets"], chart["cusps"])
    ruling_planets = get_ruling_planets(request.timezone_offset)
    all_significators = get_all_house_significators(chart["planets"], chart["cusps"])
    planet_positions = {planet: data.get("house", "") for planet, data in chart["planets"].items()}

    chart_data = {
        "name": request.name,
        "chart_summary": {"planets": chart["planets"], "cusps": chart["cusps"]},
        "promise_analysis": promise,
        "timing_analysis": timing,
        "current_dasha": {
            "mahadasha": current_md,
            "antardasha": current_ad,
            "pratyantardasha": current_pad,
        },
        "upcoming_antardashas": antardashas,
        "pratyantardashas_current_ad": pratyantardashas,
        "ruling_planets": ruling_planets,
        "significators": all_significators,
        "planet_positions": planet_positions,
    }

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
        mode="astrologer"
    )

    return {"topic": topic, "answer": answer, "promise": promise, "timing": timing}
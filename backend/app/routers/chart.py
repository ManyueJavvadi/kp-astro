from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.services.chart_engine import (
    generate_chart, calculate_dashas, get_current_dasha,
    calculate_antardashas, get_current_antardasha,
    get_all_house_significators, check_promise,
    check_dasha_relevance, get_ruling_planets
)

router = APIRouter()

# PR A1.3-fix-24 — input bounds + dropped duplicate chart_engine import
# block that lived between class defs (dead code).
class ChartRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    date: str = Field(..., min_length=8, max_length=12)
    time: str = Field(..., min_length=4, max_length=8)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    timezone_offset: float = Field(5.5, ge=-14, le=14)


@router.post("/generate")
def get_chart(request: ChartRequest):
    # PR A1.3-fix-24 — was silently dropping caller-supplied timezone_offset
    # (passed only 4 positional args). Non-IST callers got wrong charts.
    chart = generate_chart(
        request.date, request.time,
        request.latitude, request.longitude,
        request.timezone_offset,
    )
    moon_longitude = chart["planets"]["Moon"]["longitude"]
    dashas = calculate_dashas(request.date, request.time, moon_longitude, request.timezone_offset)
    current_md = get_current_dasha(dashas)
    antardashas = calculate_antardashas(current_md)
    current_ad = get_current_antardasha(antardashas)
    all_significators = get_all_house_significators(chart["planets"], chart["cusps"])
    # PR A1.1: lat/lon/tz now required for correct RPs.
    ruling_planets = get_ruling_planets(
        request.latitude, request.longitude, request.timezone_offset,
    )

    return {
        "name": request.name,
        "chart": chart,
        "dashas": {
            "all_periods": dashas,
            "current_mahadasha": current_md,
            "current_antardasha": current_ad,
        },
        "significators": all_significators,
        "ruling_planets": ruling_planets,
    }


class TopicRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    date: str = Field(..., min_length=8, max_length=12)
    time: str = Field(..., min_length=4, max_length=8)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    timezone_offset: float = Field(5.5, ge=-14, le=14)
    topic: str = Field(..., min_length=1, max_length=60)

@router.post("/analyze")
def analyze_topic(request: TopicRequest):
    # Generate full chart
    chart = generate_chart(
        request.date, request.time,
        request.latitude, request.longitude,
        request.timezone_offset
    )

    moon_longitude = chart["planets"]["Moon"]["longitude"]
    dashas = calculate_dashas(
        request.date, request.time,
        moon_longitude, request.timezone_offset
    )
    current_md = get_current_dasha(dashas)
    antardashas = calculate_antardashas(current_md)
    current_ad = get_current_antardasha(antardashas)

    # Topic specific analysis
    promise = check_promise(request.topic, chart["cusps"], chart["planets"])
    timing = check_dasha_relevance(
        request.topic, current_md, current_ad,
        chart["planets"], chart["cusps"]
    )
    # PR A1.1: lat/lon/tz now required for correct RPs.
    ruling_planets = get_ruling_planets(
        request.latitude, request.longitude, request.timezone_offset,
    )

    return {
        "name": request.name,
        "topic": request.topic,
        "chart_summary": {
            "planets": chart["planets"],
            "cusps": chart["cusps"]
        },
        "promise_analysis": promise,
        "timing_analysis": timing,
        "current_dasha": {
            "mahadasha": current_md,
            "antardasha": current_ad
        },
        "ruling_planets": ruling_planets
    }
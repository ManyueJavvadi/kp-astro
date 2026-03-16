from fastapi import APIRouter
from pydantic import BaseModel
from app.services.chart_engine import (
    generate_chart, calculate_dashas, get_current_dasha,
    calculate_antardashas, get_current_antardasha,
    get_all_house_significators, check_promise,
    check_dasha_relevance, get_ruling_planets
)

router = APIRouter()

class ChartRequest(BaseModel):
    name: str
    date: str
    time: str
    latitude: float
    longitude: float
    timezone_offset: float = 5.5

from app.services.chart_engine import (
    generate_chart, calculate_dashas, get_current_dasha,
    calculate_antardashas, get_current_antardasha,
    get_all_house_significators, get_ruling_planets
)

@router.post("/generate")
def get_chart(request: ChartRequest):
    chart = generate_chart(
        request.date, request.time,
        request.latitude, request.longitude
    )
    moon_longitude = chart["planets"]["Moon"]["longitude"]
    dashas = calculate_dashas(request.date, request.time, moon_longitude)
    current_md = get_current_dasha(dashas)
    antardashas = calculate_antardashas(current_md)
    current_ad = get_current_antardasha(antardashas)
    all_significators = get_all_house_significators(chart["planets"], chart["cusps"])
    ruling_planets = get_ruling_planets()

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
    name: str
    date: str
    time: str
    latitude: float
    longitude: float
    timezone_offset: float = 5.5
    topic: str

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
    ruling_planets = get_ruling_planets(request.timezone_offset)

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
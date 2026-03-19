from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from app.services.llm_service import get_prediction, detect_topic
from app.services.chart_engine import (
    generate_chart, calculate_dashas, get_current_dasha,
    calculate_antardashas, get_current_antardasha,
    calculate_pratyantardashas, get_current_pratyantardasha,
    check_promise, check_dasha_relevance, get_ruling_planets,
    get_all_house_significators
)

router = APIRouter()

class HistoryItem(BaseModel):
    question: str
    answer: str

class PredictionRequest(BaseModel):
    name: str
    date: str
    time: str
    latitude: float
    longitude: float
    timezone_offset: float = 5.5
    topic: str = "auto"
    question: str
    history: List[HistoryItem] = []
    mode: str = "user"

@router.post("/ask")
def ask_prediction(request: PredictionRequest):

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

    # PAD calculation for current AD
    pratyantardashas = calculate_pratyantardashas(current_ad)
    current_pad = get_current_pratyantardasha(pratyantardashas)

    topic = detect_topic(request.question)
    print(f"[{request.mode.upper()}] Topic: {topic} | Q: {request.question}")

    promise = check_promise(topic, chart["cusps"], chart["planets"])
    timing = check_dasha_relevance(
        topic, current_md, current_ad,
        chart["planets"], chart["cusps"]
    )
    ruling_planets = get_ruling_planets(request.timezone_offset)
    all_significators = get_all_house_significators(chart["planets"], chart["cusps"])

    planet_positions = {
        planet: data.get("house", "")
        for planet, data in chart["planets"].items()
    }

    chart_data = {
        "name": request.name,
        "chart_summary": {
            "planets": chart["planets"],
            "cusps": chart["cusps"]
        },
        "promise_analysis": promise,
        "timing_analysis": timing,
        "current_dasha": {
            "mahadasha": current_md,
            "antardasha": current_ad,
            "pratyantardasha": current_pad,
        },
        "upcoming_antardashas": antardashas,
        "pratyantardashas_current_ad": pratyantardashas,  # all 9 PADs within current AD
        "ruling_planets": ruling_planets,
        "significators": all_significators,
        "planet_positions": planet_positions,
    }

    answer = get_prediction(
        chart_data,
        request.question,
        [{"question": h.question, "answer": h.answer} for h in request.history],
        mode=request.mode
    )

    return {
        "question": request.question,
        "answer": answer,
        "analysis": {
            "name": request.name,
            "promise_analysis": promise,
            "timing_analysis": timing,
            "current_dasha": {
                "mahadasha": current_md,
                "antardasha": current_ad,
                "pratyantardasha": current_pad,
            },
            "ruling_planets": ruling_planets,
            "significators": all_significators,
            "planet_positions": planet_positions,
            "chart_summary": {
                "planets": chart["planets"],
                "cusps": chart["cusps"]
            }
        },
        "mode": request.mode,
        "detected_topic": topic
    }
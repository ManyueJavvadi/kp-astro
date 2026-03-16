from fastapi import APIRouter
from pydantic import BaseModel
from app.services.llm_service import get_prediction, detect_topic
from app.services.chart_engine import (
    generate_chart, calculate_dashas, get_current_dasha,
    calculate_antardashas, get_current_antardasha,
    check_promise, check_dasha_relevance, get_ruling_planets
)

router = APIRouter()

class PredictionRequest(BaseModel):
    name: str
    date: str
    time: str
    latitude: float
    longitude: float
    timezone_offset: float = 5.5
    topic: str = "auto"
    question: str

@router.post("/ask")
def ask_prediction(request: PredictionRequest):

    # Generate full chart
    chart = generate_chart(
        request.date, request.time,
        request.latitude, request.longitude,
        request.timezone_offset
    )

    moon_longitude = chart["planets"]["Moon"]["longitude"]

    # Dashas — must come before topic analysis
    dashas = calculate_dashas(
        request.date, request.time,
        moon_longitude, request.timezone_offset
    )
    current_md = get_current_dasha(dashas)
    antardashas = calculate_antardashas(current_md)
    current_ad = get_current_antardasha(antardashas)

    # Auto detect topic from question
    topic = detect_topic(request.question)
    print(f"Detected topic: {topic} for question: {request.question}")

    # KP Analysis using detected topic
    promise = check_promise(topic, chart["cusps"], chart["planets"])
    timing = check_dasha_relevance(
        topic, current_md, current_ad,
        chart["planets"], chart["cusps"]
    )
    ruling_planets = get_ruling_planets(request.timezone_offset)

    # Package everything for LLM
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
            "antardasha": current_ad
        },
        "ruling_planets": ruling_planets
    }

    # Get prediction from Claude
    answer = get_prediction(chart_data, request.question, 
                       [{"question": h.question, "answer": h.answer} for h in request.history])

    return {
        "question": request.question,
        "answer": answer,
        "analysis": chart_data
    }


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
    history: list[HistoryItem] = []
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

from app.services.muhurtha_engine import find_muhurtha_windows
from app.services.llm_service import get_muhurtha_prediction

router = APIRouter()


class Participant(BaseModel):
    name: str
    date: str
    time: str
    latitude: float
    longitude: float
    timezone_offset: float = 5.5


class MuhurthaRequest(BaseModel):
    event_type: str           # Free-form text or preset key like "marriage"
    date_start: str           # "2026-04-15"
    date_end: str             # "2026-05-15"
    latitude: float           # birth/querent location (for natal RP analysis)
    longitude: float
    timezone_offset: float = 5.5
    nearby_days: int = 3
    participants: List[Participant] = []

    # NEW: event location (where the event actually happens)
    # If not provided, defaults to birth location above
    event_lat: Optional[float] = None
    event_lon: Optional[float] = None
    event_tz:  Optional[float] = None


class MuhurthaAnalyzeRequest(BaseModel):
    muhurtha_data: dict
    question: str
    history: List[dict] = []


@router.post("/find")
def find_muhurtha(request: MuhurthaRequest):
    return find_muhurtha_windows(
        date_start=request.date_start,
        date_end=request.date_end,
        event_type=request.event_type,
        lat=request.latitude,
        lon=request.longitude,
        tz_offset=request.timezone_offset,
        nearby_days=request.nearby_days,
        participants=[p.model_dump() for p in request.participants],
        event_lat=request.event_lat,
        event_lon=request.event_lon,
        event_tz=request.event_tz,
    )


@router.post("/analyze")
def analyze_muhurtha(request: MuhurthaAnalyzeRequest):
    """AI-powered deep analysis of muhurtha windows."""
    answer = get_muhurtha_prediction(
        request.muhurtha_data,
        request.question,
        request.history,
    )
    return {"answer": answer}

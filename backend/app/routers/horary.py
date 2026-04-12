from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.horary_engine import analyze_horary

router = APIRouter()


class HoraryRequest(BaseModel):
    number: int                          # 1-249
    question: str
    topic: str = "general"              # marriage/career/health/property/finance/children/travel/education/legal/general
    latitude: float = 17.385
    longitude: float = 78.4867
    timezone_offset: float = 5.5
    query_date: Optional[str] = None     # "YYYY-MM-DD" — defaults to today


@router.post("/analyze")
def horary_analyze(request: HoraryRequest):
    return analyze_horary(
        number=request.number,
        question=request.question,
        topic=request.topic,
        lat=request.latitude,
        lon=request.longitude,
        tz_offset=request.timezone_offset,
        query_date=request.query_date,
    )

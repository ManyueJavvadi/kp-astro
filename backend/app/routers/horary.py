"""
Horary router — PR A1.1 rewrite.

Breaking API changes from the previous router:
- `latitude`, `longitude`, `timezone_offset` are now REQUIRED (no Hyderabad
  fallback). Frontend must send the astrologer's CURRENT location — not
  the natal chart's location.
- New optional `query_time` (HH:MM) — pairs with `query_date` to give
  minute-precise horary moments.
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional

from app.services.horary_engine import analyze_horary

router = APIRouter()


class HoraryRequest(BaseModel):
    number: int = Field(..., ge=1, le=249)
    question: str
    topic: str = "general"
    latitude: float = Field(..., description="Astrologer's current latitude (degrees)")
    longitude: float = Field(..., description="Astrologer's current longitude (degrees)")
    timezone_offset: float = Field(..., description="Astrologer's local timezone offset from UTC (hours)")
    query_date: Optional[str] = None   # "YYYY-MM-DD"; omit to use server UTC now
    query_time: Optional[str] = None   # "HH:MM" 24h; paired with query_date


@router.post("/analyze")
def horary_analyze(request: HoraryRequest):
    return analyze_horary(
        number=request.number,
        question=request.question,
        topic=request.topic,
        latitude=request.latitude,
        longitude=request.longitude,
        timezone_offset=request.timezone_offset,
        query_date=request.query_date,
        query_time=request.query_time,
    )

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
    # PR A1.3-fix-24 — bounds added (number was already bounded; rest were not)
    number: int = Field(..., ge=1, le=249)
    question: str = Field(..., min_length=1, max_length=4000)
    topic: str = Field("general", max_length=60)
    latitude: float = Field(..., ge=-90, le=90, description="Astrologer's current latitude (degrees)")
    longitude: float = Field(..., ge=-180, le=180, description="Astrologer's current longitude (degrees)")
    timezone_offset: float = Field(..., ge=-14, le=14, description="Astrologer's local timezone offset from UTC (hours)")
    query_date: Optional[str] = Field(None, max_length=12)   # "YYYY-MM-DD"; omit to use server UTC now
    query_time: Optional[str] = Field(None, max_length=8)    # "HH:MM" 24h; paired with query_date


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

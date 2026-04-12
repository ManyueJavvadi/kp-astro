from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.transit_engine import analyze_transits

router = APIRouter()


class TransitRequest(BaseModel):
    natal: dict                     # Full workspace data from /astrologer/workspace
    transit_date: Optional[str] = None   # "YYYY-MM-DD" — defaults to today
    latitude: float = 17.385
    longitude: float = 78.4867
    timezone_offset: float = 5.5


@router.post("/analyze")
def transit_analyze(request: TransitRequest):
    return analyze_transits(
        natal=request.natal,
        transit_date=request.transit_date,
        lat=request.latitude,
        lon=request.longitude,
        tz_offset=request.timezone_offset,
    )

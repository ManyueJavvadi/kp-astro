from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional
from app.services.transit_engine import analyze_transits

router = APIRouter()


# PR A1.3-fix-24 — input bounds. Note: `natal` is still a free-form dict
# (defined by /astrologer/workspace shape; would need a 200-line model to
# tighten); the global 256KB request-body cap in main.py prevents
# unbounded growth attacks.
# Defaults for lat/lon/tz_offset retained for back-compat (Hyderabad
# fallback) but flagged as silent-failure-prone — frontend should always
# send the astrologer's CURRENT location for KP RP correctness.
class TransitRequest(BaseModel):
    natal: dict                     # Full workspace data from /astrologer/workspace
    transit_date: Optional[str] = Field(None, max_length=12)   # "YYYY-MM-DD" — defaults to today
    latitude: float = Field(17.385, ge=-90, le=90)
    longitude: float = Field(78.4867, ge=-180, le=180)
    timezone_offset: float = Field(5.5, ge=-14, le=14)


@router.post("/analyze")
def transit_analyze(request: TransitRequest):
    return analyze_transits(
        natal=request.natal,
        transit_date=request.transit_date,
        lat=request.latitude,
        lon=request.longitude,
        tz_offset=request.timezone_offset,
    )

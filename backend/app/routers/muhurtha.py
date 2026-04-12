from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

from app.services.muhurtha_engine import find_muhurtha_windows

router = APIRouter()


class Participant(BaseModel):
    name: str
    date: str
    time: str
    latitude: float
    longitude: float
    timezone_offset: float = 5.5


class MuhurthaRequest(BaseModel):
    event_type: str           # "marriage" | "business" | "house_warming" | "travel" | "education"
    date_start: str           # "2026-04-15"
    date_end: str             # "2026-05-15"
    latitude: float           # primary location for Lagna calculation
    longitude: float
    timezone_offset: float = 5.5
    nearby_days: int = 3
    participants: List[Participant] = []   # optional: natal charts for multi-person muhurtha


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
    )

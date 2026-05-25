from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, List

from app.services.muhurtha_engine import find_muhurtha_windows
from app.services.llm_service import get_muhurtha_prediction
from app.services.timezone_utils import resolve_birth_offset, resolve_timezone
from datetime import datetime as _dt

router = APIRouter()


# PR A1.3-fix-24 — input bounds across all models. Same caps as
# astrologer.py / prediction.py. Note: muhurtha_data is still a free-form
# dict (frontend builds it from /muhurtha/find output) — full schema
# tightening on that is deferred (Track A.1 muhurtha audit) since the
# engine's own field schema is the source of truth.
class Participant(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    date: str = Field(..., min_length=8, max_length=12)
    time: str = Field(..., min_length=4, max_length=8)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    timezone_offset: float = Field(5.5, ge=-14, le=14)
    # PR Mu4 — primary participant flag. Only the PRIMARY's
    # Chandrashtamam / Janma Tara / Badhakesh / Marakesh DBA hard-reject
    # the window; for secondaries these become soft_concerns. If no one
    # is explicitly flagged primary, the first participant in the list
    # is treated as primary by default.
    primary: bool = Field(False)


class MuhurthaRequest(BaseModel):
    event_type: str = Field(..., min_length=1, max_length=80)  # Free-form text or preset key like "marriage"
    date_start: str = Field(..., min_length=8, max_length=12)  # "2026-04-15"
    date_end: str = Field(..., min_length=8, max_length=12)    # "2026-05-15"
    latitude: float = Field(..., ge=-90, le=90)                # birth/querent location (for natal RP analysis)
    longitude: float = Field(..., ge=-180, le=180)
    timezone_offset: float = Field(5.5, ge=-14, le=14)
    nearby_days: int = Field(3, ge=0, le=30)
    participants: List[Participant] = Field(default_factory=list, max_length=10)

    # NEW: event location (where the event actually happens)
    # If not provided, defaults to birth location above
    event_lat: Optional[float] = Field(None, ge=-90, le=90)
    event_lon: Optional[float] = Field(None, ge=-180, le=180)
    event_tz:  Optional[float] = Field(None, ge=-14, le=14)


class MuhurthaAnalyzeRequest(BaseModel):
    muhurtha_data: dict
    question: str = Field(..., min_length=1, max_length=4000)
    history: List[dict] = Field(default_factory=list, max_length=20)


@router.post("/find")
def find_muhurtha(request: MuhurthaRequest):
    # PR A1.12 — resolve birth-date-correct offset for each participant
    # AND for the event location. Frontend's offset numbers are fallback
    # only — see timezone_utils.resolve_birth_offset for the bug story.
    participants_resolved = []
    for p in request.participants:
        p_dump = p.model_dump()
        _o, _ = resolve_birth_offset(
            p_dump["latitude"], p_dump["longitude"],
            p_dump["date"], p_dump["time"],
            fallback_offset=p_dump.get("timezone_offset", 5.5),
        )
        p_dump["timezone_offset"] = _o
        participants_resolved.append(p_dump)

    # Event location offset — resolve at the START of the search range
    # since muhurtha hunts typically span ≤30 days (within one DST window).
    event_lat = request.event_lat if request.event_lat is not None else request.latitude
    event_lon = request.event_lon if request.event_lon is not None else request.longitude
    try:
        _ev_dt = _dt.strptime(request.date_start, "%Y-%m-%d")
        _ev_off, _ = resolve_timezone(event_lat, event_lon, _ev_dt)
    except Exception:
        _ev_off = request.event_tz if request.event_tz is not None else request.timezone_offset
    # Querent (natal RP) location offset — resolved at today's date since
    # RPs are evaluated at the present moment of the consultation.
    _q_off, _ = resolve_timezone(request.latitude, request.longitude)

    return find_muhurtha_windows(
        date_start=request.date_start,
        date_end=request.date_end,
        event_type=request.event_type,
        lat=request.latitude,
        lon=request.longitude,
        tz_offset=_q_off,
        nearby_days=request.nearby_days,
        participants=participants_resolved,
        event_lat=event_lat,
        event_lon=event_lon,
        event_tz=_ev_off,
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

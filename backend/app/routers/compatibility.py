from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Optional
from app.services.compatibility_engine import compute_compatibility
from app.services.llm_service import get_match_prediction

router = APIRouter()


# PR A1.3-fix-24 — input bounds (see astrologer.py for rationale)
class PersonDetails(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    date: str = Field(..., min_length=8, max_length=12)           # "YYYY-MM-DD"
    time: str = Field(..., min_length=4, max_length=8)            # "HH:MM" 24-hour
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    timezone_offset: float = Field(5.5, ge=-14, le=14)
    gender: str = Field("", max_length=20)    # "male" | "female" | ""


class CompatibilityRequest(BaseModel):
    person1: PersonDetails
    person2: PersonDetails


class CompatibilityAnalyzeRequest(BaseModel):
    person1: PersonDetails
    person2: PersonDetails
    question: str = Field(..., min_length=1, max_length=4000)
    history: List[dict] = Field(default_factory=list, max_length=20)
    language: str = Field("telugu_english", max_length=20)


@router.post("/match")
def match_compatibility(request: CompatibilityRequest):
    return compute_compatibility(
        request.person1.model_dump(),
        request.person2.model_dump(),
    )


@router.post("/analyze")
def analyze_compatibility(request: CompatibilityAnalyzeRequest):
    """AI-powered deep analysis of marriage compatibility."""
    compat_result = compute_compatibility(
        request.person1.model_dump(),
        request.person2.model_dump(),
    )
    answer = get_match_prediction(
        compat_result,
        request.question,
        request.history,
        request.language,
    )
    return {"answer": answer}

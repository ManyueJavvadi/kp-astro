from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from app.services.compatibility_engine import compute_compatibility
from app.services.llm_service import get_match_prediction

router = APIRouter()


class PersonDetails(BaseModel):
    name: str
    date: str           # "YYYY-MM-DD"
    time: str           # "HH:MM" 24-hour
    latitude: float
    longitude: float
    timezone_offset: float = 5.5
    gender: str = ""    # "male" | "female" | ""


class CompatibilityRequest(BaseModel):
    person1: PersonDetails
    person2: PersonDetails


class CompatibilityAnalyzeRequest(BaseModel):
    person1: PersonDetails
    person2: PersonDetails
    question: str
    history: List[dict] = []
    language: str = "telugu_english"


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

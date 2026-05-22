import logging

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Optional
from app.services.compatibility_engine import compute_compatibility
from app.services.llm_service import get_match_prediction
from app.services import answer_cache

router = APIRouter()
_log = logging.getLogger("anthropic_audit")


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
    """AI-powered deep analysis of marriage compatibility.

    PR M1.11 — Server-side answer cache. Same couple + same question
    (case/whitespace-normalized) + same language + same IST calendar day +
    same history-tail = serve the previously-computed answer for $0.
    Cache key is symmetric in person1/person2 (swapping them hashes the
    same). 24h TTL — rolls at IST midnight so dasha "today" / RP-of-day
    drift doesn't serve stale advice. Mirrors the Analysis-tab cache
    pattern in get_prediction_stream.
    """
    p1_dump = request.person1.model_dump()
    p2_dump = request.person2.model_dump()

    cache_key = answer_cache.make_match_key(
        person1=p1_dump,
        person2=p2_dump,
        question=request.question,
        language=request.language,
        history=request.history,
    )
    cached = answer_cache.get(cache_key)
    if cached:
        cached_answer, _meta = cached
        # WARNING-level so the cache hit is Railway-visible and reconciles
        # against the [ENDPOINT_HIT] line for the same request id —
        # proves to the operator the response was free (no Anthropic call).
        _log.warning(
            "[ANSWER_CACHE_HIT] endpoint=/compatibility/analyze "
            "cost_usd=0.000000 chars=%d",
            len(cached_answer),
        )
        return {"answer": cached_answer, "cached": True}

    compat_result = compute_compatibility(p1_dump, p2_dump)
    answer = get_match_prediction(
        compat_result,
        request.question,
        request.history,
        request.language,
    )
    answer_cache.put(cache_key, answer, meta={"mode": "match", "language": request.language})
    return {"answer": answer, "cached": False}

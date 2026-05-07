"""
prediction.py — General-user analysis endpoint.

PR A1.3-fix-14: REVAMPED to use the shared `chart_pipeline.build_full_chart_data`
so general user mode now has IDENTICAL structural accuracy to astrologer mode.

Before this rev:
  /prediction/ask was missing compute_advanced_for_topic, transit bundle,
  Yogini Dasha, decision_support_score, sookshma fire-rank, gender, and
  age. The PCOD-for-male hallucination + age-hedging bugs (fixed for
  astrologer mode in PR A1.3a) were still active for general users.

After this rev:
  Backend compute is identical for both routes. Only the LLM output
  format differs (plain English narrative for user mode vs 7-section
  structured for astrologer mode), driven by the existing
  `IF MODE = USER:` branch in the system prompt.
"""

import json
import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List

# PR A1.3-fix-24 — proper logger instead of print() (was leaking full
# user questions to stdout; Railway retains stdout indefinitely).
_log = logging.getLogger("prediction")

from app.services.llm_service import get_prediction, get_prediction_stream, detect_topic
from app.services.chart_pipeline import build_full_chart_data

router = APIRouter()


# PR A1.3-fix-24 — input bounds. Same rationale as astrologer.py.
class HistoryItem(BaseModel):
    question: str = Field(..., max_length=4000)
    answer: str = Field(..., max_length=12000)  # AI answers are larger; cap above worst-case


class PredictionRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    date: str = Field(..., min_length=8, max_length=12)
    time: str = Field(..., min_length=4, max_length=8)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    timezone_offset: float = Field(5.5, ge=-14, le=14)
    # PR A1.3-fix-14 — gender now wired through to backend so the
    # NATIVE PROFILE block reaches the LLM. Without this, the AI guesses
    # gender from name (caused PCOD predictions for males).
    gender: str = Field("", max_length=20)
    topic: str = Field("auto", max_length=60)
    question: str = Field(..., min_length=1, max_length=4000)
    history: List[HistoryItem] = Field(default_factory=list, max_length=20)
    mode: str = Field("user", max_length=20)


@router.post("/ask")
def ask_prediction(request: PredictionRequest):
    # Topic detection — same Haiku call used by astrologer mode. Detected
    # topic feeds into advanced_compute_for_topic so significators are
    # weighted for the right life domain.
    topic = (
        request.topic
        if request.topic and request.topic != "auto"
        else detect_topic(request.question)
    )
    # PR A1.3-fix-24 — log only metadata (mode + topic + question length),
    # never the question body. Question text is PII.
    _log.info("ask mode=%s topic=%s qlen=%d", request.mode, topic, len(request.question))

    # Single shared pipeline — same compute as /astrologer/analyze.
    chart_data = build_full_chart_data(
        name=request.name,
        date=request.date,
        time=request.time,
        latitude=request.latitude,
        longitude=request.longitude,
        timezone_offset=request.timezone_offset,
        gender=request.gender,
        topic=topic,
    )

    # Strip internal-only keys before passing to LLM formatter / response.
    chart_raw = chart_data.pop("_chart_raw")
    chart_data.pop("_moon_longitude", None)

    answer = get_prediction(
        chart_data,
        request.question,
        [{"question": h.question, "answer": h.answer} for h in request.history],
        mode=request.mode,
        topic=topic,  # PR A1.3-fix-1 — skip detect_topic re-call inside get_prediction
    )

    # Response shape — backwards-compat with existing frontend, but now
    # includes the rich engine signals so the user-mode UI can render
    # confidence bars, timing strips, active-question panels, etc.
    return {
        "question": request.question,
        "answer": answer,
        "analysis": {
            "name": request.name,
            "gender": chart_data.get("gender", ""),
            "age_years": chart_data.get("age_years", 0),
            "birth_date": chart_data.get("birth_date", ""),
            "promise_analysis": chart_data.get("promise_analysis", {}),
            "timing_analysis": chart_data.get("timing_analysis", {}),
            "current_dasha": chart_data.get("current_dasha", {}),
            "upcoming_antardashas": chart_data.get("upcoming_antardashas", []),
            "ruling_planets": chart_data.get("ruling_planets", {}),
            "significators": chart_data.get("significators", {}),
            "planet_positions": chart_data.get("planet_positions", {}),
            # PR A1.3-fix-14 — expose advanced compute summary fields the
            # new user-mode UI will render (verdict card, confidence bar,
            # timing strip, active-question panel).
            "advanced_compute": chart_data.get("advanced_compute", {}),
            "decision_support": chart_data.get("decision_support", {}),
            "dasha_conflicts": chart_data.get("dasha_conflicts", []),
            "transits": chart_data.get("transits", {}),
            "yogini_dasha": chart_data.get("yogini_dasha", {}),
            "chart_summary": {
                "planets": chart_raw["planets"],
                "cusps": chart_raw["cusps"],
            },
        },
        "mode": request.mode,
        "detected_topic": topic,
    }


# ════════════════════════════════════════════════════════════════
# STREAMING ENDPOINT (PR A1.3-fix-16)
# ════════════════════════════════════════════════════════════════
# Server-Sent Events (SSE) variant of /ask. Frontend's UserModeUI
# uses this for premium UX — first token visible in 1-2s instead of
# 60-120s. Same backend compute pipeline; only the LLM call differs
# (streaming vs blocking).
#
# SSE event types yielded:
#   - "analysis"  — initial event with the rich engine compute output
#                   (decision_support, advanced_compute, current_dasha,
#                   upcoming_antardashas, etc) that powers the
#                   HeroVerdictCard, TimingStrip, ActiveAnalysisPanel.
#                   Sent FIRST so the UI can render the verdict card
#                   shell before any text arrives.
#   - "chunk"     — text token from the LLM response. Frontend appends
#                   to the message bubble in real time.
#   - "done"      — stream complete; signals frontend to stop reading.
#   - "error"     — error during stream; frontend shows fallback.

@router.post("/ask-stream")
async def ask_prediction_stream(request: PredictionRequest):
    topic = (
        request.topic
        if request.topic and request.topic != "auto"
        else detect_topic(request.question)
    )
    _log.info("ask-stream mode=%s topic=%s qlen=%d", request.mode, topic, len(request.question))

    chart_data = build_full_chart_data(
        name=request.name,
        date=request.date,
        time=request.time,
        latitude=request.latitude,
        longitude=request.longitude,
        timezone_offset=request.timezone_offset,
        gender=request.gender,
        topic=topic,
    )
    chart_raw = chart_data.pop("_chart_raw")
    chart_data.pop("_moon_longitude", None)

    # Build the analysis payload that the frontend renders for the
    # HeroVerdictCard / TimingStrip / ActiveAnalysisPanel. Sent BEFORE
    # the text stream so the UI shell can render immediately.
    analysis_payload = {
        "name": request.name,
        "gender": chart_data.get("gender", ""),
        "age_years": chart_data.get("age_years", 0),
        "birth_date": chart_data.get("birth_date", ""),
        "promise_analysis": chart_data.get("promise_analysis", {}),
        "timing_analysis": chart_data.get("timing_analysis", {}),
        "current_dasha": chart_data.get("current_dasha", {}),
        "upcoming_antardashas": chart_data.get("upcoming_antardashas", []),
        "ruling_planets": chart_data.get("ruling_planets", {}),
        "significators": chart_data.get("significators", {}),
        "planet_positions": chart_data.get("planet_positions", {}),
        "advanced_compute": chart_data.get("advanced_compute", {}),
        "decision_support": chart_data.get("decision_support", {}),
        "dasha_conflicts": chart_data.get("dasha_conflicts", []),
        "transits": chart_data.get("transits", {}),
        "yogini_dasha": chart_data.get("yogini_dasha", {}),
        "chart_summary": {
            "planets": chart_raw["planets"],
            "cusps": chart_raw["cusps"],
        },
    }

    # Phase 2 cache key inputs
    # PR A1.3-fix-17 — added timezone_offset (was missing; two users
    # with same birth_time but different TZ could collide).
    cache_input = {
        "birth_date": request.date,
        "birth_time": request.time,
        "latitude": request.latitude,
        "longitude": request.longitude,
        "timezone_offset": request.timezone_offset,
        "gender": request.gender,
        "topic": topic,
        "mode": request.mode,
        "question": request.question,
    }

    async def event_stream():
        try:
            # First event: the full analysis payload for the UI shell
            yield f"event: analysis\ndata: {json.dumps(analysis_payload, default=str)}\n\n"

            # Then stream the LLM text in chunks
            async for chunk in get_prediction_stream(
                chart_data,
                request.question,
                [{"question": h.question, "answer": h.answer} for h in request.history],
                mode=request.mode,
                topic=topic,
                cache_key_input=cache_input,
            ):
                # SSE event with the text chunk
                # JSON-encode to safely handle newlines/special chars
                yield f"event: chunk\ndata: {json.dumps({'text': chunk})}\n\n"

            yield "event: done\ndata: {}\n\n"
        except Exception as e:
            # PR A1.3-fix-24 — log full error server-side, return generic
            # message to client. str(e) was leaking SDK internals + paths.
            _log.exception("ask-stream failed: %s", e)
            err_payload = json.dumps({"error": "stream_failed"})
            yield f"event: error\ndata: {err_payload}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable proxy buffering for streams
        },
    )


# ════════════════════════════════════════════════════════════════
# Cache stats endpoint (PR A1.3-fix-17 — admin / debugging)
# ════════════════════════════════════════════════════════════════
# Lets us verify hit rate after launch. Call:
#   GET /prediction/cache-stats
# Returns: {entries, hits, misses, hit_rate_pct}.
# Not auth-protected for now — fine because the endpoint reveals only
# aggregate counts, not any cached content. Add basic auth before
# exposing publicly.

@router.get("/cache-stats")
def cache_stats():
    from app.services import answer_cache
    return answer_cache.stats()

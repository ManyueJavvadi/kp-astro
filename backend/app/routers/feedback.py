"""Feedback router.

PR A1.3-fix-24 — bounded the in-memory store (was unbounded module-level
list — memory leak under sustained traffic). Field-level Pydantic
constraints to prevent attacker-crafted huge string DoS. Switched
datetime.now() → IST helper for consistent timestamps. Switched logger
in place of bare print fallback.

Note: data still persists only until process restart. The TODO to move
to a real DB is part of Track B (auth + persistence). For now, bounded
in-memory is sufficient for prelaunch.
"""

from collections import deque
from fastapi import APIRouter
from pydantic import BaseModel, Field
import logging

from app.services.today import now_ist

router = APIRouter()
_log = logging.getLogger("feedback")

# PR A1.3-fix-24 — bounded deque (oldest dropped at capacity).
# Was an unbounded list which would grow forever in memory.
_MAX_FEEDBACK_ENTRIES = 5000
feedback_store: "deque[dict]" = deque(maxlen=_MAX_FEEDBACK_ENTRIES)


class FeedbackRequest(BaseModel):
    # PR A1.3-fix-24 — input length caps to prevent attacker-crafted DoS.
    # `correction` is "correct" / "incorrect" today (binary signal from FE)
    # but typed as free string for forward-compat with future free-text
    # corrections. Cap accommodates both.
    prediction_id: str = Field(..., min_length=1, max_length=80)
    original_answer: str = Field("", max_length=12000)
    correction: str = Field("", max_length=4000)
    notes: str = Field("", max_length=4000)


@router.post("/submit")
def submit_feedback(request: FeedbackRequest):
    feedback_store.append({
        "timestamp": now_ist().isoformat(),
        "prediction_id": request.prediction_id,
        "original_answer": request.original_answer,
        "correction": request.correction,
        "notes": request.notes,
    })
    return {"status": "Feedback recorded", "total_feedback": len(feedback_store)}

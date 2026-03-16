from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

feedback_store = []  # temporary in-memory store, will move to database later

class FeedbackRequest(BaseModel):
    prediction_id: str
    original_answer: str
    correction: str
    notes: str

@router.post("/submit")
def submit_feedback(request: FeedbackRequest):
    feedback_store.append({
        "timestamp": datetime.now().isoformat(),
        "prediction_id": request.prediction_id,
        "original_answer": request.original_answer,
        "correction": request.correction,
        "notes": request.notes
    })
    return {"status": "Feedback recorded", "total_feedback": len(feedback_store)}
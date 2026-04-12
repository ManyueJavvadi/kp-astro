from fastapi import APIRouter
from pydantic import BaseModel
from app.services.compatibility_engine import compute_compatibility

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


@router.post("/match")
def match_compatibility(request: CompatibilityRequest):
    return compute_compatibility(
        request.person1.model_dump(),
        request.person2.model_dump(),
    )

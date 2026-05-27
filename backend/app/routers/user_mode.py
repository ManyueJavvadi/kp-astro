"""Consumer User Mode API facade.

These endpoints are adapters over existing engines. They do not change
Astrologer Mode behavior or shared KP calculation services.
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.user_mode_facade import (
    DEFAULT_PUBLIC_TOPICS,
    build_public_compatibility,
    build_public_dashboard,
    build_public_horary,
    build_public_muhurtha,
)

router = APIRouter()


class PublicChartRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    date: str = Field(..., min_length=8, max_length=12)
    time: str = Field(..., min_length=4, max_length=8)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    timezone_offset: float = Field(5.5, ge=-14, le=14)
    gender: str = Field("", max_length=20)
    live_latitude: Optional[float] = Field(None, ge=-90, le=90)
    live_longitude: Optional[float] = Field(None, ge=-180, le=180)
    live_timezone_offset: Optional[float] = Field(None, ge=-14, le=14)


class PublicDashboardRequest(PublicChartRequest):
    topics: List[str] = Field(default_factory=lambda: list(DEFAULT_PUBLIC_TOPICS), max_length=12)


class PublicPersonDetails(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    date: str = Field(..., min_length=8, max_length=12)
    time: str = Field(..., min_length=4, max_length=8)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    timezone_offset: float = Field(5.5, ge=-14, le=14)
    gender: str = Field("", max_length=20)


class PublicCompatibilityRequest(BaseModel):
    person1: PublicPersonDetails
    person2: PublicPersonDetails
    user_concerns: Optional[str] = Field(None, max_length=2000)


class PublicHoraryRequest(BaseModel):
    number: int = Field(..., ge=1, le=249)
    question: str = Field(..., min_length=1, max_length=4000)
    topic: str = Field("general", max_length=60)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    timezone_offset: float = Field(..., ge=-14, le=14)
    query_date: Optional[str] = Field(None, max_length=12)
    query_time: Optional[str] = Field(None, max_length=8)


class PublicMuhurthaParticipant(PublicPersonDetails):
    primary: bool = Field(False)


class PublicMuhurthaRequest(BaseModel):
    event_type: str = Field(..., min_length=1, max_length=80)
    date_start: str = Field(..., min_length=8, max_length=12)
    date_end: str = Field(..., min_length=8, max_length=12)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    timezone_offset: float = Field(5.5, ge=-14, le=14)
    nearby_days: int = Field(3, ge=0, le=30)
    participants: List[PublicMuhurthaParticipant] = Field(default_factory=list, max_length=10)
    event_lat: Optional[float] = Field(None, ge=-90, le=90)
    event_lon: Optional[float] = Field(None, ge=-180, le=180)
    event_tz: Optional[float] = Field(None, ge=-14, le=14)
    advanced_dosha_check: Optional[bool] = Field(None)
    travel_direction: Optional[str] = Field(None, max_length=20)
    surgery_body_part: Optional[str] = Field(None, max_length=40)


@router.post("/dashboard")
def public_dashboard(request: PublicDashboardRequest):
    return build_public_dashboard(request.model_dump(), topics=request.topics)


@router.post("/compatibility")
def public_compatibility(request: PublicCompatibilityRequest):
    return build_public_compatibility(
        request.person1.model_dump(),
        request.person2.model_dump(),
        user_concerns=request.user_concerns,
    )


@router.post("/horary")
def public_horary(request: PublicHoraryRequest):
    return build_public_horary(request.model_dump())


@router.post("/muhurtha")
def public_muhurtha(request: PublicMuhurthaRequest):
    return build_public_muhurtha(request.model_dump())


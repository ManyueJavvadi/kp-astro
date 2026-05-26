from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.services.chart_engine import (
    generate_chart, calculate_dashas, get_current_dasha,
    calculate_antardashas, get_current_antardasha,
    get_all_house_significators, check_promise,
    check_dasha_relevance, get_ruling_planets
)
from app.services.timezone_utils import resolve_birth_offset
from app.services.chart_pipeline import _resolve_rp_triple, build_rp_meta

router = APIRouter()

# PR A1.3-fix-24 — input bounds + dropped duplicate chart_engine import
# block that lived between class defs (dead code).
class ChartRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    date: str = Field(..., min_length=8, max_length=12)
    time: str = Field(..., min_length=4, max_length=8)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    timezone_offset: float = Field(5.5, ge=-14, le=14)
    live_latitude: float | None = Field(None, ge=-90, le=90)
    live_longitude: float | None = Field(None, ge=-180, le=180)
    live_timezone_offset: float | None = Field(None, ge=-14, le=14)


@router.post("/generate")
def get_chart(request: ChartRequest):
    # PR A1.12 — Override caller-supplied timezone_offset with the
    # birth-date-correct value resolved from lat/lon + birth date.
    # Pre-fix: frontend's `timezone_offset: 5.5` default leaked through
    # for every non-IST birthplace whose place-picker lookup silently
    # failed → ~12.5h error → wrong lagna / cusps / dashas.
    tz_offset, tz_name = resolve_birth_offset(
        request.latitude, request.longitude,
        request.date, request.time,
        fallback_offset=request.timezone_offset,
    )
    # PR A1.3-fix-24 — was silently dropping caller-supplied timezone_offset
    # (passed only 4 positional args). Non-IST callers got wrong charts.
    chart = generate_chart(
        request.date, request.time,
        request.latitude, request.longitude,
        tz_offset,
    )
    moon_longitude = chart["planets"]["Moon"]["longitude"]
    dashas = calculate_dashas(request.date, request.time, moon_longitude, tz_offset)
    current_md = get_current_dasha(dashas)
    antardashas = calculate_antardashas(current_md)
    current_ad = get_current_antardasha(antardashas)
    all_significators = get_all_house_significators(chart["planets"], chart["cusps"])
    # Shared rp triple resolver — all-or-nothing on live (never mix live
    # lat/lon with natal tz, see chart_pipeline._resolve_rp_triple docstring).
    rp_lat, rp_lon, rp_tz, rp_source = _resolve_rp_triple(
        natal_lat=request.latitude, natal_lon=request.longitude, natal_tz=tz_offset,
        live_lat=request.live_latitude, live_lon=request.live_longitude,
        live_tz=request.live_timezone_offset,
    )
    ruling_planets = get_ruling_planets(rp_lat, rp_lon, rp_tz)
    rp_meta = build_rp_meta(rp_lat, rp_lon, rp_tz, source=rp_source)

    return {
        "name": request.name,
        "chart": chart,
        "timezone_resolved": {"offset": tz_offset, "iana": tz_name},
        "dashas": {
            "all_periods": dashas,
            "current_mahadasha": current_md,
            "current_antardasha": current_ad,
        },
        "significators": all_significators,
        "ruling_planets": ruling_planets,
        # rp_meta — see services/chart_pipeline.build_rp_meta. Frontend
        # uses this to render the RP source pill + per-tab inline labels.
        "rp_meta": rp_meta,
    }


class TopicRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    date: str = Field(..., min_length=8, max_length=12)
    time: str = Field(..., min_length=4, max_length=8)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    timezone_offset: float = Field(5.5, ge=-14, le=14)
    topic: str = Field(..., min_length=1, max_length=60)
    live_latitude: float | None = Field(None, ge=-90, le=90)
    live_longitude: float | None = Field(None, ge=-180, le=180)
    live_timezone_offset: float | None = Field(None, ge=-14, le=14)

@router.post("/analyze")
def analyze_topic(request: TopicRequest):
    # PR A1.12 — resolve birth-date-correct UTC offset from lat/lon
    tz_offset, _ = resolve_birth_offset(
        request.latitude, request.longitude,
        request.date, request.time,
        fallback_offset=request.timezone_offset,
    )
    # Generate full chart
    chart = generate_chart(
        request.date, request.time,
        request.latitude, request.longitude,
        tz_offset,
    )

    moon_longitude = chart["planets"]["Moon"]["longitude"]
    dashas = calculate_dashas(
        request.date, request.time,
        moon_longitude, tz_offset,
    )
    current_md = get_current_dasha(dashas)
    antardashas = calculate_antardashas(current_md)
    current_ad = get_current_antardasha(antardashas)

    # Topic specific analysis
    promise = check_promise(request.topic, chart["cusps"], chart["planets"])
    timing = check_dasha_relevance(
        request.topic, current_md, current_ad,
        chart["planets"], chart["cusps"]
    )
    # Shared rp triple resolver — all-or-nothing on live (see chart.py:/generate
     # for the rationale; same pattern keeps the source signal consistent).
    rp_lat, rp_lon, rp_tz, rp_source = _resolve_rp_triple(
        natal_lat=request.latitude, natal_lon=request.longitude, natal_tz=tz_offset,
        live_lat=request.live_latitude, live_lon=request.live_longitude,
        live_tz=request.live_timezone_offset,
    )
    ruling_planets = get_ruling_planets(rp_lat, rp_lon, rp_tz)
    rp_meta = build_rp_meta(rp_lat, rp_lon, rp_tz, source=rp_source)

    return {
        "name": request.name,
        "topic": request.topic,
        "chart_summary": {
            "planets": chart["planets"],
            "cusps": chart["cusps"]
        },
        "promise_analysis": promise,
        "timing_analysis": timing,
        "current_dasha": {
            "mahadasha": current_md,
            "antardasha": current_ad
        },
        "ruling_planets": ruling_planets,
        # rp_meta — see services/chart_pipeline.build_rp_meta. Frontend
        # uses this to render the RP source pill + per-tab inline labels.
        "rp_meta": rp_meta,
    }
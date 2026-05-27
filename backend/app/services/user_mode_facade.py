"""Public User Mode facade.

This module is intentionally add-only: it adapts existing KP engines into
consumer-safe DTOs without changing astrologer/backend calculation logic.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Iterable, Optional

from app.services.chart_engine import (
    calculate_antardashas,
    calculate_dashas,
    check_dasha_relevance,
    check_promise,
    generate_chart,
    get_current_antardasha,
    get_current_dasha,
    get_planet_house_positions,
    get_ruling_planets,
    get_topic_data,
    resolve_topic_alias,
)
from app.services.chart_pipeline import _resolve_rp_triple, build_rp_meta
from app.services.compatibility_engine import compute_compatibility
from app.services.horary_engine import analyze_horary
from app.services.kp_advanced_compute import compute_advanced_for_topic
from app.services.muhurtha_engine import find_muhurtha_windows
from app.services.timezone_utils import resolve_birth_offset, resolve_timezone


DEFAULT_PUBLIC_TOPICS = [
    "job",
    "business",
    "wealth",
    "marriage",
    "children",
    "education_higher",
    "foreign_settle",
    "property",
]

TOPIC_LABELS = {
    "job": "Career",
    "business": "Business",
    "wealth": "Money",
    "marriage": "Marriage",
    "children": "Children",
    "education_higher": "Higher Education",
    "foreign_settle": "Foreign Settlement",
    "property": "Property",
    "health": "Wellbeing",
    "litigation": "Legal Dispute",
}

SENSITIVE_TOPICS = {"children", "health", "litigation", "divorce", "longevity"}


def _as_planet_slots(ruling_planets: dict) -> list[dict]:
    """Normalize RP payloads to the list shape advanced compute expects."""
    slots = ruling_planets.get("slot_assignments") or ruling_planets.get("ruling_planets") or []
    normalized = []
    for item in slots:
        if isinstance(item, dict):
            normalized.append(item)
        elif isinstance(item, str):
            normalized.append({"planet": item, "slot": "Ruling Planet"})
    return normalized


def _safe_get(obj: Any, *path: str, default: Any = None) -> Any:
    cur = obj
    for key in path:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(key)
    return default if cur is None else cur


def _public_status(promise: dict, timing: dict, advanced: dict) -> str:
    verdict = promise.get("verdict")
    confidence = int(advanced.get("confidence_score") or 0)
    md_ok = bool(timing.get("mahadasha_relevant"))
    ad_ok = bool(timing.get("antardasha_relevant"))

    if verdict == "Denied":
        return "blocked"
    if verdict == "Promised" and (ad_ok or md_ok or confidence >= 60):
        return "supportive"
    if verdict in {"Promised", "Conditional"}:
        return "mixed"
    return "unclear"


def _public_claim_level(topic: str) -> str:
    if topic in SENSITIVE_TOPICS:
        return "cautious"
    return "standard"


def _build_life_area(
    topic: str,
    chart: dict,
    current_md: dict,
    current_ad: dict,
    antardashas: list[dict],
    ruling_planets: dict,
) -> dict:
    canonical = resolve_topic_alias(topic)
    topic_data = get_topic_data(canonical) or {}
    planets = chart["planets"]
    cusps = chart["cusps"]
    planet_positions = get_planet_house_positions(planets, cusps)

    promise = check_promise(canonical, cusps, planets)
    timing = check_dasha_relevance(canonical, current_md, current_ad, planets, cusps)
    rp_slots = _as_planet_slots(ruling_planets)
    advanced = compute_advanced_for_topic(
        canonical,
        planets,
        cusps,
        planet_positions,
        rp_slots,
        current_md.get("lord"),
        current_ad.get("antardasha_lord") or current_ad.get("lord"),
        antardashas[:9],
        promise_verdict=promise.get("verdict"),
    )

    primary_cusp = topic_data.get("primary_cusp") or (promise.get("primary_cusp"))
    csl = _safe_get(chart, "cusps", f"House_{primary_cusp}", "sub_lord") if primary_cusp else None

    return {
        "topic": canonical,
        "label": TOPIC_LABELS.get(canonical, canonical.replace("_", " ").title()),
        "status": _public_status(promise, timing, advanced),
        "claim_level": _public_claim_level(canonical),
        "verdict": promise.get("verdict", "Inconclusive"),
        "confidence": advanced.get("confidence_score"),
        "framing": topic_data.get("framing"),
        "primary_cusp": primary_cusp,
        "primary_cusp_sublord": csl or promise.get("primary_cusp_sublord"),
        "relevant_houses": topic_data.get("relevant") or promise.get("relevant_houses", []),
        "denial_houses": topic_data.get("denial") or promise.get("denial_houses", []),
        "timing": {
            "mahadasha_lord": current_md.get("lord"),
            "antardasha_lord": current_ad.get("antardasha_lord") or current_ad.get("lord"),
            "mahadasha_relevant": timing.get("mahadasha_relevant"),
            "antardasha_relevant": timing.get("antardasha_relevant"),
            "rp_overlap": advanced.get("rp_overlap", {}),
            "upcoming_triggers": advanced.get("ad_sublord_triggers", [])[:3],
        },
        "proof": {
            "promise": promise,
            "star_sub_harmony": advanced.get("star_sub_harmony"),
            "fruitful_significators": advanced.get("fruitful_significators", []),
        },
        "consumer_caveat": (
            "Use as a careful tendency, not a guarantee."
            if _public_claim_level(canonical) == "cautious"
            else "Timing support shows tendency, not a guaranteed event."
        ),
    }


def build_public_dashboard(request: dict, topics: Optional[Iterable[str]] = None) -> dict:
    """Return a public dashboard DTO from existing chart engines."""
    tz_offset, tz_name = resolve_birth_offset(
        request["latitude"],
        request["longitude"],
        request["date"],
        request["time"],
        fallback_offset=request.get("timezone_offset", 5.5),
    )
    chart = generate_chart(
        request["date"],
        request["time"],
        request["latitude"],
        request["longitude"],
        tz_offset,
    )
    dashas = calculate_dashas(request["date"], request["time"], chart["planets"]["Moon"]["longitude"], tz_offset)
    current_md = get_current_dasha(dashas)
    antardashas = calculate_antardashas(current_md)
    current_ad = get_current_antardasha(antardashas)

    rp_lat, rp_lon, rp_tz, rp_source = _resolve_rp_triple(
        natal_lat=request["latitude"],
        natal_lon=request["longitude"],
        natal_tz=tz_offset,
        live_lat=request.get("live_latitude"),
        live_lon=request.get("live_longitude"),
        live_tz=request.get("live_timezone_offset"),
    )
    ruling_planets = get_ruling_planets(rp_lat, rp_lon, rp_tz)
    rp_meta = build_rp_meta(rp_lat, rp_lon, rp_tz, source=rp_source)

    selected_topics = list(topics or DEFAULT_PUBLIC_TOPICS)
    life_areas = []
    for topic in selected_topics[:12]:
        try:
            life_areas.append(
                _build_life_area(topic, chart, current_md, current_ad, antardashas, ruling_planets)
            )
        except Exception as exc:
            life_areas.append({
                "topic": topic,
                "label": TOPIC_LABELS.get(topic, topic.replace("_", " ").title()),
                "status": "unavailable",
                "error": str(exc),
            })

    return {
        "mode": "user_public_dashboard",
        "profile": {
            "name": request["name"],
            "date": request["date"],
            "time": request["time"],
            "gender": request.get("gender", ""),
            "timezone_resolved": {"offset": tz_offset, "iana": tz_name},
        },
        "chart_snapshot": {
            "lagna": _safe_get(chart, "cusps", "House_1", "sign"),
            "lagna_sublord": _safe_get(chart, "cusps", "House_1", "sub_lord"),
            "moon_sign": _safe_get(chart, "planets", "Moon", "sign"),
            "moon_nakshatra": _safe_get(chart, "planets", "Moon", "nakshatra"),
            "ayanamsa": chart.get("ayanamsa"),
            "house_system": chart.get("house_system"),
        },
        "current_period": {
            "mahadasha": current_md,
            "antardasha": current_ad,
            "next_antardashas": antardashas[:5],
        },
        "ruling_planets": ruling_planets,
        "rp_meta": rp_meta,
        "life_areas": life_areas,
        "trust": {
            "engine": "Existing strict KP backend",
            "public_claim_policy": "Deterministic backend decides; UI and AI explain.",
            "exact_timing_policy": "Dasha timing is shown as supportive periods unless a dedicated muhurtha/horary engine returns exact windows.",
        },
    }


def build_public_compatibility(person1: dict, person2: dict, user_concerns: str | None = None) -> dict:
    raw = compute_compatibility(person1, person2, user_concerns=user_concerns)
    score = _safe_get(raw, "ashtakoota", "total_score", default=0)
    max_score = _safe_get(raw, "ashtakoota", "max_score", default=36) or 36
    pct = round((score / max_score) * 100) if max_score else 0
    if pct >= 72:
        status = "strong"
    elif pct >= 50:
        status = "workable"
    else:
        status = "caution"
    return {
        "mode": "user_public_compatibility",
        "summary": {
            "status": status,
            "score": score,
            "max_score": max_score,
            "percentage": pct,
            "verdict": raw.get("overall_verdict"),
            "claim_level": "cautious",
            "consumer_caveat": "Compatibility combines traditional matching and KP evidence; it is guidance, not a guarantee.",
        },
        "engine_payload": raw,
    }


def build_public_horary(request: dict) -> dict:
    payload = dict(request)
    try:
        if payload.get("query_date") and payload.get("query_time"):
            query_dt = datetime.strptime(
                f"{payload['query_date']} {payload['query_time']}",
                "%Y-%m-%d %H:%M",
            )
            tz_offset, _ = resolve_timezone(payload["latitude"], payload["longitude"], query_dt)
        else:
            tz_offset, _ = resolve_timezone(payload["latitude"], payload["longitude"])
        payload["timezone_offset"] = tz_offset
    except Exception:
        pass
    raw = analyze_horary(**payload)
    verdict = _safe_get(raw, "verdict", "verdict", default="MAYBE")
    confidence = _safe_get(raw, "verdict", "confidence", default=raw.get("confidence_score"))
    return {
        "mode": "user_public_horary",
        "summary": {
            "number": raw.get("prashna_number") or request.get("number"),
            "verdict": verdict,
            "confidence": confidence,
            "claim_level": "cautious",
            "consumer_caveat": "Horary answers the exact question at the casting moment; do not reuse the verdict for a different question.",
        },
        "engine_payload": raw,
    }


def build_public_muhurtha(request: dict) -> dict:
    participants = []
    for participant in request.get("participants", []) or []:
        p = dict(participant)
        try:
            offset, _ = resolve_birth_offset(
                p["latitude"],
                p["longitude"],
                p["date"],
                p["time"],
                fallback_offset=p.get("timezone_offset", 5.5),
            )
            p["timezone_offset"] = offset
        except Exception:
            pass
        participants.append(p)

    event_lat = request.get("event_lat")
    if event_lat is None:
        event_lat = request["latitude"]
    event_lon = request.get("event_lon")
    if event_lon is None:
        event_lon = request["longitude"]
    try:
        event_dt = datetime.strptime(request["date_start"], "%Y-%m-%d")
        event_tz, _ = resolve_timezone(event_lat, event_lon, event_dt)
    except Exception:
        event_tz = request.get("event_tz", request.get("timezone_offset", 5.5))
    try:
        query_tz, _ = resolve_timezone(request["latitude"], request["longitude"])
    except Exception:
        query_tz = request.get("timezone_offset", 5.5)

    raw = find_muhurtha_windows(
        date_start=request["date_start"],
        date_end=request["date_end"],
        event_type=request["event_type"],
        lat=request["latitude"],
        lon=request["longitude"],
        tz_offset=query_tz,
        nearby_days=request.get("nearby_days", 3),
        participants=participants,
        event_lat=event_lat,
        event_lon=event_lon,
        event_tz=event_tz,
        advanced_dosha_check=request.get("advanced_dosha_check"),
        travel_direction=request.get("travel_direction"),
        surgery_body_part=request.get("surgery_body_part"),
    )
    windows = raw.get("windows") or raw.get("selected_windows") or []
    best = windows[0] if windows else None
    return {
        "mode": "user_public_muhurtha",
        "summary": {
            "event_type": request.get("event_type"),
            "window_count": len(windows),
            "best_window": best,
            "claim_level": "standard",
            "consumer_caveat": "Use only passed windows as favorable. Soft-flagged or rejected windows should not be presented as auspicious.",
        },
        "engine_payload": raw,
    }

"""
multi_chart_engine.py — Multi-chart analysis orchestrator.

PR MultiChart-Phase-2 (May 2026) — initial scaffolding.
PR MultiChart-Phase-4 (May 2026) — added PLANETARY POSITIONS + HOUSE
  CUSPS + HOUSE SIGNIFICATORS tables to the compact formatter (the
  "verbatim discipline" fix for Venus / Jupiter / Shadbala bugs).
PR MultiChart-Phase-5 (May 2026) — DELETED the compact formatter.
  Per-chart context is now the goated single-chart format_chart_for_llm
  output.  The "20% new" lives in cross_chart_engine.py + the multi-
  chart system prompt extensions (MC1-MC10).

This module is the orchestrator for the multi-chart analysis flow
(`/astrologer/multi-analyze-stream`).  It takes 2-4 charts + a question
and produces a structured "multi-chart context" dict that the LLM
function `get_multi_chart_prediction()` consumes.

Architecture (post-Phase-5):

  LAYER 1: build_full_chart_data() per chart                  ← sacred
  LAYER 2: cross_chart_engine.compute_all(...)                ← NEW Phase 5
  LAYER 3: multi-chart KB + per-topic KB                      ← sacred-style
  LAYER 4: get_system_prompt() + MC1-MC10 extensions          ← llm_service

This module is responsible for LAYER 1 + LAYER 2 + assembling the
context dict consumed by LAYER 4.

Sacred-region discipline:
  - Reuses chart_pipeline.build_full_chart_data() per chart UNCHANGED
  - Reuses chart_pipeline.build_rp_meta() for SHARED rp_meta
  - Reuses detect_topic() with LRU cache
  - Calls cross_chart_engine.compute_all() for cross-chart primitives
  - Does NOT modify format_chart_for_llm (the goated formatter)
  - Does NOT build prompts (that is llm_service)
  - Does NOT call Anthropic (that is llm_service)
"""
from __future__ import annotations

import logging
from typing import Any

from app.services.chart_pipeline import (
    build_full_chart_data,
    _resolve_rp_triple,
    build_rp_meta,
)
from app.services.llm_service import detect_topic
from app.services.chart_engine import get_ruling_planets
from app.services.cross_chart_engine import (
    compute_all as compute_cross_chart_all,
)

_log = logging.getLogger("multi_chart_engine")


# ────────────────────────────────────────────────────────────────────
# Cap — see multi_chart_analysis.md §1.4.  Max 4 charts per call.
# ────────────────────────────────────────────────────────────────────
MAX_CHARTS = 4


# ────────────────────────────────────────────────────────────────────
# Playbook selector — maps question topic (from detect_topic) to a
# multi-chart playbook entry: focus_houses + denial_houses + combination
# rule + karakas + (optional) relative_type for Bhavat Bhavam cross-
# validation.
#
# All multi-chart logic flows through this table.  Adding a new topic
# is a single-row config change — no engine code modification.
#
# Source per row in parentheses:
#   - Single-chart get_system_prompt() Rule 5 per-topic relevant/denial
#     house lists (KSK Reader)
#   - Multi-chart KB §2 catalogue (Bosmia KPRM / KP Sublord Speaks)
# ────────────────────────────────────────────────────────────────────
PLAYBOOK_MAP: dict[str, dict[str, Any]] = {
    # ─── Reproductive / family expansion ─────────────────────────────
    "children":       {"playbook": "couple_fertility",  "rule": "or",
                       "focus_houses": [2, 5, 11], "denial_houses": [1, 4, 10],
                       "karakas": ["Jupiter"], "relative_type": "child"},
    "fertility":      {"playbook": "couple_fertility",  "rule": "or",
                       "focus_houses": [2, 5, 11], "denial_houses": [1, 4, 10],
                       "karakas": ["Jupiter"], "relative_type": "child"},
    "pregnancy":      {"playbook": "couple_fertility",  "rule": "or",
                       "focus_houses": [2, 5, 11], "denial_houses": [1, 4, 10],
                       "karakas": ["Jupiter"], "relative_type": "child"},
    "adoption":       {"playbook": "couple_fertility",  "rule": "or",
                       "focus_houses": [5, 9],     "denial_houses": [1, 4],
                       "karakas": ["Jupiter"], "relative_type": "child"},
    # ─── Marriage / romance ──────────────────────────────────────────
    "marriage":         {"playbook": "marriage_compat",    "rule": "or_with_match_redirect",
                         "focus_houses": [2, 7, 11], "denial_houses": [1, 6, 10, 12],
                         "karakas": ["Venus", "Jupiter"], "relative_type": "spouse"},
    "second_marriage":  {"playbook": "marriage_compat",    "rule": "or_with_match_redirect",
                         "focus_houses": [2, 7, 9, 11], "denial_houses": [1, 6, 10, 12],
                         "karakas": ["Venus"], "relative_type": "spouse"},
    "spouse":           {"playbook": "marriage_compat",    "rule": "or_with_match_redirect",
                         "focus_houses": [2, 7, 11], "denial_houses": [1, 6, 10, 12],
                         "karakas": ["Venus"], "relative_type": "spouse"},
    "divorce":          {"playbook": "marriage_compat",    "rule": "and",
                         "focus_houses": [1, 6, 10, 12], "denial_houses": [2, 7, 11],
                         "karakas": [], "relative_type": "spouse"},
    # ─── Business / partnership ──────────────────────────────────────
    "business":         {"playbook": "business_partnership", "rule": "synastry",
                         "focus_houses": [2, 6, 7, 10, 11], "denial_houses": [1, 5, 8, 12],
                         "karakas": ["Mercury", "Saturn", "Jupiter"]},
    "career_business":  {"playbook": "business_partnership", "rule": "synastry",
                         "focus_houses": [2, 6, 7, 10, 11], "denial_houses": [1, 5, 8, 12],
                         "karakas": ["Mercury", "Saturn", "Jupiter"]},
    "partnership":      {"playbook": "business_partnership", "rule": "synastry",
                         "focus_houses": [2, 6, 7, 10, 11], "denial_houses": [1, 5, 8, 12],
                         "karakas": ["Mercury", "Saturn", "Jupiter"]},
    "startup":          {"playbook": "business_partnership", "rule": "synastry",
                         "focus_houses": [2, 7, 10, 11], "denial_houses": [1, 5, 8, 12],
                         "karakas": ["Mercury", "Saturn"]},
    # ─── Employment ──────────────────────────────────────────────────
    "job":              {"playbook": "employer_employee", "rule": "synastry",
                         "focus_houses": [2, 6, 10, 11], "denial_houses": [1, 5, 9, 12],
                         "karakas": ["Mercury", "Saturn"], "relative_type": "boss"},
    "career":           {"playbook": "employer_employee", "rule": "synastry",
                         "focus_houses": [2, 6, 10, 11], "denial_houses": [1, 5, 9, 12],
                         "karakas": ["Mercury", "Saturn"]},
    "layoff":           {"playbook": "employer_employee", "rule": "and",
                         "focus_houses": [1, 5, 6, 9], "denial_houses": [2, 6, 10, 11],
                         "karakas": []},
    "retirement":       {"playbook": "employer_employee", "rule": "or",
                         "focus_houses": [1, 5, 9, 12], "denial_houses": [2, 6, 10],
                         "karakas": ["Saturn"]},
    # ─── Property / inheritance / sibling disputes ───────────────────
    "property":         {"playbook": "family_property",  "rule": "and",
                         "focus_houses": [3, 4, 6, 8, 11, 12], "denial_houses": [],
                         "karakas": ["Mars"]},
    "wealth":           {"playbook": "family_property",  "rule": "or",
                         "focus_houses": [2, 6, 10, 11], "denial_houses": [1, 5, 9, 12],
                         "karakas": []},
    "money_recovery":   {"playbook": "family_property",  "rule": "synastry",
                         "focus_houses": [2, 6, 8, 11], "denial_houses": [1, 5, 12],
                         "karakas": ["Mars"]},
    # ─── Legal / litigation ──────────────────────────────────────────
    "litigation":       {"playbook": "court_case",       "rule": "synastry",
                         "focus_houses": [1, 6, 8, 10, 11, 12], "denial_houses": [],
                         "karakas": ["Mars", "Saturn"]},
    "civil_case":       {"playbook": "court_case",       "rule": "synastry",
                         "focus_houses": [1, 6, 8, 10, 11, 12], "denial_houses": [],
                         "karakas": ["Mars"]},
    "criminal_case":    {"playbook": "court_case",       "rule": "synastry",
                         "focus_houses": [1, 6, 8, 12], "denial_houses": [11],
                         "karakas": ["Mars", "Saturn"]},
    "land_dispute":     {"playbook": "family_property",  "rule": "synastry",
                         "focus_houses": [3, 4, 6, 8, 11], "denial_houses": [],
                         "karakas": ["Mars"]},
    # ─── Medical ─────────────────────────────────────────────────────
    "health":           {"playbook": "medical",          "rule": "synastry",
                         "focus_houses": [1, 5, 6, 8, 11, 12], "denial_houses": [],
                         "karakas": ["Jupiter"]},
    "disease_risk":     {"playbook": "medical",          "rule": "synastry",
                         "focus_houses": [1, 6, 8, 12], "denial_houses": [11],
                         "karakas": []},
    "hospitalization":  {"playbook": "medical",          "rule": "synastry",
                         "focus_houses": [1, 6, 11, 12], "denial_houses": [],
                         "karakas": ["Jupiter"]},
    "surgery":          {"playbook": "medical",          "rule": "synastry",
                         "focus_houses": [1, 6, 8, 11, 12], "denial_houses": [],
                         "karakas": ["Mars", "Jupiter"]},
    "recovery":         {"playbook": "medical",          "rule": "or",
                         "focus_houses": [1, 5, 11], "denial_houses": [6, 8, 12],
                         "karakas": ["Jupiter"]},
    # ─── Education ───────────────────────────────────────────────────
    "education":        {"playbook": "teacher_student",  "rule": "synastry",
                         "focus_houses": [4, 5, 9, 11], "denial_houses": [3, 8, 10],
                         "karakas": ["Mercury", "Jupiter"], "relative_type": "guru"},
    "education_higher": {"playbook": "teacher_student",  "rule": "synastry",
                         "focus_houses": [4, 9, 11, 12], "denial_houses": [3, 8, 10],
                         "karakas": ["Jupiter"]},
    "exam":             {"playbook": "teacher_student",  "rule": "or",
                         "focus_houses": [4, 9, 11], "denial_houses": [3, 8, 10],
                         "karakas": ["Mercury"]},
    # ─── Foreign / travel ────────────────────────────────────────────
    "foreign_travel":   {"playbook": "general_compat",   "rule": "or",
                         "focus_houses": [3, 9, 11, 12], "denial_houses": [2, 4, 8],
                         "karakas": []},
    "foreign_settle":   {"playbook": "general_compat",   "rule": "and",
                         "focus_houses": [7, 9, 11, 12], "denial_houses": [2, 4, 8],
                         "karakas": []},
    # ─── Spiritual ──────────────────────────────────────────────────
    "spirituality":     {"playbook": "teacher_student",  "rule": "synastry",
                         "focus_houses": [5, 9, 12], "denial_houses": [6, 10],
                         "karakas": ["Jupiter"], "relative_type": "guru"},
    # ─── Family relationship questions ──────────────────────────────
    "father":           {"playbook": "parent_child",     "rule": "or",
                         "focus_houses": [9, 5], "denial_houses": [3, 6, 12],
                         "karakas": ["Sun", "Jupiter"], "relative_type": "father"},
    "mother":           {"playbook": "parent_child",     "rule": "or",
                         "focus_houses": [4, 9], "denial_houses": [3, 6, 12],
                         "karakas": ["Moon"], "relative_type": "mother"},
    "sibling":          {"playbook": "parent_child",     "rule": "or",
                         "focus_houses": [3, 11], "denial_houses": [6, 12],
                         "karakas": ["Mars"], "relative_type": "younger_sibling"},
    # ─── Fallback ───────────────────────────────────────────────────
    "general":          {"playbook": "general_compat",   "rule": "synastry",
                         "focus_houses": [1, 7, 11], "denial_houses": [6, 8, 12],
                         "karakas": []},
}


def resolve_playbook(question_topic: str | None) -> dict[str, Any]:
    """Map a detected question topic to a multi-chart playbook entry.

    Falls back to "general_compat" with Synastry rule for unknown topics.
    The combination rule and focus houses signal to the LLM prompt what
    to spotlight; the KB (§3.2) holds the actual doctrine.
    """
    if not question_topic:
        return PLAYBOOK_MAP["general"].copy()
    return PLAYBOOK_MAP.get(question_topic.lower().strip(), PLAYBOOK_MAP["general"]).copy()


# ────────────────────────────────────────────────────────────────────
# Main entrypoint — compute_multi_chart_context.
#
# Phase 5 rewrite: produces per-chart GOATED context (the same
# format_chart_for_llm output single-chart consumes) + cross-chart
# engine primitives.  The compact formatter is GONE — every per-chart
# improvement single-chart ships now auto-flows into multi-chart.
# ────────────────────────────────────────────────────────────────────
def compute_multi_chart_context(
    charts: list[dict[str, Any]],
    question: str,
    history: list[dict[str, Any]] | None = None,
    *,
    live_latitude: float | None = None,
    live_longitude: float | None = None,
    live_timezone_offset: float | None = None,
) -> dict[str, Any]:
    """
    Build the multi-chart context dict consumed by
    `get_multi_chart_prediction()`.

    Args:
        charts: list of 2-4 chart inputs, each a dict with keys
            {name, date, time, latitude, longitude, timezone_offset,
             gender} matching the existing PersonDetails Pydantic model.
            Order is preserved (chart[0] = "Chart 1", chart[1] = "Chart 2", …).
        question: the astrologer's free-text question.
        history: optional chat history for follow-up questions.
        live_latitude / live_longitude / live_timezone_offset:
            astrologer's current location for RP-at-moment.  Same
            Trust-1 contract as single-chart.

    Returns: dict with keys:
        topic                    — detected question topic
        playbook                 — selected multi-chart playbook key
        combination_rule         — selected combination rule
        focus_houses             — list of houses to spotlight
        denial_houses            — list of houses that signal denial
        karakas                  — list of karaka planet names
        relative_type            — optional, for Bhavat Bhavam cross-val
        chart_count              — N (2-4)
        chart_labels             — list of "Chart i — ♂ Name" strings
        per_chart_raw            — list of full goated chart_data dicts
                                   (consumed by llm_service which calls
                                    format_chart_for_llm on each)
        cross_chart_primitives   — output of cross_chart_engine.compute_all
        rp_meta                  — shared rp_meta (Trust-1 contract)
        ruling_planets           — shared RP slot list for moment-of-query
    """
    if not charts:
        raise ValueError("multi_chart: charts list is empty")
    if len(charts) > MAX_CHARTS:
        raise ValueError(f"multi_chart: max {MAX_CHARTS} charts (got {len(charts)})")
    if len(charts) < 2:
        # Single chart through the multi-chart endpoint is allowed
        # (Bhavat Bhavam relative inquiry).
        _log.info("multi_chart: single-chart mode (likely Bhavat Bhavam relative inquiry)")

    history = history or []

    # ── 1. Detect topic (cached Haiku call per Smart-Routing-1.1) ────
    topic = detect_topic(question) or "general"

    # ── 2. Resolve playbook + combination rule + focus/denial houses ─
    play = resolve_playbook(topic)
    playbook = play["playbook"]
    rule = play["rule"]
    focus_houses: list[int] = play["focus_houses"]
    denial_houses: list[int] = play.get("denial_houses") or []
    karakas: list[str] = play["karakas"]
    relative_type: str | None = play.get("relative_type")

    # ── 3. Per-chart compute (reuses sacred chart_pipeline) ──────────
    per_chart_raw: list[dict[str, Any]] = []
    chart_labels: list[str] = []
    for idx, ch in enumerate(charts, start=1):
        try:
            cd = build_full_chart_data(
                name=ch.get("name", f"Person {idx}"),
                date=ch["date"],
                time=ch["time"],
                latitude=float(ch["latitude"]),
                longitude=float(ch["longitude"]),
                timezone_offset=float(ch.get("timezone_offset", 5.5)),
                gender=ch.get("gender", ""),
                topic=topic,
                live_latitude=live_latitude,
                live_longitude=live_longitude,
                live_timezone_offset=live_timezone_offset,
            )
        except Exception as e:
            _log.warning("multi_chart: build_full_chart_data failed for chart %d: %s", idx, e)
            raise

        # Strip internal-only keys for safe downstream use.  We keep
        # _chart_raw on the dict because format_chart_for_llm needs it.
        cd.pop("_moon_longitude", None)

        gender = cd.get("gender", "")
        gsym = "♂" if gender == "male" else "♀" if gender == "female" else "·"
        label = f"Chart {idx} — {gsym} {cd.get('name', '—')}"
        chart_labels.append(label)
        per_chart_raw.append(cd)

    # ── 4. Shared RP meta + RP slots (moment-of-query, astrologer's
    #       live location — see Trust-1 contract) ────────────────────
    first = per_chart_raw[0]
    first_lat = float(first.get("_natal_lat") or charts[0].get("latitude"))
    first_lon = float(first.get("_natal_lon") or charts[0].get("longitude"))
    first_tz = float(first.get("_natal_tz") or charts[0].get("timezone_offset", 5.5))
    rp_lat, rp_lon, rp_tz, rp_source = _resolve_rp_triple(
        natal_lat=first_lat, natal_lon=first_lon, natal_tz=first_tz,
        live_lat=live_latitude, live_lon=live_longitude, live_tz=live_timezone_offset,
    )
    ruling_planets = get_ruling_planets(rp_lat, rp_lon, rp_tz)
    rp_meta = build_rp_meta(rp_lat, rp_lon, rp_tz, source=rp_source)

    # ── 5. Cross-chart engine primitives (Phase 5) ───────────────────
    # rps_today list extracted from ruling_planets for the engine.
    rp_ctx = ruling_planets.get("rp_context", {}) or {}
    rps_today = rp_ctx.get("strongest") or ruling_planets.get("ruling_planets") or []

    try:
        cross_chart_primitives = compute_cross_chart_all(
            per_chart_raw,
            focus_houses=focus_houses,
            denial_houses=denial_houses,
            combination_rule=rule,
            karakas=karakas,
            topic=topic,
            relative_type=relative_type,
            rps_today=list(rps_today),
        )
    except Exception as e:
        _log.warning("multi_chart: cross_chart_engine.compute_all failed: %s", e)
        cross_chart_primitives = {
            "error": str(e),
            "synastry_overlay": {},
            "common_significators": {},
            "joint_dasha_windows": [],
            "sublord_crosscheck": {},
            "bhavat_bhavam_crossval": None,
            "karaka_roles": None,
            "combination_verdict": {"rule": rule, "verdict": "UNKNOWN", "formula_trace": f"engine error: {e}"},
        }

    return {
        "topic":                  topic,
        "playbook":               playbook,
        "combination_rule":       rule,
        "focus_houses":           focus_houses,
        "denial_houses":          denial_houses,
        "karakas":                karakas,
        "relative_type":          relative_type,
        "chart_count":            len(charts),
        "chart_labels":           chart_labels,
        "per_chart_raw":          per_chart_raw,
        "cross_chart_primitives": cross_chart_primitives,
        "rp_meta":                rp_meta,
        "ruling_planets":         ruling_planets,
    }

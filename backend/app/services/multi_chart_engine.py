"""
multi_chart_engine.py — Multi-chart analysis orchestrator.

PR MultiChart-Phase-2 (May 2026).

This module is the orchestrator for the multi-chart analysis flow
(`/astrologer/multi-analyze-stream`).  It takes 2-4 charts + a question
and produces a structured "multi-chart context" dict that the new LLM
function `get_multi_chart_prediction()` consumes.

Sacred-region discipline:
  - Reuses `chart_pipeline.build_full_chart_data()` per chart UNCHANGED
    (sacred — never modify the per-chart pipeline)
  - Reuses `chart_pipeline.build_rp_meta()` for the SHARED rp_meta
    (one rp_meta for the whole multi-chart conversation, computed at
    the astrologer's live location at moment-of-query — see Trust-1)
  - Reuses `detect_topic()` (with LRU cache, Smart-Routing-1.1) for
    question→topic classification
  - Adds NO new dependencies on existing sacred regions

What this module does NOT do:
  - It does NOT build prompts.  That is `llm_service.get_multi_chart_prediction()`.
  - It does NOT call Anthropic.  Same.
  - It does NOT modify `format_chart_for_llm` (sacred).  It builds a
    DIFFERENT, much smaller per-chart summary tailored to multi-chart
    use (see `format_chart_compact_for_multi`).
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

_log = logging.getLogger("multi_chart_engine")


# ────────────────────────────────────────────────────────────────────
# Cap — see multi_chart_analysis.md §1.4.  Max 4 charts per call.
# ────────────────────────────────────────────────────────────────────
MAX_CHARTS = 4


# ────────────────────────────────────────────────────────────────────
# Playbook selector — maps question topic (from detect_topic) to a
# multi-chart playbook key + combination rule.  See
# multi_chart_analysis.md §3.2 (Combination rule selector by event
# type) for the doctrinal mapping.
#
# Playbook key → drives which sections of the KB the LLM prompt
# emphasises + which per-chart fields are spotlighted.
#
# Combination rule → drives which of OR-rule (promise) / AND-rule
# (denial) / Synastry-overlay the LLM applies when merging per-chart
# verdicts.  All three are documented in the KB (§3.1) so the LLM
# applies the rule from the KB; this module just SIGNALS which rule
# is relevant so the prompt can foreground it.
# ────────────────────────────────────────────────────────────────────
PLAYBOOK_MAP: dict[str, dict[str, Any]] = {
    # ─── Reproductive / family expansion ─────────────────────────────
    "children":       {"playbook": "couple_fertility",  "rule": "or",       "focus_houses": [2, 5, 11], "karakas": ["Jupiter"]},
    "fertility":      {"playbook": "couple_fertility",  "rule": "or",       "focus_houses": [2, 5, 11], "karakas": ["Jupiter"]},
    "pregnancy":      {"playbook": "couple_fertility",  "rule": "or",       "focus_houses": [2, 5, 11], "karakas": ["Jupiter"]},
    "adoption":       {"playbook": "couple_fertility",  "rule": "or",       "focus_houses": [5, 9],     "karakas": ["Jupiter"]},
    # ─── Marriage / romance (delegate base compat to dedicated Match) ─
    "marriage":         {"playbook": "marriage_compat",    "rule": "or_with_match_redirect", "focus_houses": [2, 7, 11], "karakas": ["Venus", "Jupiter"]},
    "second_marriage":  {"playbook": "marriage_compat",    "rule": "or_with_match_redirect", "focus_houses": [2, 7, 9, 11], "karakas": ["Venus"]},
    "spouse":           {"playbook": "marriage_compat",    "rule": "or_with_match_redirect", "focus_houses": [2, 7, 11], "karakas": ["Venus"]},
    "divorce":          {"playbook": "marriage_compat",    "rule": "and",                    "focus_houses": [1, 6, 10, 12], "karakas": []},
    # ─── Business / partnership ──────────────────────────────────────
    "business":         {"playbook": "business_partnership", "rule": "synastry", "focus_houses": [2, 6, 7, 10, 11], "karakas": ["Mercury", "Saturn", "Jupiter"]},
    "career_business":  {"playbook": "business_partnership", "rule": "synastry", "focus_houses": [2, 6, 7, 10, 11], "karakas": ["Mercury", "Saturn", "Jupiter"]},
    "partnership":      {"playbook": "business_partnership", "rule": "synastry", "focus_houses": [2, 6, 7, 10, 11], "karakas": ["Mercury", "Saturn", "Jupiter"]},
    "startup":          {"playbook": "business_partnership", "rule": "synastry", "focus_houses": [2, 7, 10, 11], "karakas": ["Mercury", "Saturn"]},
    # ─── Employment (boss + employee, or hiring candidates) ──────────
    "job":              {"playbook": "employer_employee", "rule": "synastry", "focus_houses": [2, 6, 10, 11], "karakas": ["Mercury", "Saturn"]},
    "career":           {"playbook": "employer_employee", "rule": "synastry", "focus_houses": [2, 6, 10, 11], "karakas": ["Mercury", "Saturn"]},
    "layoff":           {"playbook": "employer_employee", "rule": "and",      "focus_houses": [1, 5, 6, 9], "karakas": []},
    "retirement":       {"playbook": "employer_employee", "rule": "or",       "focus_houses": [1, 5, 9, 12], "karakas": ["Saturn"]},
    # ─── Property / inheritance / sibling disputes ───────────────────
    "property":         {"playbook": "family_property",  "rule": "and",      "focus_houses": [3, 4, 6, 8, 11, 12], "karakas": ["Mars"]},
    "wealth":           {"playbook": "family_property",  "rule": "or",       "focus_houses": [2, 6, 10, 11], "karakas": []},
    "money_recovery":   {"playbook": "family_property",  "rule": "synastry", "focus_houses": [2, 6, 8, 11], "karakas": ["Mars"]},
    # ─── Legal / litigation ──────────────────────────────────────────
    "litigation":       {"playbook": "court_case",       "rule": "synastry", "focus_houses": [1, 6, 8, 10, 11, 12], "karakas": ["Mars", "Saturn"]},
    "civil_case":       {"playbook": "court_case",       "rule": "synastry", "focus_houses": [1, 6, 8, 10, 11, 12], "karakas": ["Mars"]},
    "criminal_case":    {"playbook": "court_case",       "rule": "synastry", "focus_houses": [1, 6, 8, 12], "karakas": ["Mars", "Saturn"]},
    "land_dispute":     {"playbook": "family_property",  "rule": "synastry", "focus_houses": [3, 4, 6, 8, 11], "karakas": ["Mars"]},
    # ─── Medical (patient + doctor / caregiver) ──────────────────────
    "health":           {"playbook": "medical",          "rule": "synastry", "focus_houses": [1, 5, 6, 8, 11, 12], "karakas": ["Jupiter"]},
    "disease_risk":     {"playbook": "medical",          "rule": "synastry", "focus_houses": [1, 6, 8, 12], "karakas": []},
    "hospitalization":  {"playbook": "medical",          "rule": "synastry", "focus_houses": [1, 6, 11, 12], "karakas": ["Jupiter"]},
    "surgery":          {"playbook": "medical",          "rule": "synastry", "focus_houses": [1, 6, 8, 11, 12], "karakas": ["Mars", "Jupiter"]},
    "recovery":         {"playbook": "medical",          "rule": "or",       "focus_houses": [1, 5, 11], "karakas": ["Jupiter"]},
    # ─── Education (student + teacher / parents) ─────────────────────
    "education":        {"playbook": "teacher_student",  "rule": "synastry", "focus_houses": [4, 5, 9, 11], "karakas": ["Mercury", "Jupiter"]},
    "education_higher": {"playbook": "teacher_student",  "rule": "synastry", "focus_houses": [4, 9, 11, 12], "karakas": ["Jupiter"]},
    "exam":             {"playbook": "teacher_student",  "rule": "or",       "focus_houses": [4, 9, 11], "karakas": ["Mercury"]},
    # ─── Foreign / travel ────────────────────────────────────────────
    "foreign_travel":   {"playbook": "general_compat",   "rule": "or",       "focus_houses": [3, 9, 11, 12], "karakas": []},
    "foreign_settle":   {"playbook": "general_compat",   "rule": "and",      "focus_houses": [7, 9, 11, 12], "karakas": []},
    # ─── Spiritual ──────────────────────────────────────────────────
    "spirituality":     {"playbook": "teacher_student",  "rule": "synastry", "focus_houses": [5, 9, 12], "karakas": ["Jupiter"]},
    # ─── Fallback ───────────────────────────────────────────────────
    "general":          {"playbook": "general_compat",   "rule": "synastry", "focus_houses": [1, 7, 11], "karakas": []},
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
# Per-chart compact summary — NEW formatter for the multi-chart path.
#
# DOES NOT touch `format_chart_for_llm` (sacred).  That formatter is
# tuned for single-chart deep analysis with the full Universal KB
# loaded; it emits ~5-10K tokens of chart context.  In a multi-chart
# request we have 2-4 charts AND the (~12K) multi-chart KB AND the
# per-topic KB — bloat would kill the prompt window.
#
# This formatter emits ~1.5-2K tokens per chart by spotlighting:
#   - Native profile (name / gender / age / birth)
#   - The focus houses (cusps + sub-lord chain) for the playbook
#   - The relevant karaka planets (positions + significations)
#   - The current dasha tree (MD/AD/PAD/Sookshma)
#   - Lagna + Moon (always; KP cross-reference baseline)
#
# Skips: full transit bundle, full Tara/Chandra Bala, full advanced
# compute output, full upcoming 9-AD tree.  These can be re-derived
# if a follow-up question requires them.
# ────────────────────────────────────────────────────────────────────
def format_chart_compact_for_multi(
    chart_data: dict[str, Any],
    focus_houses: list[int],
    karakas: list[str],
    chart_label: str = "Chart",
) -> str:
    """Render a per-chart compact summary for the multi-chart prompt.

    `chart_label` is the human display token used in the prompt and
    output (e.g. "Chart 1 — ♂ Manyue").
    """
    lines: list[str] = []
    lines.append(f"═════════════════════════════════════════════")
    lines.append(f"{chart_label}")
    lines.append(f"═════════════════════════════════════════════")

    # ─── Native profile ──────────────────────────────────────────────
    name = chart_data.get("name") or "—"
    gender = chart_data.get("gender") or ""
    age = chart_data.get("age_years")
    birth_date = chart_data.get("birth_date") or ""
    gsym = "♂" if gender == "male" else "♀" if gender == "female" else ""
    lines.append(f"Native: {name} {gsym}  ·  born {birth_date}  ·  age {age}")

    # ─── Lagna + Moon — always included (KP cross-reference) ─────────
    chart_summary = chart_data.get("chart_summary") or {}
    cusps = chart_summary.get("cusps") or {}
    planets = chart_summary.get("planets") or {}
    lagna_cusp = cusps.get("House_1") or {}
    moon_data = planets.get("Moon") or {}
    lines.append("")
    lines.append("LAGNA + MOON (baseline):")
    if lagna_cusp:
        lines.append(
            f"  Lagna (H1): {lagna_cusp.get('sign','')} {lagna_cusp.get('cusp_longitude','')}° "
            f"· nakshatra {lagna_cusp.get('nakshatra','')} "
            f"· sub-lord {lagna_cusp.get('sub_lord','')}"
        )
    if moon_data:
        lines.append(
            f"  Moon: {moon_data.get('sign','')} {moon_data.get('longitude','')}° "
            f"· nakshatra {moon_data.get('nakshatra','')} "
            f"· house {moon_data.get('house','')} "
            f"· sub-lord {moon_data.get('sub_lord','')}"
        )

    # ─── Focus houses — full CSL chain for each ──────────────────────
    lines.append("")
    lines.append(f"FOCUS HOUSES for this question (per playbook): {focus_houses}")
    csl_chains = chart_data.get("csl_chains") or {}
    for hn in focus_houses:
        key_int = hn
        key_str = f"H{hn}"
        chain = (
            csl_chains.get(key_int)
            or csl_chains.get(key_str)
            or csl_chains.get(str(hn))
            or {}
        )
        cusp = cusps.get(f"House_{hn}") or {}
        lines.append(f"  H{hn}: cusp {cusp.get('sign','')} {cusp.get('cusp_longitude','')}°")
        if chain:
            lines.append(
                f"    CSL: {chain.get('csl','')} "
                f"in H{chain.get('csl_house','')} "
                f"signifies {chain.get('csl_rules','')}"
            )
            lines.append(
                f"    Star lord: {chain.get('csl_star_lord','')} "
                f"in H{chain.get('csl_star_lord_house','')} "
                f"signifies {chain.get('csl_star_lord_rules','')}"
            )
            lines.append(
                f"    Sub lord: {chain.get('csl_sub_lord','')} "
                f"in H{chain.get('csl_sub_lord_house','')}"
            )
            sigs = chain.get("all_significations")
            if sigs:
                lines.append(f"    4-step union of significations: {sigs}")

    # ─── Karakas (event-relevant) ────────────────────────────────────
    if karakas:
        lines.append("")
        lines.append(f"RELEVANT KARAKAS for this event: {karakas}")
        for k in karakas:
            p = planets.get(k) or {}
            if not p:
                continue
            lines.append(
                f"  {k}: {p.get('sign','')} {p.get('longitude','')}° "
                f"· house {p.get('house','')} "
                f"· nakshatra {p.get('nakshatra','')} "
                f"· dignity {p.get('dignity','')} "
                f"· retrograde {p.get('retrograde', False)}"
            )

    # ─── Current dasha tree ──────────────────────────────────────────
    cur = chart_data.get("current_dasha") or {}
    md = cur.get("mahadasha") or {}
    ad = cur.get("antardasha") or {}
    pad = cur.get("pratyantardasha") or {}
    sk = cur.get("sookshma") or {}
    lines.append("")
    lines.append("CURRENT DASHA TREE (today):")
    if md:
        lines.append(f"  MD: {md.get('lord','—')}  ·  {md.get('start','')} → {md.get('end','')}")
    if ad:
        lines.append(f"  AD: {ad.get('antardasha_lord','—')}  ·  {ad.get('start','')} → {ad.get('end','')}")
    if pad:
        lines.append(f"  PAD: {pad.get('pratyantardasha_lord','—')}  ·  {pad.get('start','')} → {pad.get('end','')}")
    if sk:
        lines.append(f"  Sookshma: {sk.get('sookshma_lord','—')}  ·  {sk.get('start','')} → {sk.get('end','')}")

    # ─── Promise / timing flags (already computed per-chart) ─────────
    promise = chart_data.get("promise_analysis") or {}
    timing = chart_data.get("timing_analysis") or {}
    if promise or timing:
        lines.append("")
        lines.append("ENGINE FLAGS:")
        if promise:
            lines.append(
                f"  Promise: is_promised={promise.get('is_promised','?')} "
                f"· basis={promise.get('basis','')}"
            )
        if timing:
            lines.append(
                f"  Timing: dasha_relevant={timing.get('is_relevant','?')} "
                f"· lord_in_chain={timing.get('lord_in_chain','')}"
            )

    return "\n".join(lines)


# ────────────────────────────────────────────────────────────────────
# Main entrypoint — compute_multi_chart_context.
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
        history: optional chat history for follow-up questions
            (preserved across turns by the SSE endpoint).
        live_latitude / live_longitude / live_timezone_offset:
            astrologer's current location for RP-at-moment.  Same
            Trust-1 contract as single-chart — falls back to chart[0]'s
            natal coords if missing (with rp_meta.source flagged).

    Returns: dict with keys:
        topic                 — detected question topic
        playbook              — selected multi-chart playbook key
        combination_rule      — selected combination rule (or/and/synastry/or_with_match_redirect)
        focus_houses          — list of houses to spotlight
        karakas               — list of karaka planet names
        chart_count           — N (2-4)
        chart_labels          — list of "Chart i — ♂ Name" strings
        per_chart             — list of per-chart compact summary strings
        per_chart_raw         — list of full chart_data dicts (for downstream tools / fallback)
        rp_meta               — shared rp_meta (Trust-1 contract)
        ruling_planets        — shared RP slot list for moment-of-query

    Side effects: none.  Pure function.  Logging only.
    """
    if not charts:
        raise ValueError("multi_chart: charts list is empty")
    if len(charts) > MAX_CHARTS:
        raise ValueError(f"multi_chart: max {MAX_CHARTS} charts (got {len(charts)})")
    if len(charts) < 2:
        # Single chart through the multi-chart endpoint is allowed
        # (e.g., user asks about a relative via Bhavat Bhavam — see KB §4).
        # The combination logic just degrades to "single-chart with
        # rotational frame" — same engine, same KB, just no second
        # chart to combine with.
        _log.info("multi_chart: single-chart mode (likely Bhavat Bhavam relative inquiry)")

    history = history or []

    # ── 1. Detect topic from the question (cached Haiku call per Smart-Routing-1.1) ──
    topic = detect_topic(question) or "general"

    # ── 2. Resolve playbook + combination rule from topic ────────────
    play = resolve_playbook(topic)
    playbook = play["playbook"]
    rule = play["rule"]
    focus_houses: list[int] = play["focus_houses"]
    karakas: list[str] = play["karakas"]

    # ── 3. Per-chart compute (reuses sacred chart_pipeline) ──────────
    per_chart_raw: list[dict[str, Any]] = []
    per_chart_summaries: list[str] = []
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
                topic=topic,  # per-chart compute can use the topic for advanced_compute
                live_latitude=live_latitude,
                live_longitude=live_longitude,
                live_timezone_offset=live_timezone_offset,
            )
        except Exception as e:
            _log.warning("multi_chart: build_full_chart_data failed for chart %d: %s", idx, e)
            raise

        # Strip internal-only keys from the response (kept on the dict
        # for in-process use but not echoed back).
        cd.pop("_chart_raw", None)
        cd.pop("_moon_longitude", None)

        gender = cd.get("gender", "")
        gsym = "♂" if gender == "male" else "♀" if gender == "female" else "·"
        label = f"Chart {idx} — {gsym} {cd.get('name', '—')}"
        chart_labels.append(label)

        summary = format_chart_compact_for_multi(
            cd,
            focus_houses=focus_houses,
            karakas=karakas,
            chart_label=label,
        )
        per_chart_summaries.append(summary)
        per_chart_raw.append(cd)

    # ── 4. Shared RP meta + RP slots (moment-of-query, astrologer's
    #       live location — see Trust-1 contract + KB §7.4) ────────
    # Use first chart's natal coords as the natal-fallback if live_*
    # is missing.  This matches single-chart behavior.
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

    return {
        "topic":            topic,
        "playbook":         playbook,
        "combination_rule": rule,
        "focus_houses":     focus_houses,
        "karakas":          karakas,
        "chart_count":      len(charts),
        "chart_labels":     chart_labels,
        "per_chart":        per_chart_summaries,
        "per_chart_raw":    per_chart_raw,
        "rp_meta":          rp_meta,
        "ruling_planets":   ruling_planets,
    }

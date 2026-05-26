"""Regression tests for multi-chart analysis flow.

PR MultiChart-Phase-2 (May 2026).

Tests cover:
  1. compute_multi_chart_context for 2-chart fertility (OR-rule)
  2. compute_multi_chart_context for 3-chart sibling property dispute (AND-rule)
  3. compute_multi_chart_context for 3-way business partnership (Synastry rule)
  4. compute_multi_chart_context for employer-employee compatibility (Synastry rule)
  5. compute_multi_chart_context for single-chart-with-relative (Bhavat Bhavam fallback)
  6. Cap enforcement (>4 charts raises ValueError)
  7. Empty charts list raises ValueError
  8. Playbook resolver — known topic + unknown topic
  9. Per-chart compact formatter contains all required sections
 10. Multi-chart context propagates rp_meta source correctly (live vs natal_fallback)

These tests do NOT fire real Anthropic calls — only the engine's
deterministic per-chart compute is exercised.  LLM-call validation
happens at the integration level (not unit level — we don't want
test runs to incur Anthropic bills).
"""
from __future__ import annotations

import pytest

from app.services.multi_chart_engine import (
    MAX_CHARTS,
    PLAYBOOK_MAP,
    resolve_playbook,
    format_chart_compact_for_multi,
    compute_multi_chart_context,
)


# ── Canonical test fixtures ─────────────────────────────────────────
MANYUE = {
    "name": "Manyue",
    "date": "2000-09-09",
    "time": "12:31",
    "latitude": 16.2378,
    "longitude": 80.6464,
    "timezone_offset": 5.5,
    "gender": "male",
}

# Hypothetical spouse for couple-fertility tests.
RAMYA = {
    "name": "Ramya",
    "date": "2001-03-15",
    "time": "08:45",
    "latitude": 17.385,
    "longitude": 78.4867,
    "timezone_offset": 5.5,
    "gender": "female",
}

# Hypothetical 2nd sibling for property dispute tests.
BROTHER_A = {
    "name": "BrotherA",
    "date": "1998-04-20",
    "time": "14:10",
    "latitude": 16.2378,
    "longitude": 80.6464,
    "timezone_offset": 5.5,
    "gender": "male",
}

# Hypothetical 3rd sibling for property dispute tests.
BROTHER_B = {
    "name": "BrotherB",
    "date": "2003-11-02",
    "time": "06:15",
    "latitude": 16.2378,
    "longitude": 80.6464,
    "timezone_offset": 5.5,
    "gender": "male",
}

# Hypothetical 4th business partner for partnership tests.
PARTNER_X = {
    "name": "PartnerX",
    "date": "1992-07-04",
    "time": "20:50",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "timezone_offset": 5.5,
    "gender": "male",
}


# ────────────────────────────────────────────────────────────────────
# Playbook resolver tests
# ────────────────────────────────────────────────────────────────────
class TestPlaybookResolver:
    def test_known_topic_children_returns_couple_fertility(self):
        play = resolve_playbook("children")
        assert play["playbook"] == "couple_fertility"
        assert play["rule"] == "or"
        assert 5 in play["focus_houses"]
        assert "Jupiter" in play["karakas"]

    def test_known_topic_business_returns_business_partnership(self):
        play = resolve_playbook("business")
        assert play["playbook"] == "business_partnership"
        assert play["rule"] == "synastry"
        assert 7 in play["focus_houses"]
        assert "Mercury" in play["karakas"]

    def test_known_topic_litigation_returns_court_case(self):
        play = resolve_playbook("litigation")
        assert play["playbook"] == "court_case"
        assert play["rule"] == "synastry"
        assert 6 in play["focus_houses"]
        assert 8 in play["focus_houses"]

    def test_unknown_topic_falls_back_to_general(self):
        play = resolve_playbook("flarbgloop")
        assert play["playbook"] == "general_compat"
        assert play["rule"] == "synastry"

    def test_none_topic_falls_back_to_general(self):
        play = resolve_playbook(None)
        assert play["playbook"] == "general_compat"

    def test_marriage_uses_redirect_rule(self):
        play = resolve_playbook("marriage")
        assert play["rule"] == "or_with_match_redirect", (
            "Marriage questions through the multi-chart flow MUST signal "
            "the LLM to also recommend the dedicated Match endpoint "
            "(per KB §5.2)."
        )


# ────────────────────────────────────────────────────────────────────
# compute_multi_chart_context tests — these EXERCISE the per-chart
# pipeline (build_full_chart_data), so they're slower than playbook tests.
# Each test fires real ephemeris computation but ZERO LLM calls.
# ────────────────────────────────────────────────────────────────────
class TestComputeMultiChartContext:
    def test_two_chart_fertility_or_rule(self, monkeypatch):
        # Stub detect_topic to keep tests offline.
        from app.services import multi_chart_engine as eng
        monkeypatch.setattr(eng, "detect_topic", lambda q: "children")

        ctx = compute_multi_chart_context(
            [MANYUE, RAMYA],
            "Will we have a child this year?",
        )
        assert ctx["topic"] == "children"
        assert ctx["playbook"] == "couple_fertility"
        assert ctx["combination_rule"] == "or"
        assert ctx["chart_count"] == 2
        assert len(ctx["chart_labels"]) == 2
        assert len(ctx["per_chart"]) == 2
        assert len(ctx["per_chart_raw"]) == 2
        # Chart labels include gender symbols + names
        assert "Manyue" in ctx["chart_labels"][0]
        assert "Ramya" in ctx["chart_labels"][1]
        # rp_meta exists and is one shared dict for the moment-of-query
        assert ctx["rp_meta"] is not None
        # Falls back to natal because no live_* coords passed
        assert ctx["rp_meta"]["source"] == "natal_fallback"
        # 7-slot ruling planets returned for the moment
        assert "ruling_planets" in ctx
        assert isinstance(ctx["ruling_planets"], dict)

    def test_three_chart_sibling_property_dispute_and_rule(self, monkeypatch):
        from app.services import multi_chart_engine as eng
        monkeypatch.setattr(eng, "detect_topic", lambda q: "property")

        ctx = compute_multi_chart_context(
            [MANYUE, BROTHER_A, BROTHER_B],
            "We three brothers are disputing father's property. Will it resolve?",
        )
        assert ctx["playbook"] == "family_property"
        assert ctx["combination_rule"] == "and"
        assert ctx["chart_count"] == 3
        # Focus houses include H3 (siblings), H4 (property), H6 (dispute), H8 (inheritance)
        assert 4 in ctx["focus_houses"]
        assert 6 in ctx["focus_houses"]
        assert 8 in ctx["focus_houses"]

    def test_three_way_business_partnership_synastry(self, monkeypatch):
        from app.services import multi_chart_engine as eng
        monkeypatch.setattr(eng, "detect_topic", lambda q: "business")

        ctx = compute_multi_chart_context(
            [MANYUE, BROTHER_A, PARTNER_X],
            "We three want to start a tech consulting firm. Will it succeed?",
        )
        assert ctx["playbook"] == "business_partnership"
        assert ctx["combination_rule"] == "synastry"
        assert ctx["chart_count"] == 3
        # Per-chart summaries each ~1-3K chars
        for s in ctx["per_chart"]:
            assert "FOCUS HOUSES" in s
            assert "CURRENT DASHA TREE" in s
            assert "LAGNA + MOON" in s

    def test_employer_employee_synastry(self, monkeypatch):
        from app.services import multi_chart_engine as eng
        monkeypatch.setattr(eng, "detect_topic", lambda q: "job")

        ctx = compute_multi_chart_context(
            [MANYUE, RAMYA],
            "I'm a manager considering hiring this person. Are we compatible?",
        )
        assert ctx["playbook"] == "employer_employee"
        assert ctx["combination_rule"] == "synastry"
        assert "Mercury" in ctx["karakas"]
        assert "Saturn" in ctx["karakas"]

    def test_single_chart_for_relative_query(self, monkeypatch):
        """Single chart through the multi-chart endpoint = Bhavat Bhavam
        relative inquiry.  Engine should NOT crash; combination logic
        degrades gracefully.  See KB §4."""
        from app.services import multi_chart_engine as eng
        monkeypatch.setattr(eng, "detect_topic", lambda q: "health")

        ctx = compute_multi_chart_context(
            [MANYUE],
            "How is my father's health this year? (via Bhavat Bhavam)",
        )
        assert ctx["chart_count"] == 1
        assert len(ctx["per_chart"]) == 1
        assert ctx["playbook"] == "medical"

    def test_live_location_propagates_to_rp_meta(self, monkeypatch):
        """If live_* coords are passed, rp_meta.source must be 'live',
        not 'natal_fallback' (Trust-1 contract holds for multi-chart)."""
        from app.services import multi_chart_engine as eng
        monkeypatch.setattr(eng, "detect_topic", lambda q: "children")

        ctx = compute_multi_chart_context(
            [MANYUE, RAMYA],
            "Will we have a child this year?",
            live_latitude=43.6532,
            live_longitude=-79.3832,
            live_timezone_offset=-4.0,
        )
        assert ctx["rp_meta"]["source"] == "live"
        # Live coords are Toronto; tz_name should resolve to America/Toronto.
        assert ctx["rp_meta"]["lat"] == 43.6532
        assert ctx["rp_meta"]["lon"] == -79.3832
        assert ctx["rp_meta"]["tz_name"] == "America/Toronto"


# ────────────────────────────────────────────────────────────────────
# Cap + validation tests
# ────────────────────────────────────────────────────────────────────
class TestCapsAndValidation:
    def test_max_charts_constant_is_4(self):
        assert MAX_CHARTS == 4

    def test_more_than_max_charts_raises(self, monkeypatch):
        from app.services import multi_chart_engine as eng
        monkeypatch.setattr(eng, "detect_topic", lambda q: "general")

        too_many = [MANYUE, RAMYA, BROTHER_A, BROTHER_B, PARTNER_X]
        with pytest.raises(ValueError, match="max 4"):
            compute_multi_chart_context(too_many, "test question")

    def test_empty_charts_list_raises(self):
        with pytest.raises(ValueError, match="empty"):
            compute_multi_chart_context([], "test question")


# ────────────────────────────────────────────────────────────────────
# Per-chart compact formatter tests
# ────────────────────────────────────────────────────────────────────
class TestPerChartCompactFormatter:
    def test_formatter_contains_required_sections(self, monkeypatch):
        """The compact formatter must always emit Native profile,
        Lagna+Moon, Focus houses, and Current dasha — these are the
        baselines the LLM needs even before applying the playbook."""
        # We need a real chart_data to test against, so call the
        # pipeline once.
        from app.services.chart_pipeline import build_full_chart_data
        cd = build_full_chart_data(**{**MANYUE, "topic": "children"})
        out = format_chart_compact_for_multi(
            cd,
            focus_houses=[2, 5, 11],
            karakas=["Jupiter"],
            chart_label="Chart 1 — ♂ Manyue",
        )
        # Required sections
        assert "Chart 1 — ♂ Manyue" in out
        assert "Native:" in out
        assert "Manyue" in out
        assert "LAGNA + MOON" in out
        assert "FOCUS HOUSES" in out
        assert "[2, 5, 11]" in out
        assert "CURRENT DASHA TREE" in out
        assert "RELEVANT KARAKAS" in out
        assert "Jupiter" in out

    def test_formatter_handles_empty_karakas(self, monkeypatch):
        from app.services.chart_pipeline import build_full_chart_data
        cd = build_full_chart_data(**{**MANYUE, "topic": "property"})
        out = format_chart_compact_for_multi(
            cd, focus_houses=[3, 4, 6, 8], karakas=[],
            chart_label="Chart 1",
        )
        # No karakas section when list is empty (skipped cleanly)
        assert "RELEVANT KARAKAS" not in out


# ────────────────────────────────────────────────────────────────────
# Sacred-region guard tests — make sure the new code does NOT modify
# the sacred LLM functions or formatters.
# ────────────────────────────────────────────────────────────────────
class TestSacredRegionsUntouched:
    def test_get_prediction_still_exists_with_same_signature(self):
        from app.services import llm_service
        import inspect
        # Sacred — must keep the existing signature.
        sig = inspect.signature(llm_service.get_prediction)
        params = list(sig.parameters.keys())
        # Original positional/keyword args must remain
        assert "chart_data" in params
        assert "question" in params
        assert "history" in params
        assert "mode" in params
        assert "topic" in params

    def test_get_prediction_stream_still_exists(self):
        from app.services import llm_service
        assert hasattr(llm_service, "get_prediction_stream")
        assert callable(llm_service.get_prediction_stream)

    def test_format_chart_for_llm_still_exists(self):
        from app.services import llm_service
        assert hasattr(llm_service, "format_chart_for_llm")

    def test_format_match_for_llm_still_exists(self):
        from app.services import llm_service
        assert hasattr(llm_service, "format_match_for_llm")

    def test_get_match_prediction_still_exists(self):
        from app.services import llm_service
        assert hasattr(llm_service, "get_match_prediction")

    def test_new_multi_chart_functions_exist(self):
        """The new functions exist alongside the sacred ones."""
        from app.services import llm_service
        assert hasattr(llm_service, "get_multi_chart_prediction")
        assert hasattr(llm_service, "get_multi_chart_prediction_stream")

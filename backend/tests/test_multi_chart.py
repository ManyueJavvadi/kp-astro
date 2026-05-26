"""Regression tests for multi-chart analysis flow (Phase 5 architecture).

PR MultiChart-Phase-2 — initial scaffolding (deleted in Phase 5)
PR MultiChart-Phase-4 — compact formatter discipline (deleted in Phase 5)
PR MultiChart-Phase-5 — goated context + cross-chart engine primitives

Tests cover:
  1. Playbook resolver (topic → focus_houses + denial_houses + rule + karakas)
  2. compute_multi_chart_context returns the Phase 5 dict shape:
       - per_chart_raw (full goated chart_data dicts)
       - cross_chart_primitives (7 deterministic primitives)
       - rp_meta + ruling_planets (shared, Trust-1 contract)
  3. Cap enforcement (>4 charts raises ValueError)
  4. Empty charts list raises ValueError
  5. Sacred-region guards — single-chart functions UNTOUCHED
  6. Multi-chart system prompt INHERITS sacred get_system_prompt()
  7. Multi-chart system prompt carries MC1-MC10 discipline blocks

These tests do NOT fire real Anthropic calls — only the engine's
deterministic per-chart compute + cross-chart engine + prompt builder
are exercised.
"""
from __future__ import annotations

import pytest

from app.services.multi_chart_engine import (
    MAX_CHARTS,
    PLAYBOOK_MAP,
    resolve_playbook,
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

RAMYA = {
    "name": "Ramya",
    "date": "2001-03-15",
    "time": "08:45",
    "latitude": 17.385,
    "longitude": 78.4867,
    "timezone_offset": 5.5,
    "gender": "female",
}

BROTHER_A = {
    "name": "BrotherA",
    "date": "1998-04-20",
    "time": "14:10",
    "latitude": 16.2378,
    "longitude": 80.6464,
    "timezone_offset": 5.5,
    "gender": "male",
}

BROTHER_B = {
    "name": "BrotherB",
    "date": "2003-11-02",
    "time": "06:15",
    "latitude": 16.2378,
    "longitude": 80.6464,
    "timezone_offset": 5.5,
    "gender": "male",
}

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
        # Phase 5: denial_houses must be present
        assert "denial_houses" in play
        assert play.get("relative_type") == "child"

    def test_known_topic_business_returns_business_partnership(self):
        play = resolve_playbook("business")
        assert play["playbook"] == "business_partnership"
        assert play["rule"] == "synastry"
        assert 7 in play["focus_houses"]
        assert "Mercury" in play["karakas"]
        assert "denial_houses" in play

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
            "Marriage questions through multi-chart flow MUST signal "
            "the LLM to also recommend the dedicated Match endpoint."
        )
        assert play.get("relative_type") == "spouse"

    def test_father_topic_has_bhavat_bhavam_axis(self):
        # Phase 5: parent-child topics carry relative_type for Bhavat
        # Bhavam cross-validation in the cross-chart engine.
        play = resolve_playbook("father")
        assert play.get("relative_type") == "father"
        assert 9 in play["focus_houses"]
        assert "Sun" in play["karakas"]

    def test_health_playbook_synastry_rule(self):
        play = resolve_playbook("health")
        assert play["rule"] == "synastry"
        assert 1 in play["focus_houses"]
        assert 6 in play["focus_houses"]

    def test_property_playbook_uses_and_rule(self):
        # Property dispute uses AND-rule (denial only when ALL deny).
        play = resolve_playbook("property")
        assert play["rule"] == "and"
        assert 4 in play["focus_houses"]


# ────────────────────────────────────────────────────────────────────
# compute_multi_chart_context — Phase 5 dict shape tests
# ────────────────────────────────────────────────────────────────────
class TestComputeMultiChartContext:
    def test_two_chart_fertility_returns_phase5_shape(self, monkeypatch):
        from app.services import multi_chart_engine as eng
        monkeypatch.setattr(eng, "detect_topic", lambda q: "children")

        ctx = compute_multi_chart_context([MANYUE, RAMYA], "Will we have a child?")
        assert ctx["topic"] == "children"
        assert ctx["playbook"] == "couple_fertility"
        assert ctx["combination_rule"] == "or"
        assert ctx["chart_count"] == 2
        assert len(ctx["chart_labels"]) == 2
        # Phase 5 shape: per_chart_raw is the goated chart_data; no
        # per_chart compact summaries anymore.
        assert "per_chart_raw" in ctx
        assert len(ctx["per_chart_raw"]) == 2
        assert "per_chart" not in ctx, (
            "Phase 5 removed 'per_chart' (compact summaries). "
            "Use 'per_chart_raw' (goated chart_data)."
        )
        # Phase 5 NEW: cross_chart_primitives dict
        assert "cross_chart_primitives" in ctx
        primitives = ctx["cross_chart_primitives"]
        for key in [
            "synastry_overlay", "common_significators", "joint_dasha_windows",
            "sublord_crosscheck", "bhavat_bhavam_crossval", "karaka_roles",
            "combination_verdict",
        ]:
            assert key in primitives, f"missing primitive: {key}"
        # focus_houses + denial_houses present
        assert "focus_houses" in ctx
        assert "denial_houses" in ctx

    def test_three_chart_sibling_property_dispute(self, monkeypatch):
        from app.services import multi_chart_engine as eng
        monkeypatch.setattr(eng, "detect_topic", lambda q: "property")

        ctx = compute_multi_chart_context(
            [MANYUE, BROTHER_A, BROTHER_B],
            "Will we three resolve the property dispute?",
        )
        assert ctx["combination_rule"] == "and"
        assert ctx["chart_count"] == 3
        assert len(ctx["per_chart_raw"]) == 3
        # 3 charts → synastry overlay has 6 ordered pairs (3 × 2)
        assert len(ctx["cross_chart_primitives"]["synastry_overlay"]) == 6

    def test_three_way_business_partnership_emits_karaka_roles(self, monkeypatch):
        from app.services import multi_chart_engine as eng
        monkeypatch.setattr(eng, "detect_topic", lambda q: "business")

        ctx = compute_multi_chart_context(
            [MANYUE, RAMYA, PARTNER_X],
            "Should we three start a business together?",
        )
        assert ctx["combination_rule"] == "synastry"
        # Karaka roles SHOULD be emitted for N≥3 business
        karaka_roles = ctx["cross_chart_primitives"]["karaka_roles"]
        assert karaka_roles is not None
        # Should have entries for Mars (operator), Mercury (advisor), etc.
        assert any("Mars" in k for k in karaka_roles.keys())

    def test_two_chart_business_skips_karaka_roles(self, monkeypatch):
        from app.services import multi_chart_engine as eng
        monkeypatch.setattr(eng, "detect_topic", lambda q: "business")

        ctx = compute_multi_chart_context(
            [MANYUE, RAMYA],
            "Should we start a business together?",
        )
        # N=2 → karaka_roles is None (only N≥3 emits role distribution)
        assert ctx["cross_chart_primitives"]["karaka_roles"] is None

    def test_marriage_question_with_spouse_relative_type(self, monkeypatch):
        from app.services import multi_chart_engine as eng
        monkeypatch.setattr(eng, "detect_topic", lambda q: "marriage")

        ctx = compute_multi_chart_context([MANYUE, RAMYA], "Marriage match?")
        # relative_type propagates from playbook
        assert ctx["relative_type"] == "spouse"
        # Bhavat Bhavam cross-validation gets computed
        bb = ctx["cross_chart_primitives"]["bhavat_bhavam_crossval"]
        assert bb is not None and bb.get("applicable") is True

    def test_single_chart_for_relative_query(self, monkeypatch):
        from app.services import multi_chart_engine as eng
        monkeypatch.setattr(eng, "detect_topic", lambda q: "father")

        ctx = compute_multi_chart_context([MANYUE], "How is my father's health?")
        assert ctx["chart_count"] == 1
        assert ctx["relative_type"] == "father"

    def test_live_location_propagates_to_rp_meta(self, monkeypatch):
        from app.services import multi_chart_engine as eng
        monkeypatch.setattr(eng, "detect_topic", lambda q: "marriage")

        ctx = compute_multi_chart_context(
            [MANYUE, RAMYA],
            "Marriage compatibility?",
            live_latitude=37.7749,
            live_longitude=-122.4194,
            live_timezone_offset=-7.0,
        )
        # rp_meta source = live when live coords passed
        assert ctx["rp_meta"]["source"] == "live"
        assert abs(ctx["rp_meta"]["lat"] - 37.7749) < 0.01
        assert abs(ctx["rp_meta"]["tz_offset"] - (-7.0)) < 0.01

    def test_combination_verdict_is_emitted(self, monkeypatch):
        from app.services import multi_chart_engine as eng
        monkeypatch.setattr(eng, "detect_topic", lambda q: "children")

        ctx = compute_multi_chart_context([MANYUE, RAMYA], "Will we have children?")
        cv = ctx["cross_chart_primitives"]["combination_verdict"]
        assert "rule" in cv
        assert "verdict" in cv
        assert "formula_trace" in cv
        # Verdict is one of the documented MC3 values
        assert cv["verdict"] in {
            "STRONGLY PROMISED", "PROMISED", "CONDITIONAL-POSITIVE",
            "CONDITIONAL", "WEAKLY PROMISED", "DENIED", "NOT-DENIED",
            "STRONG-FIT", "WORKABLE", "FRICTION", "INCOMPATIBLE", "UNKNOWN",
        }


# ────────────────────────────────────────────────────────────────────
# Caps + validation
# ────────────────────────────────────────────────────────────────────
class TestCapsAndValidation:
    def test_max_charts_constant_is_4(self):
        assert MAX_CHARTS == 4

    def test_more_than_max_charts_raises(self, monkeypatch):
        from app.services import multi_chart_engine as eng
        monkeypatch.setattr(eng, "detect_topic", lambda q: "general")

        with pytest.raises(ValueError, match="max 4 charts"):
            compute_multi_chart_context(
                [MANYUE, RAMYA, BROTHER_A, BROTHER_B, PARTNER_X],
                "Test 5-chart cap",
            )

    def test_empty_charts_list_raises(self):
        with pytest.raises(ValueError, match="empty"):
            compute_multi_chart_context([], "test question")


# ────────────────────────────────────────────────────────────────────
# Sacred-region guard tests — guarantee Phase 5 didn't break the
# goated single-chart prompt/formatter that powers Analysis tab.
# ────────────────────────────────────────────────────────────────────
class TestSacredRegionsUntouched:
    def test_get_prediction_still_exists_with_same_signature(self):
        from app.services import llm_service
        import inspect
        sig = inspect.signature(llm_service.get_prediction)
        params = list(sig.parameters.keys())
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
        assert callable(llm_service.format_chart_for_llm)

    def test_format_match_for_llm_still_exists(self):
        from app.services import llm_service
        assert hasattr(llm_service, "format_match_for_llm")

    def test_get_match_prediction_still_exists(self):
        from app.services import llm_service
        assert hasattr(llm_service, "get_match_prediction")

    def test_get_system_prompt_still_exists(self):
        from app.services import llm_service
        assert hasattr(llm_service, "get_system_prompt")
        # Phase 5 multi-chart system prompt INHERITS this — must be callable
        prompt = llm_service.get_system_prompt()
        assert "RULE 1" in prompt
        assert "RULE 5" in prompt
        assert "RULE 16" in prompt
        assert "RULE 24" in prompt or "RULE 23" in prompt  # tail rules

    def test_new_multi_chart_functions_exist(self):
        from app.services import llm_service
        assert hasattr(llm_service, "_build_multi_chart_system_prompt")
        assert hasattr(llm_service, "_build_multi_chart_user_message")
        assert hasattr(llm_service, "get_multi_chart_prediction")
        assert hasattr(llm_service, "get_multi_chart_prediction_stream")


# ────────────────────────────────────────────────────────────────────
# Phase 5 multi-chart system prompt tests — MC1-MC10 + inheritance
# ────────────────────────────────────────────────────────────────────
class TestPhase5SystemPromptDiscipline:
    def _build_ctx_for_prompt(self, monkeypatch):
        from app.services import multi_chart_engine as eng
        monkeypatch.setattr(eng, "detect_topic", lambda q: "marriage")
        return compute_multi_chart_context(
            [MANYUE, RAMYA], "Will Manyue and Ramya have happy marriage?",
        )

    def test_system_prompt_inherits_sacred_base(self, monkeypatch):
        ctx = self._build_ctx_for_prompt(monkeypatch)
        from app.services.llm_service import _build_multi_chart_system_prompt
        prompt = _build_multi_chart_system_prompt(ctx, "en")
        # Sacred RULES from get_system_prompt() must be present
        assert "RULE 1 — NEVER GUESS DASHA DATES" in prompt
        assert "RULE 5 — PROMISE VERDICT" in prompt
        assert "RULE 16 — STAR" in prompt and "HARMONY" in prompt
        assert "RULE 10 — NEVER INVENT" in prompt

    def test_system_prompt_carries_MC1_through_MC10(self, monkeypatch):
        ctx = self._build_ctx_for_prompt(monkeypatch)
        from app.services.llm_service import _build_multi_chart_system_prompt
        prompt = _build_multi_chart_system_prompt(ctx, "en")
        for mc in ["MC1 —", "MC2 —", "MC3 —", "MC4 —", "MC5 —",
                   "MC6 —", "MC7 —", "MC8 —", "MC9 —", "MC10 —"]:
            assert mc in prompt, f"multi-chart discipline rule {mc} missing"

    def test_system_prompt_includes_multi_chart_kb_v2(self, monkeypatch):
        ctx = self._build_ctx_for_prompt(monkeypatch)
        from app.services.llm_service import _build_multi_chart_system_prompt
        prompt = _build_multi_chart_system_prompt(ctx, "en")
        # KB v2 anchors that must appear
        assert "Multi-Chart Analysis" in prompt or "MULTI-CHART" in prompt
        # KB §11 cross-chart primitive specs
        assert "Cross-chart engine primitive" in prompt or "SYNASTRY OVERLAY" in prompt

    def test_system_prompt_includes_per_topic_kb(self, monkeypatch):
        ctx = self._build_ctx_for_prompt(monkeypatch)
        from app.services.llm_service import _build_multi_chart_system_prompt
        prompt = _build_multi_chart_system_prompt(ctx, "en")
        # Per-topic KB section header present (topic = marriage)
        assert "PER-TOPIC KP DOCTRINE" in prompt
        assert "MARRIAGE" in prompt

    def test_system_prompt_8_section_output_template(self, monkeypatch):
        ctx = self._build_ctx_for_prompt(monkeypatch)
        from app.services.llm_service import _build_multi_chart_system_prompt
        prompt = _build_multi_chart_system_prompt(ctx, "en")
        assert "Section 1: QUESTION INTERPRETATION" in prompt
        assert "Section 2: PER-CHART VERDICTS" in prompt
        assert "Section 3: CROSS-CHART OVERLAY" in prompt
        assert "Section 4: COMBINED VERDICT" in prompt
        assert "Section 5: TIMING" in prompt
        assert "Section 6: RECOMMENDED ACTION" in prompt
        assert "Section 7: CAVEATS" in prompt
        assert "Section 8: CLIENT SUMMARY" in prompt

    def test_system_prompt_verification_checklist_present(self, monkeypatch):
        ctx = self._build_ctx_for_prompt(monkeypatch)
        from app.services.llm_service import _build_multi_chart_system_prompt
        prompt = _build_multi_chart_system_prompt(ctx, "en")
        # MC10 verification checklist anchors
        assert "VERIFICATION CHECKLIST" in prompt
        assert "I have read each chart's full goated context block" in prompt
        assert "I will quote engine values VERBATIM" in prompt

    def test_system_prompt_telugu_directive_when_te_lang(self, monkeypatch):
        ctx = self._build_ctx_for_prompt(monkeypatch)
        from app.services.llm_service import _build_multi_chart_system_prompt
        prompt_te = _build_multi_chart_system_prompt(ctx, "te")
        prompt_en = _build_multi_chart_system_prompt(ctx, "en")
        # Telugu directive only in te variants
        assert "Telugu" in prompt_te
        assert "Telugu" not in prompt_en or "Telugu" in prompt_en  # base may mention; check directive
        # Telugu directive specifically
        assert "U+0C00-U+0C7F" in prompt_te
        assert "U+0C00-U+0C7F" not in prompt_en


# ────────────────────────────────────────────────────────────────────
# User-message builder tests — Phase 5 must use goated format_chart_for_llm
# ────────────────────────────────────────────────────────────────────
class TestPhase5UserMessage:
    def test_user_message_includes_goated_per_chart_context(self, monkeypatch):
        from app.services import multi_chart_engine as eng
        monkeypatch.setattr(eng, "detect_topic", lambda q: "marriage")
        from app.services.llm_service import _build_multi_chart_user_message
        ctx = compute_multi_chart_context([MANYUE, RAMYA], "Marriage compatibility?")
        msg = _build_multi_chart_user_message(ctx, "Marriage compatibility?")
        # Per-chart goated context section header present
        assert "PER-CHART GOATED CONTEXT" in msg
        # Each chart label present
        assert "Manyue" in msg
        assert "Ramya" in msg
        # Cross-chart engine primitives section present
        assert "CROSS-CHART ENGINE PRIMITIVES" in msg
        # SYNASTRY OVERLAY visible
        assert "SYNASTRY OVERLAY" in msg
        # SUB-LORD CROSS-CHECK visible
        assert "SUB-LORD CROSS-CHECK" in msg
        # JOINT DASHA visible
        assert "JOINT DASHA" in msg
        # COMBINATION RULE VERDICT visible
        assert "COMBINATION RULE VERDICT" in msg
        # Question echoed
        assert "Marriage compatibility?" in msg

    def test_user_message_carries_rp_at_moment(self, monkeypatch):
        from app.services import multi_chart_engine as eng
        monkeypatch.setattr(eng, "detect_topic", lambda q: "marriage")
        from app.services.llm_service import _build_multi_chart_user_message
        ctx = compute_multi_chart_context([MANYUE, RAMYA], "Marriage?")
        msg = _build_multi_chart_user_message(ctx, "Marriage?")
        assert "RULING PLANETS AT MOMENT OF QUERY" in msg
        assert "Location:" in msg

    def test_user_message_no_compact_summary_artifacts(self, monkeypatch):
        """Phase 5 removed compact summary helpers; their distinctive
        labels must not appear in the user message anymore."""
        from app.services import multi_chart_engine as eng
        monkeypatch.setattr(eng, "detect_topic", lambda q: "marriage")
        from app.services.llm_service import _build_multi_chart_user_message
        ctx = compute_multi_chart_context([MANYUE, RAMYA], "?")
        msg = _build_multi_chart_user_message(ctx, "?")
        assert "PER-CHART COMPACT SUMMARIES" not in msg, (
            "Phase 5 removed compact summaries; user message must not "
            "carry the old PER-CHART COMPACT SUMMARIES header."
        )

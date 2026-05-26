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
    GRAHA_ORDER,
    resolve_playbook,
    format_chart_compact_for_multi,
    compute_multi_chart_context,
    _deg_in_sign_dms,
    _invert_significators_for_planet,
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
# MultiChart-Phase-4 universal-fix regression tests.
#
# These guard against the May 2026 multi-chart bugs:
#   - Venus position contradiction across turns (Pisces vs Aquarius)
#   - Jupiter signification error ({2,4} vs {2,5,6,9})
#   - Mixed degree formats (54.67° absolute vs 24.67° deg-in-sign)
#
# The fix surfaces complete tables in the per-chart compact summary
# so the LLM has zero excuse to infer.  These tests assert the
# tables exist + contain the right shape, and that the system prompt
# carries the "quote verbatim" discipline.
# ────────────────────────────────────────────────────────────────────
class TestPhase4VerbatimDataDiscipline:
    def test_deg_in_sign_dms_basic(self):
        # 54.67° absolute = Taurus 24.67° = 24°40'12" (within rounding)
        out = _deg_in_sign_dms(54.67)
        assert out.startswith("24°"), f"expected starts with 24°, got {out!r}"
        # Format shape: DD°MM'SS"
        assert "°" in out and "'" in out and out.endswith('"')

    def test_deg_in_sign_dms_zero_in_sign(self):
        # 30.0° absolute = Taurus 00°00'00"
        assert _deg_in_sign_dms(30.0) == "00°00'00\""

    def test_deg_in_sign_dms_handles_none_and_garbage(self):
        assert _deg_in_sign_dms(None) == "—"
        assert _deg_in_sign_dms("not a number") == "—"

    def test_deg_in_sign_dms_wraps_360(self):
        # 360.0° wraps to 0° = Aries 00°00'00"
        assert _deg_in_sign_dms(360.0) == "00°00'00\""

    def test_invert_significators_handles_empty(self):
        out = _invert_significators_for_planet("Jupiter", {})
        assert out["all_signified"] == []

    def test_invert_significators_unions_4_steps(self):
        # Synthetic significators dict: Jupiter is occupant of H5,
        # in star of occupant of H2, in star of lord of H9, and is
        # house lord of H6.  Union should be {2, 5, 6, 9}.
        fake = {
            "House_2": {"occupants": [], "planets_in_star_of_occupants": ["Jupiter"],
                        "planets_in_star_of_lord": [], "house_lord": "Saturn"},
            "House_5": {"occupants": ["Jupiter"], "planets_in_star_of_occupants": [],
                        "planets_in_star_of_lord": [], "house_lord": "Sun"},
            "House_6": {"occupants": [], "planets_in_star_of_occupants": [],
                        "planets_in_star_of_lord": [], "house_lord": "Jupiter"},
            "House_9": {"occupants": [], "planets_in_star_of_occupants": [],
                        "planets_in_star_of_lord": ["Jupiter"], "house_lord": "Mars"},
        }
        out = _invert_significators_for_planet("Jupiter", fake)
        assert out["occupies"] == [5]
        assert out["in_star_of_occupants"] == [2]
        assert out["in_star_of_lord"] == [9]
        assert out["is_house_lord"] == [6]
        assert out["all_signified"] == [2, 5, 6, 9]

    def test_compact_summary_emits_all_9_planets_table(self, monkeypatch):
        """Per-chart compact summary MUST emit the PLANETARY POSITIONS
        table with ALL 9 grahas (root-cause of Venus contradiction)."""
        from app.services.chart_pipeline import build_full_chart_data
        cd = build_full_chart_data(**{**MANYUE, "topic": "marriage"})
        out = format_chart_compact_for_multi(
            cd, focus_houses=[2, 7, 11], karakas=["Venus", "Jupiter"],
            chart_label="Chart 1",
        )
        assert "PLANETARY POSITIONS" in out
        # Every graha must appear as a labelled row in the table.
        for planet in GRAHA_ORDER:
            # Each row begins "  Planet     | ..."
            assert f"  {planet:<8} |" in out, (
                f"PLANETARY POSITIONS table missing row for {planet}"
            )

    def test_compact_summary_emits_all_12_cusps(self, monkeypatch):
        """HOUSE CUSPS table MUST emit all 12 rows (so non-focus cusps
        are not silently absent — root-cause of cross-cusp inference)."""
        from app.services.chart_pipeline import build_full_chart_data
        cd = build_full_chart_data(**{**MANYUE, "topic": "marriage"})
        out = format_chart_compact_for_multi(
            cd, focus_houses=[7], karakas=[],
            chart_label="Chart 1",
        )
        assert "HOUSE CUSPS" in out
        for hn in range(1, 13):
            assert f"  H{hn:<2} |" in out, f"HOUSE CUSPS missing H{hn}"

    def test_compact_summary_emits_house_significators_for_focus(self, monkeypatch):
        """Engine-computed HOUSE SIGNIFICATORS must precede the LLM
        answer so it doesn't recompute (Jupiter {2,4} vs {2,5,6,9})."""
        from app.services.chart_pipeline import build_full_chart_data
        cd = build_full_chart_data(**{**MANYUE, "topic": "marriage"})
        out = format_chart_compact_for_multi(
            cd, focus_houses=[2, 7, 11], karakas=["Venus"],
            chart_label="Chart 1",
        )
        assert "HOUSE SIGNIFICATORS" in out
        for hn in [2, 7, 11]:
            assert f"  H{hn}: occupants=" in out, (
                f"HOUSE SIGNIFICATORS missing H{hn}"
            )

    def test_compact_summary_dms_format_used(self, monkeypatch):
        """Planet + cusp rows must use deg-in-sign DMS, not raw absolute
        longitude (fixes the 54.67° vs 24.67° mixed display)."""
        from app.services.chart_pipeline import build_full_chart_data
        cd = build_full_chart_data(**{**MANYUE, "topic": "marriage"})
        out = format_chart_compact_for_multi(
            cd, focus_houses=[1], karakas=[],
            chart_label="Chart 1",
        )
        # At least one DMS-shaped token must appear in PLANETARY POSITIONS.
        import re
        # DMS pattern: NN°NN'NN" — must show up at least once.
        assert re.search(r"\d{2}°\d{2}'\d{2}\"", out), (
            "expected DMS token (NN°NN'NN\") somewhere in compact summary"
        )

    def test_compact_summary_planet_row_has_signifies_column(self, monkeypatch):
        """Every planet row must end with a `signifies:[…]` column so
        the LLM can quote the 4-step union verbatim."""
        from app.services.chart_pipeline import build_full_chart_data
        cd = build_full_chart_data(**{**MANYUE, "topic": "marriage"})
        out = format_chart_compact_for_multi(
            cd, focus_houses=[7], karakas=["Venus"],
            chart_label="Chart 1",
        )
        # "signifies:" token must appear at least 9 times (once per graha)
        assert out.count("signifies:") >= 9, (
            "PLANETARY POSITIONS table must include 'signifies:' for each graha"
        )

    def test_compact_summary_planet_row_has_house_column(self, monkeypatch):
        """Planet rows MUST surface the house — root-cause of Venus
        position contradiction was an empty house field."""
        from app.services.chart_pipeline import build_full_chart_data
        cd = build_full_chart_data(**{**MANYUE, "topic": "marriage"})
        out = format_chart_compact_for_multi(
            cd, focus_houses=[7], karakas=["Venus"],
            chart_label="Chart 1",
        )
        # At least 9 "| H<n> |" tokens (one per planet row).  None should
        # be empty (the old bug emitted "| H |" with a blank house).
        import re
        house_tokens = re.findall(r"\| H\d{1,2} \|", out)
        assert len(house_tokens) >= 9, (
            f"expected ≥9 populated planet-house tokens, got {len(house_tokens)}"
        )

    def test_system_prompt_contains_verbatim_discipline(self):
        """The multi-chart system prompt MUST carry the R1-R6 verbatim
        discipline block (guards against future prompt regressions)."""
        from app.services.llm_service import _build_multi_chart_system_prompt
        ctx = {
            "topic":            "marriage",
            "playbook":         "marriage_compat",
            "combination_rule": "or_with_match_redirect",
            "focus_houses":     [2, 7, 11],
            "karakas":          ["Venus", "Jupiter"],
            "chart_count":      2,
            "chart_labels":     ["Chart 1 — ♂ A", "Chart 2 — ♀ B"],
        }
        prompt = _build_multi_chart_system_prompt(ctx, language="english")
        # Discipline anchor strings — any future refactor that removes
        # them will fail the test and force a deliberate decision.
        assert "VERBATIM-DATA DISCIPLINE" in prompt
        assert "R1." in prompt and "R2." in prompt and "R3." in prompt
        assert "R4." in prompt and "R5." in prompt and "R6." in prompt
        # The rules must reference the actual data tables they govern.
        assert "PLANETARY POSITIONS" in prompt
        assert "HOUSE CUSPS" in prompt
        assert "HOUSE SIGNIFICATORS" in prompt


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

"""Regression tests for cross_chart_engine.py — the 7 deterministic
multi-chart primitives.

PR MultiChart-Phase-5 (May 2026).

Each primitive has unit-level tests that don't require Anthropic calls.
The integration test (full Manyue x Ramya end-to-end) lives in
test_multi_chart.py.
"""
from __future__ import annotations

import pytest
from datetime import datetime

from app.services.cross_chart_engine import (
    GRAHA_ORDER,
    BHAVAT_BHAVAM_AXIS,
    PARTNERSHIP_KARAKA_ROLES,
    _deg_in_sign_dms,
    _invert_significators_for_planet,
    _5tier_verdict,
    _parse_date,
    compute_synastry_overlay,
    compute_common_significators,
    compute_joint_dasha_windows,
    compute_sublord_crosscheck,
    compute_bhavat_bhavam_crossval,
    compute_karaka_roles,
    compute_combination_verdict,
    compute_all,
    format_cross_chart_primitives_for_llm,
)


# ────────────────────────────────────────────────────────────────────
# Live chart fixtures (uses real ephemeris computation)
# ────────────────────────────────────────────────────────────────────
@pytest.fixture(scope="module")
def manyue_chart():
    from app.services.chart_pipeline import build_full_chart_data
    return build_full_chart_data(
        name="Manyue", date="2000-09-09", time="12:31",
        latitude=16.2378, longitude=80.6464, timezone_offset=5.5,
        gender="male", topic="marriage",
    )


@pytest.fixture(scope="module")
def ramya_chart():
    from app.services.chart_pipeline import build_full_chart_data
    return build_full_chart_data(
        name="Ramya", date="2001-03-15", time="08:45",
        latitude=17.385, longitude=78.4867, timezone_offset=5.5,
        gender="female", topic="marriage",
    )


@pytest.fixture(scope="module")
def partner_x_chart():
    from app.services.chart_pipeline import build_full_chart_data
    return build_full_chart_data(
        name="PartnerX", date="1992-07-04", time="20:50",
        latitude=12.9716, longitude=77.5946, timezone_offset=5.5,
        gender="male", topic="business",
    )


# ────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────
class TestHelpers:
    def test_graha_order_has_9(self):
        assert len(GRAHA_ORDER) == 9
        for p in ["Sun", "Moon", "Mars", "Mercury", "Jupiter",
                  "Venus", "Saturn", "Rahu", "Ketu"]:
            assert p in GRAHA_ORDER

    def test_bhavat_bhavam_axis_covers_kpr_relatives(self):
        # Common KPRM relative types must be present
        for rel in ["spouse", "child", "father", "mother",
                    "boss", "employee", "guru", "disciple",
                    "elder_sibling", "younger_sibling"]:
            assert rel in BHAVAT_BHAVAM_AXIS
        # Standard rotations per KP Reader IV
        assert BHAVAT_BHAVAM_AXIS["spouse"] == 7
        assert BHAVAT_BHAVAM_AXIS["child"] == 5
        assert BHAVAT_BHAVAM_AXIS["father"] == 9
        assert BHAVAT_BHAVAM_AXIS["mother"] == 4

    def test_partnership_karaka_roles_has_5(self):
        assert len(PARTNERSHIP_KARAKA_ROLES) == 5
        for p in ["Mars", "Mercury", "Saturn", "Jupiter", "Venus"]:
            assert p in PARTNERSHIP_KARAKA_ROLES

    def test_deg_in_sign_dms_basic(self):
        # 54.67° abs = Taurus 24°40' (54.67 - 30 = 24.67° in Taurus)
        out = _deg_in_sign_dms(54.67)
        assert out.startswith("24°")
        assert "°" in out and "'" in out and out.endswith('"')

    def test_deg_in_sign_dms_handles_zero(self):
        assert _deg_in_sign_dms(0.0) == "00°00'00\""
        assert _deg_in_sign_dms(30.0) == "00°00'00\""
        assert _deg_in_sign_dms(360.0) == "00°00'00\""

    def test_deg_in_sign_dms_handles_garbage(self):
        assert _deg_in_sign_dms(None) == "—"
        assert _deg_in_sign_dms("foo") == "—"

    def test_parse_date_yyyy_mm_dd(self):
        d = _parse_date("2021-02-09")
        assert d is not None
        assert d.year == 2021 and d.month == 2 and d.day == 9

    def test_parse_date_iso_with_time(self):
        d = _parse_date("2021-02-09T14:30:00")
        assert d is not None
        assert d.year == 2021 and d.month == 2 and d.day == 9

    def test_parse_date_handles_garbage(self):
        assert _parse_date("") is None
        assert _parse_date("not a date") is None
        assert _parse_date(None) is None

    def test_invert_significators_unions_4_steps(self):
        # Synthetic: Jupiter as occupant of H5, in star of occupant of H2,
        # in star of lord of H9, house lord of H6 → union {2,5,6,9}.
        fake = {
            "House_2": {"occupants": [],
                        "planets_in_star_of_occupants": ["Jupiter"],
                        "planets_in_star_of_lord": [],
                        "house_lord": "Saturn"},
            "House_5": {"occupants": ["Jupiter"],
                        "planets_in_star_of_occupants": [],
                        "planets_in_star_of_lord": [],
                        "house_lord": "Sun"},
            "House_6": {"occupants": [],
                        "planets_in_star_of_occupants": [],
                        "planets_in_star_of_lord": [],
                        "house_lord": "Jupiter"},
            "House_9": {"occupants": [],
                        "planets_in_star_of_occupants": [],
                        "planets_in_star_of_lord": ["Jupiter"],
                        "house_lord": "Mars"},
        }
        out = _invert_significators_for_planet("Jupiter", fake)
        assert out["occupies"] == [5]
        assert out["in_star_of_occupants"] == [2]
        assert out["in_star_of_lord"] == [9]
        assert out["is_house_lord"] == [6]
        assert out["all_signified"] == [2, 5, 6, 9]

    def test_5tier_verdict_strongly_promised(self):
        # 2 focus hits, 0 denial hits → STRONGLY PROMISED
        v = _5tier_verdict(
            sigs_for_focus={2, 7}, sigs_for_denial={2, 7},
            focus_houses={2, 7, 11}, denial_houses={1, 6, 10, 12},
        )
        assert v == "STRONGLY PROMISED"

    def test_5tier_verdict_promised(self):
        # 1 focus hit, 0 denial → PROMISED
        v = _5tier_verdict(
            sigs_for_focus={7}, sigs_for_denial={7},
            focus_houses={2, 7, 11}, denial_houses={1, 6, 10, 12},
        )
        assert v == "PROMISED"

    def test_5tier_verdict_conditional(self):
        # Both focus AND denial hit → CONDITIONAL
        v = _5tier_verdict(
            sigs_for_focus={7, 1}, sigs_for_denial={7, 1},
            focus_houses={2, 7, 11}, denial_houses={1, 6, 10, 12},
        )
        assert v == "CONDITIONAL"

    def test_5tier_verdict_denied(self):
        v = _5tier_verdict(
            sigs_for_focus={1, 6}, sigs_for_denial={1, 6},
            focus_houses={2, 7, 11}, denial_houses={1, 6, 10, 12},
        )
        assert v == "DENIED"


# ────────────────────────────────────────────────────────────────────
# ① Synastry overlay
# ────────────────────────────────────────────────────────────────────
class TestSynastryOverlay:
    def test_two_chart_emits_two_pairs(self, manyue_chart, ramya_chart):
        out = compute_synastry_overlay([manyue_chart, ramya_chart])
        assert "(1, 2)" in out
        assert "(2, 1)" in out
        assert len(out) == 2  # ordered pairs only, no self

    def test_three_chart_emits_six_pairs(self, manyue_chart, ramya_chart, partner_x_chart):
        out = compute_synastry_overlay([manyue_chart, ramya_chart, partner_x_chart])
        # N × (N-1) ordered pairs
        assert len(out) == 6

    def test_synastry_entry_has_required_fields(self, manyue_chart, ramya_chart):
        out = compute_synastry_overlay([manyue_chart, ramya_chart])
        pair = out["(1, 2)"]
        for p in GRAHA_ORDER:
            assert p in pair, f"missing graha {p}"
            entry = pair[p]
            assert "abs_lon" in entry
            assert "deg_in_sign_dms" in entry
            assert "sign" in entry
            assert "house_in_other" in entry
            assert isinstance(entry["house_in_other"], int)
            assert 1 <= entry["house_in_other"] <= 12


# ────────────────────────────────────────────────────────────────────
# ② Common significators
# ────────────────────────────────────────────────────────────────────
class TestCommonSignificators:
    def test_per_house_structure(self, manyue_chart, ramya_chart):
        out = compute_common_significators(
            [manyue_chart, ramya_chart], focus_houses=[2, 7, 11],
            rps_today=["Mercury", "Moon", "Venus"],
        )
        assert "per_house" in out
        for h in [2, 7, 11]:
            assert h in out["per_house"]
            assert "per_chart" in out["per_house"][h]
            assert "intersection_all_charts" in out["per_house"][h]
            assert "intersection_with_rp" in out["per_house"][h]

    def test_intersection_subset_of_each_chart(self, manyue_chart, ramya_chart):
        out = compute_common_significators(
            [manyue_chart, ramya_chart], focus_houses=[7],
        )
        h7 = out["per_house"][7]
        c1_sigs = set(h7["per_chart"][0]["significators"])
        c2_sigs = set(h7["per_chart"][1]["significators"])
        intersection = set(h7["intersection_all_charts"])
        assert intersection == (c1_sigs & c2_sigs)

    def test_rp_intersection_subset(self, manyue_chart, ramya_chart):
        out = compute_common_significators(
            [manyue_chart, ramya_chart], focus_houses=[7],
            rps_today=["Mercury", "Moon", "Venus", "Mars", "Saturn"],
        )
        h7 = out["per_house"][7]
        intersection = set(h7["intersection_all_charts"])
        intersection_rp = set(h7["intersection_with_rp"])
        # RP intersection must be subset of full intersection
        assert intersection_rp <= intersection
        # And subset of RPs
        assert intersection_rp <= {"Mercury", "Moon", "Venus", "Mars", "Saturn"}


# ────────────────────────────────────────────────────────────────────
# ③ Joint dasha windows
# ────────────────────────────────────────────────────────────────────
class TestJointDashaWindows:
    def test_returns_list_of_windows(self, manyue_chart, ramya_chart):
        windows = compute_joint_dasha_windows(
            [manyue_chart, ramya_chart], focus_houses=[2, 7, 11],
            rps_today=["Mercury", "Moon", "Mars", "Rahu", "Saturn"],
        )
        assert isinstance(windows, list)
        # For Manyue x Ramya, we EXPECT joint windows in next 24 months
        # (both have MD/AD lords signifying marriage houses at various
        # times — confirmed in live test 2026-05-26).
        assert len(windows) > 0

    def test_window_has_required_fields(self, manyue_chart, ramya_chart):
        windows = compute_joint_dasha_windows(
            [manyue_chart, ramya_chart], focus_houses=[2, 7, 11],
        )
        if windows:
            w = windows[0]
            assert "start" in w and "end" in w
            assert "score" in w and isinstance(w["score"], (int, float))
            assert "per_chart" in w
            assert "rp_overlap" in w
            # Per-chart entries
            for entry in w["per_chart"]:
                assert "chart_id" in entry
                assert "active_layers" in entry
                assert "lords_signifying" in entry

    def test_windows_sorted_by_score_desc(self, manyue_chart, ramya_chart):
        windows = compute_joint_dasha_windows(
            [manyue_chart, ramya_chart], focus_houses=[2, 7, 11],
            rps_today=["Mercury", "Moon"],
        )
        if len(windows) >= 2:
            for i in range(len(windows) - 1):
                assert windows[i]["score"] >= windows[i + 1]["score"]


# ────────────────────────────────────────────────────────────────────
# ④ Sublord cross-check
# ────────────────────────────────────────────────────────────────────
class TestSublordCrosscheck:
    def test_emits_entry_per_chart_per_focus_house(self, manyue_chart, ramya_chart):
        out = compute_sublord_crosscheck(
            [manyue_chart, ramya_chart], focus_houses=[7, 11],
            denial_houses=[1, 6, 10, 12],
        )
        assert "per_focus_house" in out
        for h in [7, 11]:
            entries = out["per_focus_house"][h]
            assert len(entries) == 2  # one entry per chart
            for entry in entries:
                assert "chart_id" in entry
                assert "csl" in entry
                assert "csl_signifies" in entry
                assert "verdict" in entry
                assert entry["verdict"] in {
                    "STRONGLY PROMISED", "PROMISED", "CONDITIONAL",
                    "WEAKLY PROMISED", "NEUTRAL", "DENIED",
                }


# ────────────────────────────────────────────────────────────────────
# ⑤ Bhavat Bhavam cross-validation
# ────────────────────────────────────────────────────────────────────
class TestBhavatBhavamCrossval:
    def test_returns_none_when_no_relative_type(self, manyue_chart, ramya_chart):
        out = compute_bhavat_bhavam_crossval(
            [manyue_chart, ramya_chart],
            relative_type=None,
            focus_houses_for_native=[7],
            focus_houses_for_relative=[1],
        )
        assert out is None

    def test_returns_none_when_only_one_chart(self, manyue_chart):
        out = compute_bhavat_bhavam_crossval(
            [manyue_chart], relative_type="spouse",
            focus_houses_for_native=[7], focus_houses_for_relative=[1],
        )
        assert out is None

    def test_returns_none_when_unknown_relative_type(self, manyue_chart, ramya_chart):
        out = compute_bhavat_bhavam_crossval(
            [manyue_chart, ramya_chart],
            relative_type="random_made_up_relation",
            focus_houses_for_native=[7], focus_houses_for_relative=[1],
        )
        assert out is None

    def test_spouse_axis_is_h7(self, manyue_chart, ramya_chart):
        out = compute_bhavat_bhavam_crossval(
            [manyue_chart, ramya_chart], relative_type="spouse",
            focus_houses_for_native=[7], focus_houses_for_relative=[1],
        )
        assert out is not None
        assert out["rotated_axis"] == 7
        assert out["applicable"] is True
        # Confidence is 95 if agree, 70 if disagree
        assert out["combined_confidence_pct"] in (70, 95)


# ────────────────────────────────────────────────────────────────────
# ⑥ Karaka role distribution
# ────────────────────────────────────────────────────────────────────
class TestKarakaRoles:
    def test_returns_none_for_n_less_than_3(self, manyue_chart, ramya_chart):
        out = compute_karaka_roles([manyue_chart, ramya_chart], topic="business")
        assert out is None

    def test_returns_none_for_non_partnership_topic(self, manyue_chart, ramya_chart, partner_x_chart):
        out = compute_karaka_roles(
            [manyue_chart, ramya_chart, partner_x_chart], topic="marriage",
        )
        assert out is None

    def test_returns_role_assignment_for_n3_business(self, manyue_chart, ramya_chart, partner_x_chart):
        out = compute_karaka_roles(
            [manyue_chart, ramya_chart, partner_x_chart], topic="business",
        )
        assert out is not None
        # Should have 5 karaka role entries
        assert len(out) == 5
        for role_label, info in out.items():
            assert "strongest_chart_id" in info
            assert 1 <= info["strongest_chart_id"] <= 3
            assert "score" in info
            assert "per_chart_scores" in info


# ────────────────────────────────────────────────────────────────────
# ⑦ Combination rule verdict
# ────────────────────────────────────────────────────────────────────
class TestCombinationVerdict:
    def test_or_rule_promised_with_joint_window(self):
        out = compute_combination_verdict(
            rule="or",
            per_chart_verdicts=["PROMISED", "CONDITIONAL"],
            joint_windows=[{"start": "2026-08-15", "end": "2026-11-22", "score": 87}],
        )
        assert out["verdict"] == "PROMISED"
        assert "PROMISED" in out["formula_trace"]

    def test_or_rule_conditional_positive_when_only_conditional_with_window(self):
        out = compute_combination_verdict(
            rule="or",
            per_chart_verdicts=["CONDITIONAL", "CONDITIONAL"],
            joint_windows=[{"start": "2026-08-15", "end": "2026-11-22", "score": 87}],
        )
        assert out["verdict"] == "CONDITIONAL-POSITIVE"

    def test_or_rule_denied_when_all_denied_no_window(self):
        out = compute_combination_verdict(
            rule="or",
            per_chart_verdicts=["DENIED", "DENIED"],
            joint_windows=[],
        )
        assert out["verdict"] == "DENIED"

    def test_and_rule_denied_only_when_all_deny(self):
        out_all_denied = compute_combination_verdict(
            rule="and",
            per_chart_verdicts=["DENIED", "DENIED", "DENIED"],
            joint_windows=[],
        )
        assert out_all_denied["verdict"] == "DENIED"
        out_partial = compute_combination_verdict(
            rule="and",
            per_chart_verdicts=["DENIED", "PROMISED", "DENIED"],
            joint_windows=[],
        )
        assert out_partial["verdict"] == "CONDITIONAL"
        out_none_denied = compute_combination_verdict(
            rule="and",
            per_chart_verdicts=["PROMISED", "PROMISED"],
            joint_windows=[],
        )
        assert out_none_denied["verdict"] == "NOT-DENIED"

    def test_synastry_rule_strong_fit(self):
        # 5 positive overlays, 0 friction
        fake_synastry = {
            "(1, 2)": {
                "Sun": {"house_in_other": 7},
                "Moon": {"house_in_other": 11},
                "Mars": {"house_in_other": 2},
                "Venus": {"house_in_other": 7},
                "Jupiter": {"house_in_other": 11},
                "Saturn": {"house_in_other": 4},  # not focus, not denial
            }
        }
        out = compute_combination_verdict(
            rule="synastry",
            per_chart_verdicts=["PROMISED", "PROMISED"],
            joint_windows=[],
            synastry_overlay=fake_synastry,
            focus_houses=[2, 7, 11],
        )
        assert out["verdict"] == "STRONG-FIT"

    def test_synastry_rule_incompatible(self):
        # 0 positive, 4 friction
        fake_synastry = {
            "(1, 2)": {
                "Sun": {"house_in_other": 6},
                "Moon": {"house_in_other": 8},
                "Mars": {"house_in_other": 12},
                "Saturn": {"house_in_other": 6},
            }
        }
        out = compute_combination_verdict(
            rule="synastry",
            per_chart_verdicts=["DENIED", "DENIED"],
            joint_windows=[],
            synastry_overlay=fake_synastry,
            focus_houses=[2, 7, 11],
        )
        assert out["verdict"] == "INCOMPATIBLE"


# ────────────────────────────────────────────────────────────────────
# compute_all + format_cross_chart_primitives_for_llm
# ────────────────────────────────────────────────────────────────────
class TestComputeAllEnd2End:
    def test_compute_all_returns_7_primitive_keys(self, manyue_chart, ramya_chart):
        primitives = compute_all(
            [manyue_chart, ramya_chart],
            focus_houses=[2, 7, 11], denial_houses=[1, 6, 10, 12],
            combination_rule="or", karakas=["Venus", "Jupiter"],
            topic="marriage", relative_type="spouse",
            rps_today=["Mercury", "Moon", "Mars", "Rahu", "Saturn"],
        )
        for key in [
            "synastry_overlay", "common_significators", "joint_dasha_windows",
            "sublord_crosscheck", "bhavat_bhavam_crossval",
            "karaka_roles", "combination_verdict",
        ]:
            assert key in primitives

    def test_format_renders_all_sections(self, manyue_chart, ramya_chart):
        primitives = compute_all(
            [manyue_chart, ramya_chart],
            focus_houses=[2, 7, 11], denial_houses=[1, 6, 10, 12],
            combination_rule="or", karakas=["Venus", "Jupiter"],
            topic="marriage", relative_type="spouse",
            rps_today=["Mercury", "Moon", "Mars", "Rahu", "Saturn"],
        )
        out = format_cross_chart_primitives_for_llm(
            primitives, ["Chart 1 — Manyue", "Chart 2 — Ramya"],
        )
        # All 7 primitive section headers visible
        assert "① SYNASTRY OVERLAY MATRIX" in out
        assert "② COMMON-SIGNIFICATOR SET" in out
        assert "③ JOINT DASHA INTERSECTION WINDOWS" in out
        assert "④ SUB-LORD CROSS-CHECK SUMMARY" in out
        assert "⑤ BHAVAT BHAVAM CROSS-VALIDATION" in out
        assert "⑦ COMBINATION RULE VERDICT" in out
        # MC2 "quote verbatim" reinforcement
        assert "VERBATIM" in out

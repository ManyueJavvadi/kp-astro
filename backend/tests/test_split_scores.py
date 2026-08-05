"""
PR A1.13d — tests for the split of "couple confidence" into the two
questions it was conflating:

  marriage_promise      — per person: does THIS chart grant marriage?
  couple_compatibility  — given it happens, how well do THESE TWO fit?

The bug being fixed: on the reference couple the old single score's
couple-level terms netted to zero (+10 +10 -15 -5), so a "couple
confidence" of 45 was arithmetically just the two individual promise
gates. Its largest couple-level term was Rajju (-15) — a traditional
koota KP does not use.
"""

import pytest

from app.services.compatibility_engine import (
    PROMISE_FULL,
    PROMISE_NONE,
    PROMISE_PARTIAL,
    PROMISE_WEAK,
    _compute_split_scores,
    compute_compatibility,
)

BOY = {
    "name": "Manyue", "date": "2000-09-09", "time": "12:31",
    "latitude": 16.24, "longitude": 80.65, "timezone_offset": 5.5,
    "gender": "male",
}
GIRL = {
    "name": "Annapurna", "date": "2000-08-18", "time": "06:51",
    "latitude": 16.24, "longitude": 80.65, "timezone_offset": 5.5,
    "gender": "female",
}

NEUTRAL = dict(
    p1_promise_tier=PROMISE_FULL, p2_promise_tier=PROMISE_FULL,
    p1_denial=False, p2_denial=False,
    both_sides_cross_match=False, one_side_cross_match=False,
    resonance_count=0, h7_lord_both_support=False,
    asc_friendship_verdict="", h7_friendship_verdict="",
    element_verdict="", overlap_window_count=0,
    ksk_stricter_exceptional=False, pattern_d2_fire=False,
    sep_risk_high_either=False,
)


@pytest.fixture(scope="module")
def result():
    return compute_compatibility(BOY, GIRL)


# ── The core separation ───────────────────────────────────────────────

def test_promise_is_independent_of_partner():
    """
    The whole point: a person's marriage promise must NOT move when the
    pairing signals change. It is a property of one chart.
    """
    weak_pair = _compute_split_scores(**{**NEUTRAL,
                                        "both_sides_cross_match": False,
                                        "resonance_count": 0,
                                        "asc_friendship_verdict": "RED"})
    strong_pair = _compute_split_scores(**{**NEUTRAL,
                                          "both_sides_cross_match": True,
                                          "resonance_count": 9,
                                          "asc_friendship_verdict": "GREEN"})
    assert (weak_pair["marriage_promise"]["person1"]["score"]
            == strong_pair["marriage_promise"]["person1"]["score"])
    # ...while couple compatibility DOES move.
    assert (strong_pair["couple_compatibility"]["score"]
            > weak_pair["couple_compatibility"]["score"])


def test_couple_score_is_independent_of_promise_tier():
    """Conversely, the pairing score must not be dragged by an individual gate."""
    a = _compute_split_scores(**{**NEUTRAL, "p2_promise_tier": PROMISE_FULL})
    b = _compute_split_scores(**{**NEUTRAL, "p2_promise_tier": PROMISE_NONE})
    assert a["couple_compatibility"]["score"] == b["couple_compatibility"]["score"]


def test_traditional_doshas_excluded_from_couple_score():
    """
    Rajju/Ashtakoota must not be inputs at all — the signature should not
    accept them. Guards against someone re-introducing the contamination.
    """
    import inspect
    params = set(inspect.signature(_compute_split_scores).parameters)
    for banned in ("rajju_dosha", "ashtakoota_score", "ashtakoota_max",
                   "nadi_dosha", "manglik"):
        assert banned not in params, f"{banned} must not feed the KP couple score"


# ── Promise scoring ───────────────────────────────────────────────────

def test_promise_tiers_are_ordered():
    def s(tier):
        return _compute_split_scores(**{**NEUTRAL, "p1_promise_tier": tier}
                                     )["marriage_promise"]["person1"]["score"]
    assert s(PROMISE_FULL) > s(PROMISE_PARTIAL) > s(PROMISE_WEAK) > s(PROMISE_NONE)


def test_denial_penalises_only_non_full_promise():
    full_den = _compute_split_scores(**{**NEUTRAL, "p1_promise_tier": PROMISE_FULL,
                                        "p1_denial": True})
    full_clean = _compute_split_scores(**{**NEUTRAL, "p1_promise_tier": PROMISE_FULL})
    # Full promise absorbs the denial — no penalty
    assert (full_den["marriage_promise"]["person1"]["score"]
            == full_clean["marriage_promise"]["person1"]["score"])

    part_den = _compute_split_scores(**{**NEUTRAL, "p1_promise_tier": PROMISE_PARTIAL,
                                        "p1_denial": True})
    part_clean = _compute_split_scores(**{**NEUTRAL, "p1_promise_tier": PROMISE_PARTIAL})
    assert (part_den["marriage_promise"]["person1"]["score"]
            < part_clean["marriage_promise"]["person1"]["score"])


def test_scores_are_clamped_0_100():
    best = _compute_split_scores(**{**NEUTRAL,
                                   "both_sides_cross_match": True, "resonance_count": 50,
                                   "h7_lord_both_support": True,
                                   "asc_friendship_verdict": "GREEN",
                                   "h7_friendship_verdict": "GREEN",
                                   "element_verdict": "COMPATIBLE",
                                   "overlap_window_count": 9,
                                   "ksk_stricter_exceptional": True})
    worst = _compute_split_scores(**{**NEUTRAL,
                                     "asc_friendship_verdict": "RED",
                                     "h7_friendship_verdict": "RED",
                                     "element_verdict": "FRICTION",
                                     "pattern_d2_fire": True,
                                     "sep_risk_high_either": True})
    assert 0 <= worst["couple_compatibility"]["score"] <= 100
    assert 0 <= best["couple_compatibility"]["score"] <= 100
    assert best["couple_compatibility"]["score"] > worst["couple_compatibility"]["score"]


def test_resonance_contribution_is_capped():
    a = _compute_split_scores(**{**NEUTRAL, "resonance_count": 8})
    b = _compute_split_scores(**{**NEUTRAL, "resonance_count": 40})
    assert a["couple_compatibility"]["score"] == b["couple_compatibility"]["score"]


def test_breakdown_deltas_sum_to_score():
    r = _compute_split_scores(**{**NEUTRAL, "both_sides_cross_match": True,
                                 "resonance_count": 5, "h7_lord_both_support": True,
                                 "overlap_window_count": 1})
    cc = r["couple_compatibility"]
    assert sum(b["delta"] for b in cc["breakdown"]) == cc["score"]


# ── Golden couple + contract ──────────────────────────────────────────

def test_golden_couple_split(result):
    mp = result["marriage_promise"]
    cc = result["couple_compatibility"]
    # His promise is Full; hers is Partial-with-denial → materially lower.
    assert mp["person1"]["score"] > mp["person2"]["score"]
    # The pairing itself scores well despite her weaker individual gate.
    assert cc["score"] >= 70


def test_legacy_confidence_still_present(result):
    """Backward compatibility — the old field must not disappear."""
    assert isinstance(result["couple_confidence_score"], int)
    assert result["couple_confidence_breakdown"]


def test_frontend_contract_split(result):
    mp = result["marriage_promise"]
    assert {"person1", "person2", "what_it_answers"} <= set(mp)
    for k in ("person1", "person2"):
        assert {"score", "band", "tier", "has_denial", "breakdown"} <= set(mp[k])
    cc = result["couple_compatibility"]
    assert {"score", "band", "breakdown", "what_it_answers", "excludes"} <= set(cc)

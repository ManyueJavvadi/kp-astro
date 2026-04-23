"""
Muhurtha engine tests — PR A2.2f.

Regression tests pin the classical KP rules enforced by the engine
(PR A2.2b / A2.2c / A2.2c.1 / A2.2c.2 / A2.2e). Updates to the engine
that drift these values must be intentional — adjust the test AND
leave a one-line note naming the KB section / classical source.

Design principles:
  - Unit tests for pure-Python helpers (no swisseph calls) are fast
    and deterministic; they pin the lookup-table logic.
  - Integration tests call find_muhurtha_windows with narrow date
    ranges (1-2 days) to keep wall-clock time low. Expected fields
    checked for presence + type, not exact scores (scores drift
    with KB tuning).
  - Tests are structured as pytest functions; no class boilerplate.
"""
from datetime import datetime

import pytest

from app.services.muhurtha_engine import (
    find_muhurtha_windows,
    classify_event,
    _is_chandrashtamam,
    _is_janma_tara,
    _evaluate_participant,
    _natal_badhakesh_marakesh,
    _natal_dasha_list,
    _dasha_lords_at,
    EVENT_HOUSE_GROUPS,
)
from app.services.muhurtha_findings import (
    compute_findings,
    NAKSHATRA_CLASS,
    EVENT_PREFERRED_NAK_CLASSES,
    EVENT_PRACTICAL_HOURS,
    RIKTA_NANDA_AVOID_TITHIS,
)


# ───────── Reusable fixtures ─────────

# Anchored on the founder's birth chart for consistency with dev testing.
MANYUE = {
    "name": "Manyue",
    "date": "2000-09-09",
    "time": "12:31",
    "latitude": 16.247,
    "longitude": 80.633,
    "timezone_offset": 5.5,
}

TENALI = {"lat": 16.247, "lon": 80.633, "tz_offset": 5.5}


# ═══════════════ UNIT TESTS ═══════════════

# ── classify_event — free-form text → canonical event key ──

def test_classify_event_vehicle():
    assert classify_event("Vehicle Purchase") == "vehicle"
    assert classify_event("car delivery") == "vehicle"
    assert classify_event("వాహన కొనుగోలు") == "vehicle"

def test_classify_event_marriage():
    assert classify_event("marriage") == "marriage"
    assert classify_event("Wedding Ceremony") == "marriage"
    assert classify_event("kalyanam") == "marriage"

def test_classify_event_fallback_general():
    assert classify_event("something random the engine doesn't know") == "general"


# ── EVENT_HOUSE_GROUPS — structural correctness ──

def test_all_event_groups_have_required_keys():
    for event_key, group in EVENT_HOUSE_GROUPS.items():
        assert "primary" in group, f"{event_key} missing primary house"
        assert "supporting" in group, f"{event_key} missing supporting list"
        assert "denial" in group, f"{event_key} missing denial list"
        assert 1 <= group["primary"] <= 12
        assert all(1 <= h <= 12 for h in group["supporting"])
        assert all(1 <= h <= 12 for h in group["denial"])

def test_vehicle_house_group_classical():
    # KB §2: Vehicle = primary H4, supporting H3+H11, denial H8+H12
    g = EVENT_HOUSE_GROUPS["vehicle"]
    assert g["primary"] == 4
    assert set(g["supporting"]) == {3, 11}
    assert set(g["denial"]) == {8, 12}

def test_marriage_house_group_classical():
    # KB §2: Marriage = primary H7, supporting includes H2 + H11
    g = EVENT_HOUSE_GROUPS["marriage"]
    assert g["primary"] == 7
    assert 2 in g["supporting"]
    assert 11 in g["supporting"]


# ── Chandrashtamam + Janma Tara per KB §8.1 ──

def test_chandrashtamam_natal_aries_moon_in_scorpio():
    # Natal Aries (idx 0), current Moon at 210° (Scorpio, idx 7) = 8th from natal
    assert _is_chandrashtamam(0, 210.0) is True

def test_chandrashtamam_natal_aries_moon_in_taurus_is_not():
    # Natal Aries, current Moon at 30° (Taurus, idx 1) ≠ 8th
    assert _is_chandrashtamam(0, 30.0) is False

def test_janma_tara_self_nakshatra():
    # Natal Swati (idx 14), current Moon inside Swati = Janma Tara
    assert _is_janma_tara(14, 14 * (360.0 / 27) + 5.0) is True

def test_janma_tara_other_nakshatra():
    # Natal Swati, current Moon at 0° (Ashwini) ≠ Janma Tara
    assert _is_janma_tara(14, 0.0) is False


# ── _evaluate_participant — minimum viable shape ──

def test_evaluate_participant_structure():
    result = _evaluate_participant(
        "test",
        {"moon_nakshatra_idx": 14, "moon_sign_idx": 6},
        180.0,  # Moon at 180° (start of Libra, sign 6)
    )
    assert result["name"] == "test"
    # All A2.2c fields must be present
    for field in (
        "chandrashtamam", "janma_tara",
        "tara_bala_num", "tara_bala_name", "tara_bala_good",
        "chandrabala_num", "chandrabala_good",
        "soft_score", "hard_rejected_for",
        # A2.2c.2 fields (present even when dashas/bm not passed)
        "current_md", "current_ad",
        "badhakesh", "badhakesh_active", "marakesh_active",
    ):
        assert field in result, f"Missing field: {field}"


# ── Natal Badhakesh/Marakesh (KB §8.1, A2.2c.2) ──

def test_natal_badhakesh_marakesh_scorpio_lagna():
    """Manyue: Scorpio Lagna (Fixed) → Badhaka H9 (Cancer, lord Moon)
    → Marakesh = {lord of 2nd (Sagittarius, Jupiter), lord of 7th
    (Taurus, Venus)}"""
    bm = _natal_badhakesh_marakesh(MANYUE)
    assert bm["lagna_sign"] == "Scorpio"
    assert bm["lagna_sign_type"] == "Fixed"
    assert bm["badhaka_house"] == 9
    assert bm["badhakesh"] == "Moon"
    assert bm["marakesh"] == {"Jupiter", "Venus"}


def test_natal_dasha_list_produces_9_periods():
    dashas = _natal_dasha_list(MANYUE)
    assert len(dashas) == 9  # Full Vimshottari cycle
    lords = {d["lord"] for d in dashas}
    assert lords == {"Sun", "Moon", "Mars", "Rahu", "Jupiter",
                      "Saturn", "Mercury", "Ketu", "Venus"}


def test_dasha_lords_at_mid_period():
    dashas = _natal_dasha_list(MANYUE)
    # Manyue's Moon MD runs ~2004-02 to 2014-02; 2010 is mid-period.
    md, ad = _dasha_lords_at(dashas, "2010-01-01")
    assert md == "Moon"
    assert ad is not None


def test_dasha_lords_at_returns_none_when_out_of_range():
    dashas = _natal_dasha_list(MANYUE)
    # Before birth
    md, ad = _dasha_lords_at(dashas, "1900-01-01")
    assert md is None
    assert ad is None


def test_badhakesh_dba_fires_hard_reject():
    """When a participant is in their Badhakesh MD, the evaluator
    must emit a hard-reject string."""
    dashas = _natal_dasha_list(MANYUE)
    bm = _natal_badhakesh_marakesh(MANYUE)
    # 2010-01-01 is in Manyue's Moon MD (= Badhakesh for Scorpio lagna)
    result = _evaluate_participant(
        "Manyue", {"moon_nakshatra_idx": 14, "moon_sign_idx": 6}, 180.0,
        natal_bm=bm, dashas=dashas, target_date_str="2010-01-01",
    )
    assert result["badhakesh_active"] is True
    assert any("Badhakesh" in r for r in result["hard_rejected_for"])


# ── findings module — lookup tables ──

def test_nakshatra_class_swati_is_chara():
    # Swati index = 14. KB §3.2: Swati is Chara (movable) class.
    assert NAKSHATRA_CLASS[14] == "Chara"

def test_nakshatra_class_ardra_is_tikshna():
    # Ardra index = 5. KB §3.2: Ardra is Tikshna (sharp) class.
    assert NAKSHATRA_CLASS[5] == "Tikshna"

def test_event_preferred_nak_classes_vehicle_includes_chara():
    # Vehicle purchase classically prefers Chara nakshatras (KB §9.6).
    assert "Chara" in EVENT_PREFERRED_NAK_CLASSES["vehicle"]

def test_event_practical_hours_vehicle_is_daytime():
    # Vehicle = 09:00-19:00 (dealership hours)
    start, end = EVENT_PRACTICAL_HOURS["vehicle"]
    assert start == 9
    assert end == 19
    # 1 AM is NOT practical for vehicle (A2.2b audit bug)
    assert not (start <= 1 < end)

def test_event_practical_hours_marriage_anytime():
    # Marriage = anytime (Indian evening muhurthas normal)
    start, end = EVENT_PRACTICAL_HOURS["marriage"]
    assert start == 0
    assert end == 24


# ── findings.compute_findings — structured output shape ──

def test_compute_findings_clean_window_shape():
    sample = {
        "start_time": "13:04",
        "lagna": "Gemini", "lagna_sublord": "Sun",
        "signified_houses": [3, 4, 11],
        "event_cusp_csl": "Venus", "event_cusp_houses": [5, 9, 12],
        "event_cusp_confirms": False,
        "h11_csl": "Sun", "h11_houses": [3, 4, 11], "h11_confirms": True,
        "moon_nakshatra": "Swati", "moon_sl_favorable": False,
        "badhaka_check": {"passed": True, "badhaka_hit": False, "maraka_hit": False},
        "panchang": {"tithi": "Trayodashi", "paksha": "Shukla",
                     "nakshatra": "Swati", "yoga": "Variyan", "vara": "Thursday"},
        "moon_nakshatra_idx": 14, "weekday_idx": 3, "yoga_idx": 17,
    }
    f = compute_findings(sample, "vehicle")
    assert f["lagna_csl"]["has_primary"] is True
    assert f["lagna_csl"]["denial_hit"] == []
    assert f["lagna_csl"]["supporting_hit"] == [3, 11]
    assert f["h11_same_as_lagna_csl"] is True
    assert f["panchang"]["nakshatra"]["class"] == "Chara"
    assert f["panchang"]["nakshatra"]["event_class_match"] is True
    assert f["time_of_day"]["within_practical_hours"] is True


def test_compute_findings_denial_hit_detected():
    # Mars → H3, H4, H8, H11, H12 — denial houses H8 + H12 present
    sample = {
        "start_time": "03:20",
        "lagna": "Sagittarius", "lagna_sublord": "Mars",
        "signified_houses": [3, 4, 8, 11, 12],
        "event_cusp_csl": "Venus", "event_cusp_houses": [2, 5, 6, 10],
        "h11_csl": "Mercury", "h11_houses": [3, 6, 7, 9],
        "moon_nakshatra": "Swati",
        "panchang": {"tithi": "Trayodashi", "paksha": "Shukla",
                     "nakshatra": "Swati", "yoga": "Variyan", "vara": "Thursday"},
        "moon_nakshatra_idx": 14, "weekday_idx": 3, "yoga_idx": 17,
    }
    f = compute_findings(sample, "vehicle")
    assert 8 in f["lagna_csl"]["denial_hit"]
    assert 12 in f["lagna_csl"]["denial_hit"]
    # 03:20 AM is outside vehicle practical hours (09-19)
    assert f["time_of_day"]["within_practical_hours"] is False


def test_rikta_nanda_tithi_set_contains_4_9_14():
    # KB §3.1: Rikta-Nanda (4/9/14) are avoid tithis regardless of paksha.
    assert RIKTA_NANDA_AVOID_TITHIS == {4, 9, 14}


# ═══════════════ INTEGRATION TESTS ═══════════════
# These invoke find_muhurtha_windows; slow (~5-30s per call) so kept minimal.

def test_narrow_range_returns_structured_response():
    """End-to-end: 2-day vehicle search, 1 participant, verify response
    shape. Does NOT pin scores (which drift with tuning) — only checks
    structural invariants."""
    result = find_muhurtha_windows(
        date_start="2026-04-25", date_end="2026-04-26",
        event_type="vehicle",
        **TENALI, nearby_days=0,
        participants=[MANYUE],
    )
    # All required top-level keys (A2.2b + A2.2c additions)
    for key in (
        "windows", "soft_flagged_windows", "best_window",
        "nearby_better", "extend_suggestion",
        "event_type", "event_label", "searched_range",
        "participants_loaded", "event_location_different",
        "passed_count", "soft_flagged_count",
    ):
        assert key in result, f"Missing top-level key: {key}"
    assert result["event_type"] == "vehicle"
    # passed + soft-flagged windows are disjoint lists
    assert isinstance(result["windows"], list)
    assert isinstance(result["soft_flagged_windows"], list)


def test_vehicle_range_hard_rejects_1am_window():
    """PR A2.2b regression: the 01:04 AM window that originally scored
    185 Excellent must now be soft-flagged (not in passed tier)."""
    result = find_muhurtha_windows(
        date_start="2026-04-25", date_end="2026-04-26",
        event_type="vehicle",
        **TENALI, nearby_days=0,
        participants=[MANYUE],
    )
    for w in result["windows"]:
        # Every passed window must be within 09:00-19:00 local
        hh = int(w["start_time"].split(":")[0])
        assert 9 <= hh < 19, f"Window {w['start_time']} snuck past practical-hours filter"


def test_passed_windows_have_no_denial_hits():
    """PR A2.2b regression: no passed window's Lagna CSL may signify
    H8 or H12 for a vehicle purchase (§1/§2 KB)."""
    result = find_muhurtha_windows(
        date_start="2026-04-25", date_end="2026-04-26",
        event_type="vehicle",
        **TENALI, nearby_days=0,
        participants=[MANYUE],
    )
    for w in result["windows"]:
        denial = set(w.get("lagna_denial_hit", []))
        assert not denial, f"Passed window {w['start_time']} has denial hits {denial}"


def test_passed_windows_have_primary_house():
    """PR A2.2b regression: every passed vehicle window's Lagna CSL
    must signify H4 (primary). A window without the event's primary
    house is not an event-muhurtha by definition (§2 KB)."""
    result = find_muhurtha_windows(
        date_start="2026-04-25", date_end="2026-04-26",
        event_type="vehicle",
        **TENALI, nearby_days=0,
        participants=[MANYUE],
    )
    for w in result["windows"]:
        assert 4 in w.get("signified_houses", []), (
            f"Passed window {w['start_time']} Lagna CSL missing H4 (primary for vehicle)"
        )


def test_passed_windows_have_minimum_20min_duration():
    """PR A2.2b regression: windows shorter than 20 min must not be
    shown as top results (the merge-step bug produced 12-min windows)."""
    result = find_muhurtha_windows(
        date_start="2026-04-25", date_end="2026-04-26",
        event_type="vehicle",
        **TENALI, nearby_days=0,
        participants=[MANYUE],
    )
    for w in result["windows"]:
        start = datetime.strptime(w["start_time"], "%H:%M")
        end = datetime.strptime(w["end_time"], "%H:%M")
        mins = (end - start).seconds // 60
        assert mins >= 20, f"Passed window {w['start_time']}-{w['end_time']} is only {mins} min"


def test_per_participant_fields_present_in_passed_windows():
    """PR A2.2c: every passed window must carry per_participant data
    when participants are provided."""
    result = find_muhurtha_windows(
        date_start="2026-04-25", date_end="2026-04-26",
        event_type="vehicle",
        **TENALI, nearby_days=0,
        participants=[MANYUE],
    )
    for w in result["windows"]:
        assert "per_participant" in w
        assert isinstance(w["per_participant"], list)
        assert len(w["per_participant"]) == 1
        pp = w["per_participant"][0]
        assert pp["name"] == "Manyue"
        # A2.2c.2 fields
        assert "current_md" in pp
        assert "badhakesh" in pp


def test_passed_score_floor_enforced():
    """PR A2.2c.1: no passed window may have score < 30 (PASSED_SCORE_FLOOR)."""
    result = find_muhurtha_windows(
        date_start="2026-04-25", date_end="2026-04-26",
        event_type="vehicle",
        **TENALI, nearby_days=0,
        participants=[MANYUE],
    )
    for w in result["windows"]:
        assert w.get("score", 0) >= 30, f"Score {w['score']} below floor for {w['start_time']}"


def test_extend_suggestion_shape_when_triggered():
    """PR A2.2c: when passed_count == 0, extend_suggestion must be
    either a valid dict with the documented keys OR None (if nothing
    qualifies in the forward 30-day window either). This test
    validates the invariant: IF extend_suggestion is non-null, THEN
    it has the right shape — we don't force an empty range here
    because engine behaviour at edge dates is deterministic but
    date-dependent, and pinning a specific empty range leads to
    brittle tests."""
    result = find_muhurtha_windows(
        date_start="2026-04-25", date_end="2026-04-26",
        event_type="vehicle",
        **TENALI, nearby_days=0,
        participants=[MANYUE],
    )
    # Invariants either direction:
    # passed_count >= 0 is trivially true; extend_suggestion is either
    # None (when passed_count > 0) or a dict with the expected keys
    # (when passed_count == 0 and a forward window was found).
    es = result.get("extend_suggestion")
    if es is not None:
        assert "window" in es
        assert "days_from_range_end" in es
        assert "blocking_reasons" in es
        assert isinstance(es["blocking_reasons"], list)
        # When passed_count > 0, extend_suggestion should be None
        # (engine only computes it when no candidates in the main range)
        assert result["passed_count"] == 0, (
            "extend_suggestion should only be emitted when passed_count=0"
        )


# ═══════════════ A2.2e DOSHA INTEGRATION TESTS ═══════════════

def test_marriage_window_flags_combust_and_solar_month():
    """PR A2.2e: windows for marriage emit combust + solar-month flags."""
    result = find_muhurtha_windows(
        date_start="2026-04-25", date_end="2026-04-25",
        event_type="marriage",
        **TENALI, nearby_days=0,
        participants=[MANYUE],
    )
    # Check that the new A2.2e fields are always present on every window
    # (passed or soft-flagged), regardless of value.
    all_windows = (result.get("windows") or []) + (result.get("soft_flagged_windows") or [])
    assert all_windows, "Expected at least one window for this range"
    for w in all_windows:
        for field in ("venus_combust", "jupiter_combust",
                       "solar_month_blocked", "kartari_active", "ekargala_active"):
            assert field in w, f"Missing A2.2e field: {field}"


def test_vehicle_event_does_not_trigger_marriage_doshas():
    """PR A2.2e: Venus/Jupiter combust check is vivaha-only; vehicle
    event must never have venus_combust / jupiter_combust /
    solar_month_blocked triggered (backend short-circuits)."""
    result = find_muhurtha_windows(
        date_start="2026-04-25", date_end="2026-04-25",
        event_type="vehicle",
        **TENALI, nearby_days=0,
        participants=[MANYUE],
    )
    all_windows = (result.get("windows") or []) + (result.get("soft_flagged_windows") or [])
    for w in all_windows:
        assert w["venus_combust"] is False
        assert w["jupiter_combust"] is False
        assert w["solar_month_blocked"] is False

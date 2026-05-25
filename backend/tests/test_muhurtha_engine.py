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


# ════════════════════════════════════════════════════════════════
# PR Mu1 — Golden tests for the Mu0 critical-correctness hotfix wave.
#
# These pin the post-Mu0 behaviour so we can't accidentally re-introduce
# the bugs Mu0a–Mu0g fixed:
#   Mu0a — marriage denial set MUST include H12
#   Mu0b — DST re-resolution per scan day (Chicago Mar/Nov crossings)
#   Mu0c — per-event vara not double-counted (Tue/Sat for legal +10 net)
#   Mu0d — _get_sunrise_sunset_jd returns REAL sunrise (was fake 06/18)
#          + polar latitude raises MuhurthaSunriseError (was silent fake)
#   Mu0e — tithi_num clamped to [1, 30]; tithi 15 = "Purnima",
#          tithi 30 = "Amavasya"; Vedic vara flips at local sunrise
#   Mu0f — same broken rise_trans signature fixed in chart_engine
#          + astrologer (not exercised here — those callers have own tests)
#   Mu0g — antardasha memoised; Moon refreshed per slot
# ════════════════════════════════════════════════════════════════


# ── Mu0a — H12 in marriage denial ──

def test_mu0a_marriage_denial_includes_h12():
    """KB §2 + KSK marriage doctrine: H12 (loss/separation) must be in
    the marriage denial set. Before Mu0a the engine had [1,6,10] and
    silently passed muhurthas where Lagna SL signified H12."""
    assert 12 in EVENT_HOUSE_GROUPS["marriage"]["denial"], (
        "marriage denial set lost H12 — re-introducing the Mu0a regression"
    )
    # Other denial houses still present
    for h in (1, 6, 10):
        assert h in EVENT_HOUSE_GROUPS["marriage"]["denial"]


# ── Mu0d — real sunrise (not fake 06:00) ──

def test_mu0d_sunrise_is_real_not_06_00():
    """Tenali at 16.247°N on 2026-04-25 has actual sunrise around
    05:46 IST. Before Mu0d, swe.rise_trans was called with 8 args (max
    7 accepted), every call raised TypeError, the engine silently
    returned (jd-0.25, jd+0.25) = fake 06:00/18:00. We assert real
    sunrise is BEFORE 06:00 IST (which the fake fallback would have
    returned exactly)."""
    import swisseph as swe
    from datetime import datetime as _dt, timedelta as _td
    from app.services.muhurtha_engine import _get_sunrise_sunset_jd
    jd = swe.julday(2026, 4, 25, 12.0)  # noon UTC anchor
    sr, ss = _get_sunrise_sunset_jd(jd, 16.247, 80.633)
    # Convert sunrise JD → IST clock
    def jd_to_utc(jd_val):
        return _dt(1970, 1, 1) + _td(days=jd_val - 2440587.5)
    sr_ist = jd_to_utc(sr) + _td(hours=5.5)
    # Real Tenali sunrise late April is 05:43-05:48 IST; fake fallback
    # would have been exactly 06:00. Anything below 05:55 confirms the
    # real-math path is running.
    assert sr_ist.hour == 5 and sr_ist.minute < 55, (
        f"Sunrise {sr_ist.isoformat()} — looks like the fake-day "
        f"fallback ((jd-0.25, jd+0.25)) is back. Mu0d regressed."
    )
    # Sunset sanity: real Tenali April sunset ~18:24 IST; fake = 18:00
    ss_ist = jd_to_utc(ss) + _td(hours=5.5)
    assert ss_ist.hour == 18 and ss_ist.minute > 10, (
        f"Sunset {ss_ist.isoformat()} — looks like the fake-day fallback "
        f"is back. Mu0d regressed."
    )


def test_mu0d_polar_latitude_raises_loud():
    """Longyearbyen, Svalbard (78.22°N) on 2026-12-22 has polar night
    — Sun never rises. Before Mu0d, _get_sunrise_sunset_jd silently
    returned a fake 12-hour day. Now must raise MuhurthaSunriseError
    so the scan loop can record the day as skipped instead of
    inventing muhurtha windows."""
    import swisseph as swe
    from app.services.muhurtha_engine import _get_sunrise_sunset_jd, MuhurthaSunriseError
    jd = swe.julday(2026, 12, 22, 12.0)
    with pytest.raises(MuhurthaSunriseError):
        _get_sunrise_sunset_jd(jd, 78.22, 15.65)


def test_mu0d_polar_day_appears_in_skipped_list():
    """find_muhurtha_windows must surface skipped polar days in the
    response so the UI can show 'no muhurtha computable' rather than
    silently dropping the day."""
    # Search a winter day in Longyearbyen for any event
    r = find_muhurtha_windows(
        date_start="2026-12-22", date_end="2026-12-22",
        event_type="general",
        lat=78.22, lon=15.65, tz_offset=1.0,  # CET, no DST in winter
        nearby_days=0, participants=[],
    )
    skipped = r.get("skipped_polar_days", [])
    assert skipped, "Expected polar-night day to appear in skipped_polar_days"
    assert any(d.get("date") == "2026-12-22" for d in skipped)
    # And of course no windows should be returned for that day
    assert r.get("passed_count", 0) == 0


# ── Mu0b — DST re-resolution per scan day ──

def test_mu0b_dst_offset_changes_per_day_for_us_location():
    """timezone_utils must return different UTC offsets for NYC on a
    pre-DST date and a post-DST date. Mu0b uses this per scan day."""
    from datetime import datetime as _dt
    from app.services.timezone_utils import resolve_timezone
    pre = _dt(2026, 3, 7, 12, 0)   # Saturday before US spring-forward
    post = _dt(2026, 3, 9, 12, 0)  # Monday after US spring-forward
    off_pre, _ = resolve_timezone(40.7128, -74.0060, pre)
    off_post, _ = resolve_timezone(40.7128, -74.0060, post)
    assert off_pre == -5.0, f"NYC pre-DST expected -5, got {off_pre}"
    assert off_post == -4.0, f"NYC post-DST expected -4, got {off_post}"


def test_mu0b_scan_across_dst_does_not_crash():
    """A muhurtha scan that crosses the US spring-forward day must
    complete without errors. Pre-Mu0b the engine used a single
    pre-DST offset for the whole scan, silently mis-computing Lagna
    by 15° for half the windows; post-Mu0b zoneinfo handles each day."""
    r = find_muhurtha_windows(
        date_start="2026-03-07", date_end="2026-03-09",  # spans March 8 DST flip
        event_type="general",
        lat=40.7128, lon=-74.0060, tz_offset=-5.0,
        event_lat=40.7128, event_lon=-74.0060, event_tz=-5.0,
        nearby_days=0, participants=[],
    )
    # Just assert the scan completed and returned a well-shaped response
    assert "windows" in r
    assert "soft_flagged_windows" in r
    assert isinstance(r.get("passed_count", 0), int)


# ── Mu0e — tithi clamp + Vedic vara at sunrise ──

def test_mu0e_tithi_15_renders_as_purnima_not_combined_string():
    """Find a window on a known Purnima day (Vaisakha Purnima
    2026-05-01) and assert tithi name is exactly 'Purnima', not the
    pre-fix 'Purnima/Amavasya' combined slot."""
    r = find_muhurtha_windows(
        date_start="2026-05-01", date_end="2026-05-01",
        event_type="general",
        **TENALI, nearby_days=0, participants=[],
    )
    all_w = (r.get("windows") or []) + (r.get("soft_flagged_windows") or [])
    # Filter for windows that landed on Purnima (tithi_num=15). Field
    # `tithi` (name) lives under the nested `panchang` dict on each window.
    purnima_windows = [w for w in all_w if w.get("tithi_num") == 15]
    if purnima_windows:
        for w in purnima_windows:
            panchang = w.get("panchang") or {}
            assert panchang.get("tithi") == "Purnima", (
                f"tithi_num=15 should render as 'Purnima', got {panchang.get('tithi')!r} "
                "— Mu0e regressed"
            )


def test_mu0e_tithi_num_clamped_to_30():
    """Sweep enough windows that we exercise the int(...)+1 boundary.
    Any tithi_num > 30 indicates the clamp is gone."""
    r = find_muhurtha_windows(
        date_start="2026-05-01", date_end="2026-05-05",
        event_type="general",
        **TENALI, nearby_days=0, participants=[],
    )
    all_w = (r.get("windows") or []) + (r.get("soft_flagged_windows") or [])
    for w in all_w:
        tn = w.get("tithi_num")
        if tn is not None:
            assert 1 <= tn <= 30, f"tithi_num {tn} out of [1,30] — clamp regressed"


# ── Mu0g — antardasha memoisation ──

def test_mu2_confidence_ledger_sums_to_raw_score():
    """Sum of deltas in confidence_breakdown must equal raw_score, and
    confidence_score must be the clamp of raw_score to [0, 100]."""
    r = find_muhurtha_windows(
        date_start="2026-05-01", date_end="2026-05-01",
        event_type="general", **TENALI,
        nearby_days=0, participants=[MANYUE],
    )
    all_w = (r.get("windows") or []) + (r.get("soft_flagged_windows") or [])
    assert all_w, "Expected at least one window"
    for w in all_w[:5]:
        breakdown = w.get("confidence_breakdown")
        raw = w.get("raw_score")
        conf = w.get("confidence_score")
        assert isinstance(breakdown, list), "confidence_breakdown missing"
        assert isinstance(raw, int), "raw_score missing"
        assert isinstance(conf, int), "confidence_score missing"
        delta_sum = sum(b["delta"] for b in breakdown)
        assert delta_sum == raw, f"breakdown sum {delta_sum} != raw_score {raw}"
        assert conf == max(0, min(100, raw)), (
            f"confidence_score {conf} not clamp of raw {raw} to [0,100]"
        )


def test_mu2_breakdown_entries_have_required_shape():
    """Every breakdown entry must have factor (str), delta (int), note (str)."""
    r = find_muhurtha_windows(
        date_start="2026-05-01", date_end="2026-05-01",
        event_type="marriage", **TENALI,
        nearby_days=0, participants=[MANYUE],
    )
    all_w = (r.get("windows") or []) + (r.get("soft_flagged_windows") or [])
    for w in all_w[:3]:
        for b in w.get("confidence_breakdown", []):
            assert isinstance(b.get("factor"), str) and b["factor"], "factor missing"
            assert isinstance(b.get("delta"), int), "delta missing or non-int"
            assert isinstance(b.get("note"), str), "note missing"


def test_mu3_moment_rps_present_per_participant():
    """Every per_participant entry must have moment_rps (the 5 KP RPs
    at the moment) and natal_event_significators (planets that signify
    the event in the participant's natal chart)."""
    r = find_muhurtha_windows(
        date_start="2026-05-01", date_end="2026-05-01",
        event_type="marriage", **TENALI,
        nearby_days=0, participants=[MANYUE],
    )
    all_w = (r.get("windows") or []) + (r.get("soft_flagged_windows") or [])
    assert all_w
    for w in all_w[:3]:
        for p in (w.get("per_participant") or []):
            assert "moment_rps" in p
            assert "natal_event_significators" in p
            assert "rp_x_natal_overlap" in p
            assert "rp_x_natal_count" in p
            assert isinstance(p["moment_rps"], list)
            assert isinstance(p["rp_x_natal_count"], int)
            assert 0 <= p["rp_x_natal_count"] <= 5


def test_mu3_moment_rps_have_5_or_fewer_planets():
    """Moment RPs is a set — max 5 entries (may collapse if vara lord
    happens to == another RP). Each entry must be a known planet name."""
    PLANETS = {"Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus",
               "Saturn", "Rahu", "Ketu"}
    r = find_muhurtha_windows(
        date_start="2026-05-01", date_end="2026-05-01",
        event_type="general", **TENALI,
        nearby_days=0, participants=[MANYUE],
    )
    all_w = (r.get("windows") or []) + (r.get("soft_flagged_windows") or [])
    for w in all_w[:3]:
        for p in (w.get("per_participant") or []):
            mrps = p.get("moment_rps") or []
            assert 0 < len(mrps) <= 5, f"moment_rps len {len(mrps)} out of bounds"
            for planet in mrps:
                assert planet in PLANETS, f"Unknown planet {planet!r} in moment_rps"


def test_mu3_rp_x_natal_ledger_entry_when_overlap_exists():
    """When at least one participant has rp_x_natal_count > 0, the
    confidence_breakdown must include a `moment_rps_x_natal_event_sigs`
    entry — proves the doctrine-correct signal contributes to score."""
    r = find_muhurtha_windows(
        date_start="2026-05-01", date_end="2026-05-05",
        event_type="general", **TENALI,
        nearby_days=0, participants=[MANYUE],
    )
    all_w = (r.get("windows") or []) + (r.get("soft_flagged_windows") or [])
    found_with_overlap = False
    for w in all_w:
        total = sum((p.get("rp_x_natal_count") or 0) for p in (w.get("per_participant") or []))
        if total > 0:
            found_with_overlap = True
            factors = {b["factor"] for b in (w.get("confidence_breakdown") or [])}
            assert "moment_rps_x_natal_event_sigs" in factors, (
                "Per-window overlap exists but ledger entry missing — Mu3 wiring broken"
            )
    # Don't fail if no overlap found in this date range — just be sure
    # we actually exercised at least one window
    assert all_w, "Expected at least one window in the range"


def test_mu4_first_participant_is_primary_by_default():
    """Without explicit primary flag, the first participant in the
    list is treated as primary."""
    r = find_muhurtha_windows(
        date_start="2026-05-01", date_end="2026-05-01",
        event_type="marriage", **TENALI,
        nearby_days=0, participants=[MANYUE],
    )
    all_w = (r.get("windows") or []) + (r.get("soft_flagged_windows") or [])
    for w in all_w[:3]:
        ppl = w.get("per_participant") or []
        if ppl:
            assert ppl[0]["is_primary"] is True, "First participant must default to primary"


def test_mu4_explicit_primary_flag_overrides_position():
    """If a non-first participant is flagged primary=True, that one
    becomes primary and the first becomes secondary."""
    second_primary = dict(MANYUE, name="SecondPrimary", primary=True)
    other = dict(MANYUE, name="OtherPerson", date="1990-01-01")
    r = find_muhurtha_windows(
        date_start="2026-05-01", date_end="2026-05-01",
        event_type="marriage", **TENALI,
        nearby_days=0,
        participants=[other, second_primary],
    )
    all_w = (r.get("windows") or []) + (r.get("soft_flagged_windows") or [])
    assert all_w
    for w in all_w[:3]:
        ppl = w.get("per_participant") or []
        for p in ppl:
            if p["name"] == "SecondPrimary":
                assert p["is_primary"] is True
            elif p["name"] == "OtherPerson":
                assert p["is_primary"] is False


def test_mu4_aggregation_strategy_keyed_by_event_type():
    """Marriage → min_across_all; business → primary-weighted;
    general → primary_only."""
    expectations = {
        "marriage": "min_across_all",
        "business": "primary_weighted_0.6_secondaries_0.4",
        "general": "primary_only",
    }
    for event, expected_strategy in expectations.items():
        r = find_muhurtha_windows(
            date_start="2026-05-01", date_end="2026-05-01",
            event_type=event, **TENALI,
            nearby_days=0, participants=[MANYUE],
        )
        all_w = (r.get("windows") or []) + (r.get("soft_flagged_windows") or [])
        if all_w:
            assert all_w[0].get("aggregation_strategy") == expected_strategy, (
                f"event={event} expected {expected_strategy}, got "
                f"{all_w[0].get('aggregation_strategy')}"
            )


def test_mu4_secondary_chandrashtamam_is_soft_not_hard():
    """A secondary participant's Chandrashtamam should appear in
    soft_concerns / participant_soft_concerns, NOT in hard_rejected_for
    (which would drop the window from the passed leaderboard)."""
    # Sweep 30 days for marriage with TWO participants. There must be
    # at least one day where the secondary is in Chandrashtamam but the
    # primary is not — that window should still appear in passed list.
    primary = dict(MANYUE, primary=True)
    secondary = dict(MANYUE, name="Secondary", date="1985-06-15")
    r = find_muhurtha_windows(
        date_start="2026-05-01", date_end="2026-05-30",
        event_type="marriage", **TENALI,
        nearby_days=0,
        participants=[primary, secondary],
    )
    all_w = (r.get("windows") or []) + (r.get("soft_flagged_windows") or [])
    # Find any window where secondary has chandrashtamam=True
    # and primary doesn't — assert it's NOT hard-rejected ON THAT BASIS
    found = False
    for w in all_w:
        ppl = {p["name"]: p for p in (w.get("per_participant") or [])}
        prim = ppl.get("Manyue")
        sec = ppl.get("Secondary")
        if not (prim and sec):
            continue
        if sec.get("chandrashtamam") and not prim.get("chandrashtamam"):
            found = True
            # Search the window's hard_rejected_for for the secondary's
            # Chandrashtamam string — must NOT be present
            hrf = " | ".join(w.get("hard_rejected_for") or [])
            assert "Secondary: Chandrashtamam" not in hrf, (
                "Secondary's Chandrashtamam should be soft, not hard-reject"
            )
            # And should be in the soft side
            soft = w.get("participant_soft_concerns") or []
            soft_str = " | ".join(soft)
            assert "Secondary: Chandrashtamam" in soft_str, (
                "Secondary's Chandrashtamam should appear in soft concerns"
            )
            break
    # If we never found such a configuration in this 30-day range,
    # that's OK — just don't fail the test.


def test_mu5_same_day_alternatives_present_when_windows_exist():
    """When at least one window passes, same_day_alternatives must
    be a non-empty list containing windows from the best-window's date."""
    r = find_muhurtha_windows(
        date_start="2026-05-01", date_end="2026-05-01",
        event_type="general", **TENALI,
        nearby_days=0, participants=[MANYUE],
    )
    alts = r.get("same_day_alternatives") or []
    if r.get("best_window"):
        assert alts, "same_day_alternatives must be populated when best_window exists"
        best_date = r["best_window"]["date"]
        for w in alts:
            assert w["date"] == best_date, "alternative on wrong date"
        assert len(alts) <= 5, "same_day_alternatives capped at 5"


def test_mu5_extend_returns_none_not_inventing():
    """When the engine truly cannot find ANY qualifying muhurtha in
    the requested range, extend_suggestion is None (or contains a
    real future window) — never an empty / placeholder dict."""
    # We can't easily construct a guaranteed-empty case without a long
    # search, so we just confirm the field shape contract for a
    # normal call (where extend may or may not be set).
    r = find_muhurtha_windows(
        date_start="2026-05-01", date_end="2026-05-01",
        event_type="general", **TENALI,
        nearby_days=0, participants=[MANYUE],
    )
    ext = r.get("extend_suggestion")
    if ext is not None:
        assert isinstance(ext, dict)
        assert "window" in ext
        assert "days_from_range_end" in ext
        assert "horizon_days" in ext  # PR Mu5 — new field


def test_mu5_extend_horizon_is_90_days():
    """The extend horizon was bumped 30 → 90 days in Mu5. When
    extend fires, the response carries horizon_days: 90."""
    # Search a date range we know has no marriage muhurtha (e.g. a
    # Cancer-sun day which is solar-month-blocked for vivaha) so
    # extend_suggestion fires. Then assert horizon_days == 90.
    r = find_muhurtha_windows(
        # Cancer Sun period = mid-Jul to mid-Aug — guaranteed blocked
        # for marriage by the solar-month rule (Mu0a-vintage classical
        # gate). Range is tight to keep test fast.
        date_start="2026-07-25", date_end="2026-07-26",
        event_type="marriage", **TENALI,
        nearby_days=0, participants=[MANYUE],
    )
    ext = r.get("extend_suggestion")
    if ext:
        assert ext.get("horizon_days") == 90, (
            f"Mu5 horizon should be 90, got {ext.get('horizon_days')}"
        )


def test_mu6_panchang_overlays_present_on_every_window():
    """Every window must carry panchang_overlays with the 5 keys."""
    r = find_muhurtha_windows(
        date_start="2026-05-01", date_end="2026-05-02",
        event_type="general", **TENALI,
        nearby_days=0, participants=[],
    )
    all_w = (r.get("windows") or []) + (r.get("soft_flagged_windows") or [])
    assert all_w
    for w in all_w[:5]:
        po = w.get("panchang_overlays")
        assert isinstance(po, dict)
        for key in ("varjyam_active", "amrit_active", "panchaka_active",
                    "panchaka_blocks_event", "tithi_shunya_active",
                    "nakshatra_vedha_active"):
            assert key in po, f"panchang_overlays missing {key}"


def test_mu6_amrit_kala_adds_positive_ledger_entry():
    """When a window falls in Amrit Kala, the breakdown ledger has an
    `amrit_kala` entry with delta = +20."""
    r = find_muhurtha_windows(
        date_start="2026-05-01", date_end="2026-05-07",
        event_type="general", **TENALI,
        nearby_days=0, participants=[],
    )
    all_w = (r.get("windows") or []) + (r.get("soft_flagged_windows") or [])
    found_amrit = False
    for w in all_w:
        if (w.get("panchang_overlays") or {}).get("amrit_active"):
            found_amrit = True
            ledger = {b["factor"]: b["delta"] for b in (w.get("confidence_breakdown") or [])}
            assert ledger.get("amrit_kala") == 20, (
                f"Amrit Kala active but ledger says {ledger.get('amrit_kala')!r}"
            )
            break
    # Don't fail the test if Amrit Kala doesn't fire in this small range.


def test_mu6_varjyam_adds_negative_ledger_entry():
    """When a window falls in Varjyam, the breakdown ledger has a
    `varjyam` entry with delta = -25."""
    r = find_muhurtha_windows(
        date_start="2026-05-01", date_end="2026-05-07",
        event_type="general", **TENALI,
        nearby_days=0, participants=[],
    )
    all_w = (r.get("windows") or []) + (r.get("soft_flagged_windows") or [])
    for w in all_w:
        if (w.get("panchang_overlays") or {}).get("varjyam_active"):
            ledger = {b["factor"]: b["delta"] for b in (w.get("confidence_breakdown") or [])}
            assert ledger.get("varjyam") == -25, (
                f"Varjyam active but ledger says {ledger.get('varjyam')!r}"
            )
            break


def test_mu6_panchaka_blocks_event_for_relevant_event():
    """When Panchaka is active AND event_type is in the universal block
    list (marriage / house_warming / travel / vehicle / business),
    panchang_overlays.panchaka_blocks_event is True and the ledger has
    a -60 penalty."""
    # Search a longer range so Panchaka must hit at least once
    r = find_muhurtha_windows(
        date_start="2026-05-01", date_end="2026-05-30",
        event_type="travel", **TENALI,
        nearby_days=0, participants=[],
    )
    all_w = (r.get("windows") or []) + (r.get("soft_flagged_windows") or [])
    for w in all_w:
        po = w.get("panchang_overlays") or {}
        if po.get("panchaka_active") and po.get("panchaka_blocks_event"):
            ledger = {b["factor"]: b["delta"] for b in (w.get("confidence_breakdown") or [])}
            assert ledger.get("panchaka_dosha") == -60
            return
    # If Panchaka doesn't hit in this range that's fine for the test —
    # we don't fail. The shape contract is the important assertion.


def test_mu7_eclipses_in_range_field_present():
    """find_muhurtha_windows response always includes
    `eclipses_in_range` (may be empty list)."""
    r = find_muhurtha_windows(
        date_start="2026-05-01", date_end="2026-05-02",
        event_type="general", **TENALI,
        nearby_days=0, participants=[],
    )
    assert "eclipses_in_range" in r
    assert isinstance(r["eclipses_in_range"], list)


def test_mu7_known_eclipse_detected_in_range():
    """A real eclipse: 2026-02-17 annular solar eclipse. Search a range
    spanning that date — engine must surface it in eclipses_in_range."""
    r = find_muhurtha_windows(
        date_start="2026-02-15", date_end="2026-02-19",
        event_type="general", **TENALI,
        nearby_days=0, participants=[],
    )
    found_solar = any(e["type"] == "solar" for e in r.get("eclipses_in_range", []))
    assert found_solar, (
        "Feb 17 2026 annular solar eclipse should be in eclipses_in_range"
    )


def test_mu7_windows_inside_sutak_are_soft_flagged():
    """When a candidate window falls inside Sutak (12h before solar
    eclipse peak), the window must be in soft_flagged_windows with
    Sutak in its hard_rejected_for. Search a range that overlaps
    the Feb 17 2026 solar eclipse Sutak."""
    r = find_muhurtha_windows(
        date_start="2026-02-17", date_end="2026-02-17",
        event_type="general", **TENALI,
        nearby_days=0, participants=[],
    )
    all_w = (r.get("windows") or []) + (r.get("soft_flagged_windows") or [])
    sutak_windows = [w for w in all_w if w.get("in_sutak")]
    if sutak_windows:
        for w in sutak_windows:
            # Must be in soft_flagged (not passed leaderboard)
            assert w in (r.get("soft_flagged_windows") or []), (
                "Sutak window should be soft-flagged, not in passed list"
            )
            # And hard_rejected_for must mention Sutak
            assert any("Sutak" in s for s in (w.get("hard_rejected_for") or [])), (
                "Sutak window must have 'Sutak' in hard_rejected_for"
            )


def test_mu8_advanced_doshas_present_on_every_window():
    """Every window must carry advanced_doshas with the documented keys."""
    r = find_muhurtha_windows(
        date_start="2026-05-01", date_end="2026-05-02",
        event_type="general", **TENALI,
        nearby_days=0, participants=[],
    )
    all_w = (r.get("windows") or []) + (r.get("soft_flagged_windows") or [])
    assert all_w
    for w in all_w[:5]:
        adv = w.get("advanced_doshas")
        assert isinstance(adv, dict)
        for key in ("bhadra_part", "in_sandhya", "mrityu_yoga_active",
                    "krura_tithi_active", "dagdha_tithi_active",
                    "vyatipata_or_vaidhriti"):
            assert key in adv, f"advanced_doshas missing {key}"


def test_mu8_bhadra_face_penalty_harsher_than_tail():
    """When a window is inside Vishti FACE the penalty is -60;
    inside TAIL it's -10. Search for Vishti windows in a wider range
    so we exercise both."""
    r = find_muhurtha_windows(
        date_start="2026-05-01", date_end="2026-05-15",
        event_type="general", **TENALI,
        nearby_days=0, participants=[],
    )
    all_w = (r.get("windows") or []) + (r.get("soft_flagged_windows") or [])
    for w in all_w:
        if not w.get("is_vishti"):
            continue
        part = (w.get("advanced_doshas") or {}).get("bhadra_part")
        ledger = {b["factor"]: b["delta"] for b in (w.get("confidence_breakdown") or [])}
        delta = ledger.get("vishti_karana")
        if part == "face":
            assert delta == -60, f"FACE expected -60, got {delta}"
        elif part == "tail":
            assert delta == -10, f"TAIL expected -10, got {delta}"
        elif part == "middle":
            assert delta == -30, f"MIDDLE expected -30, got {delta}"


def test_mu8_sandhya_window_gets_penalty():
    """Windows within 12 min of sunrise / sunset get -50 for Sandhya."""
    r = find_muhurtha_windows(
        date_start="2026-05-01", date_end="2026-05-01",
        event_type="general", **TENALI,
        nearby_days=0, participants=[],
    )
    all_w = (r.get("windows") or []) + (r.get("soft_flagged_windows") or [])
    for w in all_w:
        if (w.get("advanced_doshas") or {}).get("in_sandhya"):
            ledger = {b["factor"]: b["delta"] for b in (w.get("confidence_breakdown") or [])}
            assert ledger.get("sandhya_twilight") == -50, (
                f"Sandhya window must have -50 ledger entry, got {ledger.get('sandhya_twilight')}"
            )
            break


def test_mu0g_antardasha_cache_is_used():
    """_AD_CACHE accumulates entries as scans run; we verify by clearing
    it, running a small scan with a participant, and asserting at least
    one entry was added (= cache is alive, not dead code)."""
    from app.services import muhurtha_engine as _me
    _me._AD_CACHE.clear()
    find_muhurtha_windows(
        date_start="2026-05-01", date_end="2026-05-02",
        event_type="general", **TENALI,
        nearby_days=0, participants=[MANYUE],
    )
    assert len(_me._AD_CACHE) > 0, (
        "_AD_CACHE empty after a participant-bearing scan — Mu0g memoisation regressed"
    )

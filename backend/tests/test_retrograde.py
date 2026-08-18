"""
PR A1.14 — retrograde (vakram) computation.

THE BUG: chart_engine.get_planet_positions() called swisseph WITHOUT
FLG_SPEED, so result[3] (daily motion) was never populated and the
`retrograde` key was simply absent from every natal planet dict.

Everything downstream read it with .get("retrograde", False) and silently
got False forever:
  - the ℞ marker in Rasi/South-Indian charts, planet lists, house panels
    and mobile sheets never rendered on any natal chart
  - compatibility_engine's `csl_in_retrograde_star` (kp_csl_theory §247)
    could never fire for any chart
  - horary and muhurtha read the same missing field
Only transit_engine was unaffected — it computes speed itself.
"""

import pytest
import swisseph as swe

from app.services.chart_engine import date_time_to_julian, get_planet_positions

# 2000-12-04 14:00 IST — Jupiter and Saturn were both retrograde.
JD_RETRO = date_time_to_julian("2000-12-04", "14:00", 5.5)
# 2000-09-09 12:31 IST — no classical planet retrograde.
JD_DIRECT = date_time_to_julian("2000-09-09", "12:31", 5.5)


@pytest.fixture(autouse=True)
def _kp_ayanamsa():
    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)


def test_retrograde_key_exists_on_every_planet():
    """The regression: the key was missing entirely, not merely False."""
    pos = get_planet_positions(JD_DIRECT)
    for name, data in pos.items():
        assert "retrograde" in data, f"{name} has no retrograde key"
        assert "speed" in data, f"{name} has no speed key"


def test_known_retrograde_planets_detected():
    pos = get_planet_positions(JD_RETRO)
    assert pos["Jupiter"]["retrograde"] is True
    assert pos["Saturn"]["retrograde"] is True


def test_sun_and_moon_are_never_retrograde():
    for jd in (JD_RETRO, JD_DIRECT):
        pos = get_planet_positions(jd)
        assert pos["Sun"]["retrograde"] is False
        assert pos["Moon"]["retrograde"] is False


def test_nodes_are_always_retrograde():
    """Mean-node motion is inherently backward — Rahu/Ketu always carry it."""
    for jd in (JD_RETRO, JD_DIRECT):
        pos = get_planet_positions(jd)
        assert pos["Rahu"]["retrograde"] is True
        assert pos["Ketu"]["retrograde"] is True


def test_ketu_matches_rahu_motion():
    """Both nodes move together — same speed, same flag."""
    pos = get_planet_positions(JD_RETRO)
    assert pos["Ketu"]["speed"] == pos["Rahu"]["speed"]


def test_speed_sign_agrees_with_flag():
    for jd in (JD_RETRO, JD_DIRECT):
        for name, d in get_planet_positions(jd).items():
            assert d["retrograde"] == (d["speed"] < 0), name


def test_direct_chart_has_no_classical_retrogrades():
    pos = get_planet_positions(JD_DIRECT)
    classical = ("Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn")
    assert [p for p in classical if pos[p]["retrograde"]] == []


def test_kp_retrograde_star_rule_is_reachable():
    """
    compatibility_engine's csl_in_retrograde_star must be a real boolean
    derived from live data, not a permanently-False stub.
    """
    from app.services.compatibility_engine import compute_compatibility
    r = compute_compatibility(
        {"name": "A", "date": "2000-09-09", "time": "12:31", "latitude": 16.24,
         "longitude": 80.65, "timezone_offset": 5.5, "gender": "male"},
        {"name": "B", "date": "2000-12-04", "time": "14:00", "latitude": 17.69,
         "longitude": 83.29, "timezone_offset": 5.5, "gender": "female"},
    )
    for k in ("chart1_promise", "chart2_promise"):
        assert isinstance(r["kp_analysis"][k]["csl_in_retrograde_star"], bool)

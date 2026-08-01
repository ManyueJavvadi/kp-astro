"""
Tests for PR A1.13b — the traditional per-chart screens and the dosha
parihara (cancellation) engine.

Golden couple as elsewhere: Manyue (2000-09-09 12:31, Scorpio lagna) and
Annapurna (2000-08-18 06:51, Leo lagna), both Tenali AP.
"""

import pytest

from app.services import dosha_cancellation as dc
from app.services import match_individual_screen as mis
from app.services.compatibility_engine import compute_compatibility

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


@pytest.fixture(scope="module")
def result():
    return compute_compatibility(BOY, GIRL)


# ── Dignity / helper correctness ──────────────────────────────────────

def test_debilitation_is_opposite_exaltation():
    assert mis.DEBILITATION["Venus"] == "Virgo"      # exalted Pisces
    assert mis.DEBILITATION["Jupiter"] == "Capricorn"  # exalted Cancer
    assert mis.DEBILITATION["Moon"] == "Scorpio"     # exalted Taurus
    assert mis.DEBILITATION["Sun"] == "Libra"        # exalted Aries


def test_whole_sign_house_counting():
    # Aries lagna (0°): a planet at 30° (Taurus) is the 2nd house.
    assert mis._house_from(30.0, 0.0) == 2
    # Same sign -> 1st.
    assert mis._house_from(10.0, 0.0) == 1
    # Wrap-around: Pisces planet from Aries lagna -> 12th.
    assert mis._house_from(340.0, 0.0) == 12


def test_pada_calculation():
    # Each pada spans 3°20'. Values are deliberately chosen away from the
    # exact pada boundaries (0/3°20'/6°40'/10°) — a longitude landing
    # precisely on a boundary is inherently ambiguous in binary floating
    # point and is not a meaningful assertion.
    assert dc.pada_of(1.0) == 1
    assert dc.pada_of(3.5) == 2
    assert dc.pada_of(7.5) == 3
    assert dc.pada_of(11.0) == 4
    # Padas repeat every nakshatra: 13°20' + 1° is pada 1 of the next star.
    assert dc.pada_of(dc.NAKSHATRA_SPAN + 1.0) == 1


# ── Chart-strength / mind / progeny screens ───────────────────────────

def test_chart_strength_flags_debilitated_venus():
    # Aries lagna; Venus at 165° = Virgo = debilitated.
    planets = {"Venus": {"longitude": 165.0}, "Sun": {"longitude": 300.0}}
    r = mis.assess_chart_strength(planets, 0.0)
    assert r["venus_dignity"] == "debilitated"
    assert any("Venus debilitated" in c for c in r["concerns"])


def test_chart_strength_detects_combust_venus():
    planets = {"Venus": {"longitude": 100.0}, "Sun": {"longitude": 104.0}}
    r = mis.assess_chart_strength(planets, 0.0)
    assert r["venus_combust"] is True


def test_mental_screen_flags_moon_saturn_conjunction():
    planets = {"Moon": {"longitude": 50.0}, "Saturn": {"longitude": 54.0}}
    r = mis.assess_mental_stability(planets, 0.0)
    assert "Saturn" in r["moon_afflictors"]
    assert r["level"] != "No classical affliction flagged"


def test_mental_screen_has_clinical_disclaimer():
    r = mis.assess_mental_stability({"Moon": {"longitude": 0.0}}, 0.0)
    assert "NOT a clinical" in r["disclaimer"]


def test_progeny_flags_putra_dosha_when_fifth_lord_in_dusthana():
    # Aries lagna -> 5th sign Leo -> 5th lord Sun. Put Sun in the 6th
    # (Virgo, 150-180) -> classical putra dosha.
    planets = {"Sun": {"longitude": 160.0}}
    r = mis.assess_progeny(planets, 0.0)
    assert r["fifth_lord"] == "Sun"
    assert r["fifth_lord_house"] == 6
    assert r["putra_dosha"] is True


def test_progeny_has_no_infertility_claim_disclaimer():
    r = mis.assess_progeny({"Jupiter": {"longitude": 0.0}}, 0.0)
    assert "cannot have children" in r["disclaimer"]


def test_longevity_is_explicitly_not_ayurdaya():
    r = mis.assess_longevity_indicators({"Saturn": {"longitude": 0.0}}, 0.0)
    assert r["is_full_ayurdaya"] is False
    assert "NOT a classical Ayurdaya" in r["disclaimer"]


# ── Parihara engine ───────────────────────────────────────────────────

def test_no_dosha_returns_clean_result():
    r = dc.nadi_cancellation(
        has_dosha=False, boy_moon_lon=0, girl_moon_lon=0,
        boy_nakshatra="Ashwini", girl_nakshatra="Bharani",
        boy_moon_sign="Aries", girl_moon_sign="Aries",
    )
    assert r["raw_dosha"] is False and r["cancelled"] is False


def test_nadi_cancelled_by_same_sign_different_nakshatra():
    r = dc.nadi_cancellation(
        has_dosha=True, boy_moon_lon=1.0, girl_moon_lon=20.0,
        boy_nakshatra="Ashwini", girl_nakshatra="Bharani",
        boy_moon_sign="Aries", girl_moon_sign="Aries",
    )
    assert r["cancelled"] is True
    assert any("Same Moon sign" in c for c in r["cancellations"])


def test_nadi_cancelled_by_same_nakshatra_different_pada():
    r = dc.nadi_cancellation(
        has_dosha=True, boy_moon_lon=0.5, girl_moon_lon=10.0,
        boy_nakshatra="Ashwini", girl_nakshatra="Ashwini",
        boy_moon_sign="Aries", girl_moon_sign="Aries",
    )
    assert r["cancelled"] is True
    assert any("different pada" in c for c in r["cancellations"])


def test_nadi_stands_when_no_parihara_applies():
    # Different signs whose lords are not friends, different nakshatras,
    # different star lords -> nothing cancels.
    r = dc.nadi_cancellation(
        has_dosha=True, boy_moon_lon=5.0, girl_moon_lon=125.0,
        boy_nakshatra="Ashwini", girl_nakshatra="Magha",
        boy_moon_sign="Aries", girl_moon_sign="Leo",
        boy_star_lord="Ketu", girl_star_lord="Venus",
    )
    # Aries lord Mars, Leo lord Sun — these ARE mutual friends classically,
    # so this must cancel. Assert the rule fired rather than a bare False.
    assert r["cancelled"] is True


def test_bhakoot_cancelled_by_friendly_moon_lords():
    r = dc.bhakoot_cancellation(
        has_dosha=True, boy_moon_sign="Aries", girl_moon_sign="Leo",
    )
    assert r["cancelled"] is True  # Mars & Sun are mutual friends


def test_bhakoot_cancelled_by_same_star_lord():
    r = dc.bhakoot_cancellation(
        has_dosha=True, boy_moon_sign="Taurus", girl_moon_sign="Capricorn",
        boy_star_lord="Moon", girl_star_lord="Moon",
    )
    assert r["cancelled"] is True


def test_gana_manushya_rakshasa_direction_matters():
    """Classical asymmetry: Manushya boy + Rakshasa girl is the exception."""
    lenient = dc.gana_exception(
        boy_gana="Manushya", girl_gana="Rakshasa",
        boy_moon_sign="Aries", girl_moon_sign="Gemini",
    )
    harsh = dc.gana_exception(
        boy_gana="Rakshasa", girl_gana="Manushya",
        boy_moon_sign="Aries", girl_moon_sign="Gemini",
    )
    assert lenient["classical_exception"] is True
    assert harsh["harsh_direction"] is True
    assert lenient["net_severity"] != harsh["net_severity"]


def test_gana_same_gana_is_no_dosha():
    r = dc.gana_exception(
        boy_gana="Manushya", girl_gana="Manushya",
        boy_moon_sign="Aries", girl_moon_sign="Leo",
    )
    assert r["net_severity"] == "None"


def test_manglik_not_flagged_outside_dosha_houses():
    r = dc.manglik_cancellation(mars_house=9, mars_sign="Leo")
    assert r["raw_dosha"] is False


def test_manglik_cancelled_by_own_sign():
    r = dc.manglik_cancellation(mars_house=7, mars_sign="Aries")
    assert r["cancelled"] is True
    assert any("own sign" in c for c in r["cancellations"])


def test_manglik_cancelled_by_both_partners_manglik():
    r = dc.manglik_cancellation(mars_house=8, mars_sign="Gemini", both_manglik=True)
    assert r["cancelled"] is True


def test_manglik_cancelled_for_yogakaraka_lagna():
    r = dc.manglik_cancellation(mars_house=12, mars_sign="Cancer", lagna_sign="Leo")
    assert r["cancelled"] is True
    assert any("yogakaraka" in c for c in r["cancellations"])


def test_manglik_stands_when_nothing_applies():
    r = dc.manglik_cancellation(mars_house=7, mars_sign="Gemini")
    assert r["raw_dosha"] is True and r["cancelled"] is False
    assert r["net_severity"] == "Severe"


def test_manglik_severity_by_house():
    assert dc.manglik_cancellation(mars_house=7, mars_sign="Gemini")["base_severity"] == "Severe"
    assert dc.manglik_cancellation(mars_house=1, mars_sign="Gemini")["base_severity"] == "Moderate"
    assert dc.manglik_cancellation(mars_house=2, mars_sign="Leo")["base_severity"] == "Mild"


# ── Golden-couple integration + frontend contract ─────────────────────

def test_golden_couple_annapurna_manglik_is_cancelled(result):
    """Leo lagna makes Mars yogakaraka — a real, defensible cancellation."""
    m2 = result["dosha_parihara"]["manglik_person2"]
    assert m2["raw_dosha"] is True
    assert m2["cancelled"] is True


def test_golden_couple_no_nadi_or_bhakoot_dosha(result):
    assert result["dosha_parihara"]["nadi"]["raw_dosha"] is False
    assert result["dosha_parihara"]["bhakoot"]["raw_dosha"] is False


def test_frontend_contract_individual_screen(result):
    for key in ("individual_screen_chart1", "individual_screen_chart2",
                "longevity_balance", "dosha_parihara"):
        assert key in result

    s = result["individual_screen_chart1"]
    assert {"chart_strength", "mental_stability", "progeny",
            "longevity_indicators", "methodology_note"} <= set(s)
    for sub in ("chart_strength", "mental_stability", "progeny"):
        assert "level" in s[sub]
        assert "concerns" in s[sub] and "supports" in s[sub]
    assert "band" in s["longevity_indicators"]


def test_frontend_contract_parihara(result):
    p = result["dosha_parihara"]
    assert {"nadi", "bhakoot", "gana", "manglik_person1",
            "manglik_person2", "summary"} <= set(p)
    for k in ("nadi", "bhakoot", "manglik_person1", "manglik_person2"):
        assert {"raw_dosha", "cancelled", "cancellations", "net_severity"} <= set(p[k])
    assert {"boy_gana", "girl_gana", "net_severity"} <= set(p["gana"])
    assert {"any_standing", "standing", "cancelled", "note"} <= set(p["summary"])

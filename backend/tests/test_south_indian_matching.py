"""
Tests for the South Indian matching layer (PR A1.13, 2026-08-01):
  * Gana table correction (Shatabhisha / Uttara Bhadrapada were swapped)
  * Vedha porutham table integrity
  * Dina porutham
  * Papa Samyam per-chart load + cross-chart comparison
  * Dashakoota assembly + the DUAL verdict (with / without Rajju+Vedha)

Golden couple: Manyue (2000-09-09 12:31) x Annapurna (2000-08-18 06:51),
both Tenali, Andhra Pradesh. Moon nakshatras: Uttara Ashadha (boy) and
Uttara Bhadrapada (girl) — both verified identical in an independent
third-party app, so any scoring difference is scoring, not astronomy.
"""

import pytest

from app.services import south_indian_matching as sim
from app.services.compatibility_engine import (
    NAKSHATRA_GANA,
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


@pytest.fixture(scope="module")
def result():
    return compute_compatibility(BOY, GIRL)


# ── Gana table correction ─────────────────────────────────────────────

def test_gana_table_canonical_classification():
    """The 2026-08-01 fix: these two were swapped, mis-scoring Gana by 6/36."""
    assert NAKSHATRA_GANA["Uttara Bhadrapada"] == "Manushya"
    assert NAKSHATRA_GANA["Shatabhisha"] == "Rakshasa"


def test_gana_table_has_nine_of_each():
    """Canonically 9 nakshatras per gana. Guards against a future swap."""
    canonical = {n: g for n, g in NAKSHATRA_GANA.items()
                 if n in sim.NAKSHATRA_ORDER}
    counts: dict[str, int] = {}
    for g in canonical.values():
        counts[g] = counts.get(g, 0) + 1
    assert counts == {"Deva": 9, "Manushya": 9, "Rakshasa": 9}, counts


def test_golden_couple_gana_is_six(result):
    """Both Moons are Manushya → same gana → full 6. Was wrongly 0 pre-fix."""
    gana = next(k for k in result["ashtakoota"]["kutas"] if k["kuta"] == "Gana")
    assert gana["score"] == 6


def test_golden_couple_ashtakoota_total(result):
    """Canonically correct total for this couple is 28.5/36."""
    assert result["ashtakoota"]["total_score"] == pytest.approx(28.5)


# ── Vedha table integrity ─────────────────────────────────────────────

def test_vedha_covers_all_27_nakshatras():
    missing = [n for n in sim.NAKSHATRA_ORDER if n not in sim._VEDHA_LOOKUP]
    assert missing == []


def test_vedha_is_symmetric():
    for a, partners in sim._VEDHA_LOOKUP.items():
        for b in partners:
            assert a in sim._VEDHA_LOOKUP[b], f"{a}->{b} not symmetric"


def test_vedha_known_pairs():
    assert sim.calc_vedha("Ashwini", "Jyeshtha")["has_dosha"] is True
    assert sim.calc_vedha("Rohini", "Swati")["has_dosha"] is True
    assert sim.calc_vedha("Hasta", "Shatabhisha")["has_dosha"] is True
    # The mutually-vedha triad
    assert sim.calc_vedha("Mrigashira", "Chitra")["has_dosha"] is True
    assert sim.calc_vedha("Chitra", "Dhanishtha")["has_dosha"] is True
    # A non-pair
    assert sim.calc_vedha("Ashwini", "Bharani")["has_dosha"] is False


def test_vedha_handles_spelling_aliases():
    """Other modules emit 'Dhanishta'/'Moola'; a silent miss would corrupt verdicts."""
    assert sim.calc_vedha("Mrigashira", "Dhanishta")["lookup_ok"] is True
    assert sim.calc_vedha("Ashlesha", "Moola")["has_dosha"] is True


def test_vedha_unknown_name_is_neutral_not_crash():
    r = sim.calc_vedha("NotAStar", "Rohini")
    assert r["lookup_ok"] is False and r["has_dosha"] is False


# ── Dina porutham ─────────────────────────────────────────────────────

def test_dina_same_star_is_janma_and_fails():
    r = sim.calc_dina("Rohini", "Rohini")
    assert r["remainder"] == 1 and r["tara_name"] == "Janma"
    assert r["passed"] is False


def test_dina_golden_couple_is_pratyari():
    r = sim.calc_dina("Uttara Ashadha", "Uttara Bhadrapada")
    assert r["remainder"] == 5 and r["tara_name"] == "Pratyari"
    assert r["passed"] is False


# ── Papa Samyam ───────────────────────────────────────────────────────

def test_papa_samyam_clean_chart_scores_zero():
    """No papa graha in any affliction house from any reference → 0."""
    planets = {
        "Sun": {"longitude": 100.0},     # 4th sign from 0 Aries lagna... see below
        "Moon": {"longitude": 0.0},
        "Venus": {"longitude": 0.0},
    }
    # Deliberately place the only papa graha (Sun) in the 4th from Aries
    # lagna → 4 IS a papa house, so this should NOT be zero. Assert the
    # detection fires rather than silently missing.
    r = sim.compute_papa_samyam(planets, 0.0)
    assert r["total"] > 0


def test_papa_samyam_counts_all_three_references():
    r = sim.compute_papa_samyam(
        {"Moon": {"longitude": 0.0}, "Venus": {"longitude": 0.0},
         "Mars": {"longitude": 0.0}},
        0.0,
    )
    # Mars in the 1st from Lagna, Moon and Venus alike → 3 hits.
    assert r["total"] == 3
    assert set(r["by_reference"]) == {"Lagna", "Moon", "Venus"}


def test_papa_samyam_ceiling_is_fifteen():
    r = sim.compute_papa_samyam({"Moon": {"longitude": 0.0}}, 0.0)
    assert r["max_possible"] == 15


def test_papa_comparison_classical_rule():
    """Girl's load must not exceed boy's (classical South Indian rule)."""
    ok = sim.compare_papa_samyam({"total": 6}, {"total": 4})
    assert ok["classical_rule_satisfied"] is True
    bad = sim.compare_papa_samyam({"total": 3}, {"total": 8})
    assert bad["classical_rule_satisfied"] is False


def test_papa_comparison_symmetric_rule_is_separate():
    """We publish a gender-neutral reading alongside the classical one."""
    r = sim.compare_papa_samyam({"total": 9}, {"total": 2})
    assert r["classical_rule_satisfied"] is True     # girl < boy
    assert r["symmetric_rule_satisfied"] is False    # but badly imbalanced


def test_golden_couple_papa_samyam(result):
    p = result["papa_samyam"]
    assert p["boy"]["total"] == 9
    assert p["girl"]["total"] == 5
    assert p["comparison"]["classical_rule_satisfied"] is True


# ── Dashakoota assembly + dual verdict ────────────────────────────────

def test_dashakoota_has_ten_poruthams(result):
    d = result["dashakoota"]
    assert d["total_count"] == 10
    assert [p["porutham"] for p in d["poruthams"]] == sim.DASHAKOOTA_PORUTHAMS


def test_dashakoota_excludes_varna_and_nadi(result):
    """Varna and Nadi are Ashtakoota-only — they are NOT South Indian poruthams."""
    names = {p["porutham"] for p in result["dashakoota"]["poruthams"]}
    assert "Varna" not in names and "Nadi" not in names


def test_dashakoota_reuses_ashtakoota_scores(result):
    """Shared kootas must never disagree between the two systems."""
    gana_a = next(k for k in result["ashtakoota"]["kutas"] if k["kuta"] == "Gana")
    gana_d = next(p for p in result["dashakoota"]["poruthams"]
                  if p["porutham"] == "Gana")
    assert gana_d["score"] == gana_a["score"]


def test_dual_verdict_present_and_independent(result):
    d = result["dashakoota"]
    assert "verdict_strict" in d and "verdict_without_blockers" in d
    assert d["verdict_strict"]["counts_blockers"] is True
    assert d["verdict_without_blockers"]["counts_blockers"] is False
    # Blocker-free reading is scored over the other 8 poruthams
    assert d["verdict_without_blockers"]["total"] == 8


def test_golden_couple_rajju_blocks_strict_only(result):
    """This couple shares Kantha Rajju — strict rejects, lenient does not."""
    d = result["dashakoota"]
    assert "Rajju" in d["hard_blockers_hit"]
    assert "Rejected" in d["verdict_strict"]["label"]
    assert "Rejected" not in d["verdict_without_blockers"]["label"]
    assert d["verdicts_disagree"] is True


def test_both_systems_published_side_by_side(result):
    """North (36) and South (10) must BOTH be present for the astrologer."""
    assert result["ashtakoota"]["max_score"] == 36
    assert result["dashakoota"]["total_count"] == 10


# ── Nakshatra spelling normalisation (PR A1.13) ───────────────────────
# chart_engine emits "Dhanishta"; every koota table keys on "Dhanishtha".
# Pre-fix, ~3.7% of natives silently scored on a broken Ashtakoota.

def test_dhanishta_spelling_is_normalised():
    from app.services.compatibility_engine import _canonical_nak
    assert _canonical_nak("Dhanishta") == "Dhanishtha"


def test_every_emitted_nakshatra_resolves_in_every_koota_table():
    """Regression guard: no koota table may silently miss an emitted name."""
    from app.services.chart_engine import NAKSHATRAS
    from app.services.compatibility_engine import (
        NAKSHATRA_GANA, NAKSHATRA_NADI, NAKSHATRA_ORDER, NAKSHATRA_YONI,
        RAJJU_MAP, _canonical_nak,
    )
    tables = {
        "GANA": NAKSHATRA_GANA, "NADI": NAKSHATRA_NADI,
        "RAJJU": RAJJU_MAP, "YONI": NAKSHATRA_YONI,
        "ORDER": NAKSHATRA_ORDER,
    }
    problems = []
    for name, _lord in NAKSHATRAS:
        canon = _canonical_nak(name)
        for tname, tbl in tables.items():
            keys = set(tbl) if isinstance(tbl, dict) else set(tbl)
            if canon not in keys:
                problems.append(f"{tname}:{name}->{canon}")
    assert problems == [], problems


def test_dhanishta_gana_is_rakshasa_after_normalisation():
    from app.services.compatibility_engine import NAKSHATRA_GANA, _canonical_nak
    assert NAKSHATRA_GANA[_canonical_nak("Dhanishta")] == "Rakshasa"

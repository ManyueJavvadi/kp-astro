"""Lock-in tests for the 2026-06 fire-score significator-consistency fix.

Background: `rank_sookshmas_by_fire_score` used to compute "houses a planet
signifies" with only the SELF + STAR layers, silently omitting the SUB
layer (the KSK deciding factor) and the Rahu/Ketu conjunction proxy — while
`compute_star_sub_harmony` in the same module correctly used all three
layers. These tests pin the corrected behaviour: both functions now derive
significations from the single shared helper `_layered_signified_houses`,
so the SUB layer is always counted and the two can never drift again.

Synthetic whole-sign Aries-ascendant chart (no dependency on any real
client chart, so this can't be "tuned" to one person):

    H1 Aries .. H12 Pisces, each cusp at the sign boundary.
    Sign lords: H1 Mars, H2 Venus, H3 Mercury, H4 Moon, H5 Sun,
                H6 Mercury, H7 Venus, H8 Mars, H9 Jupiter,
                H10 Saturn, H11 Saturn, H12 Jupiter.
"""

from app.services.kp_advanced_compute import (
    _layered_signified_houses,
    rank_sookshmas_by_fire_score,
    compute_star_sub_harmony,
)


def _whole_sign_cusps():
    # Each house cusp sits at the start of its sign (Aries asc).
    return {f"House_{i}": {"cusp_longitude": (i - 1) * 30.0} for i in range(1, 13)}


def _planets():
    # Only the planets the tests touch need full data. Longitudes place:
    #   Venus  -> H10 (Capricorn 275)
    #   Mars   -> H3  (Gemini 65)      [Venus's star lord]
    #   Mercury-> H5  (Leo 125)        [Venus's sub lord]
    return {
        "Venus": {"longitude": 275.0, "star_lord": "Mars", "sub_lord": "Mercury",
                  "nakshatra": "Uttara Ashadha"},
        "Mars": {"longitude": 65.0, "star_lord": "Rahu", "sub_lord": "Saturn",
                 "nakshatra": "Ardra"},
        "Mercury": {"longitude": 125.0, "star_lord": "Ketu", "sub_lord": "Venus",
                    "nakshatra": "Magha"},
    }


def _planet_positions():
    return {"Venus": 10, "Mars": 3, "Mercury": 5}


def test_layered_helper_includes_sub_layer():
    """The SUB layer (sub lord Mercury -> owns H3,H6; occupies H5) must be
    present and distinct from SELF/STAR."""
    self_h, star_h, sub_h = _layered_signified_houses(
        "Venus", _planets(), _whole_sign_cusps(), _planet_positions()
    )
    # SELF: Venus occupies H10, owns Taurus(H2)+Libra(H7)
    assert self_h == {2, 7, 10}
    # STAR: Mars occupies H3, owns Aries(H1)+Scorpio(H8)
    assert star_h == {1, 3, 8}
    # SUB: Mercury occupies H5, owns Gemini(H3)+Virgo(H6)
    assert sub_h == {3, 5, 6}


def test_fire_score_now_counts_sub_layer_relevant_house():
    """H6 is signified ONLY through Venus's sub lord (Mercury). Before the
    fix the fire-score omitted the sub layer and never saw H6; now it does.
    With relevant_houses={6,10}, both H6 (sub) and H10 (self) must register."""
    sookshmas = [{"sookshma_lord": "Venus"}]
    # Denial houses chosen to NOT overlap Venus's signified set, so the
    # score cleanly isolates the relevant-house contribution.
    # (Venus signifies {1,2,3,5,6,7,8,10}; denial {4,12} → zero overlap.)
    ranked = rank_sookshmas_by_fire_score(
        sookshmas,
        relevant_houses=[6, 10],
        denial_houses=[4, 12],
        planets=_planets(),
        cusps=_whole_sign_cusps(),
        planet_positions=_planet_positions(),
        ruling_planets_list=[],
        vargottama_map={},
    )
    notes = ranked[0]["fire_notes"]
    # The relevant-house note must include BOTH 6 (sub layer) and 10 (self).
    assert "6" in notes and "10" in notes, notes
    # Two relevant hits, zero denial → score 2.0. The OLD self+star-only
    # computation would have seen only H10 (1 hit) and scored 1.0.
    assert ranked[0]["fire_score"] == 2.0, ranked[0]


def test_harmony_sub_layer_matches_helper():
    """compute_star_sub_harmony must report the SAME sub-layer houses as the
    shared helper — proving the two functions share one source of truth."""
    _, _, helper_sub = _layered_signified_houses(
        "Venus", _planets(), _whole_sign_cusps(), _planet_positions()
    )
    harmony = compute_star_sub_harmony(
        "Venus", _planets(), _whole_sign_cusps(), _planet_positions(),
        relevant_houses=[6, 10], denial_houses=[8, 12],
    )
    assert set(harmony["sub_houses"]) == helper_sub

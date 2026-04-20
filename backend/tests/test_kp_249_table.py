"""
Tests for the canonical KP 1-249 sub-lord table.
Guards against accidental drift in PRs that touch kp_249_table.py.
"""
import pytest

from app.services.kp_249_table import (
    KP_249_TABLE,
    number_to_lagna_longitude,
)


def test_table_length_is_249():
    assert len(KP_249_TABLE) == 249


def test_first_and_last_rows():
    assert KP_249_TABLE[0]["num"] == 1
    assert KP_249_TABLE[0]["sign"] == "Aries"
    assert KP_249_TABLE[0]["nakshatra"] == "Ashwini"
    assert KP_249_TABLE[0]["star_lord"] == "Ketu"
    assert KP_249_TABLE[0]["sub_lord"] == "Ketu"
    assert KP_249_TABLE[0]["lon_start"] == 0.0

    assert KP_249_TABLE[-1]["num"] == 249
    assert KP_249_TABLE[-1]["sign"] == "Pisces"
    assert KP_249_TABLE[-1]["nakshatra"] == "Revati"
    assert KP_249_TABLE[-1]["star_lord"] == "Mercury"


def test_row_10_matches_jyotishportal():
    # #10: Aries, Bharani nakshatra, Venus star lord, Venus sub lord, starts at 13°20′
    row = KP_249_TABLE[9]
    assert row["num"] == 10
    assert row["sign"] == "Aries"
    assert row["nakshatra"] == "Bharani"
    assert row["star_lord"] == "Venus"
    assert row["sub_lord"] == "Venus"
    assert abs(row["lon_start"] - 13.3333) < 0.001


def test_row_84_leo_zero_magha_ketu_ketu():
    # #84: Leo 0°, Magha nakshatra, Ketu star lord, Ketu sub lord
    row = KP_249_TABLE[83]
    assert row["num"] == 84
    assert row["sign"] == "Leo"
    assert row["nakshatra"] == "Magha"
    assert row["star_lord"] == "Ketu"
    assert row["sub_lord"] == "Ketu"
    assert abs(row["lon_start"] - 120.0) < 0.001


def test_longitudes_are_monotonic_non_decreasing():
    """Each row's lon_start >= previous row's lon_start (or wraps through 360→0)."""
    for i in range(1, 249):
        prev = KP_249_TABLE[i - 1]
        curr = KP_249_TABLE[i]
        # Must be >= previous OR wrap (e.g. very last row to first in cyclic view).
        # Since the table is 0..360 non-cyclic, monotonic in ascending order.
        assert curr["lon_start"] >= prev["lon_start"], (
            f"Row {curr['num']} starts at {curr['lon_start']} "
            f"before row {prev['num']} at {prev['lon_start']}"
        )


def test_six_sign_boundary_splits_exist():
    """
    Canonical KP table has 6 sub-lords that cross a sign boundary,
    represented as 2 rows each (same nakshatra + sub_lord, consecutive num,
    differing sign).
    """
    splits = []
    for i in range(248):
        a, b = KP_249_TABLE[i], KP_249_TABLE[i + 1]
        if (a["nakshatra_idx"] == b["nakshatra_idx"]
                and a["sub_lord"] == b["sub_lord"]
                and a["sign"] != b["sign"]):
            splits.append((a["num"], b["num"], a["sign"], b["sign"], a["sub_lord"]))
    assert len(splits) == 6, f"Expected 6 sign-boundary splits, got {len(splits)}: {splits}"


def test_number_to_lagna_longitude_rejects_out_of_range():
    with pytest.raises(ValueError):
        number_to_lagna_longitude(0)
    with pytest.raises(ValueError):
        number_to_lagna_longitude(250)
    with pytest.raises(ValueError):
        number_to_lagna_longitude(-5)


def test_number_to_lagna_longitude_range_244_249_distinct():
    """
    CRITICAL: pre-A1.1 engine modulo-wrapped these to rows 1-6.
    In the canonical table they are in Pisces/Revati with different sub_lords.
    """
    for n in range(244, 250):
        lon, row = number_to_lagna_longitude(n)
        assert row["num"] == n
        # #244-249 are all in Pisces/Revati in the canonical table
        assert row["sign"] == "Pisces", f"#{n} expected Pisces, got {row['sign']}"
        assert row["nakshatra"] == "Revati", f"#{n} expected Revati, got {row['nakshatra']}"
    # And they are DIFFERENT from the first 6 rows (which are Aries/Ashwini)
    for n_high, n_low in zip(range(244, 250), range(1, 7)):
        high_row = KP_249_TABLE[n_high - 1]
        low_row = KP_249_TABLE[n_low - 1]
        assert high_row["sign"] != low_row["sign"], (
            f"#{n_high} and #{n_low} should not share sign — the pre-A1.1 modulo bug."
        )

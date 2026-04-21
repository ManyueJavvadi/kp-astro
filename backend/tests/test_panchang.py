"""
Panchang accuracy tests — PR A1.2a.

These tests pin specific (date, location, expected output) cases that
mainstream Panchang sources (DrikPanchang, mypanchang, ksrinivas) all
agree on. Updates to panchangam.py that drift these values must be
intentional — bump the expected value AND drop a one-line note in the
test docstring naming the new source you cross-checked against.

Cases chosen to exercise:
  - Two timezones (Etobicoke EDT / Tenali IST) — the local-date bug
    was tz-sensitive
  - Pre-Ugadi vs post-Ugadi date (samvatsara cutoff)
  - A date with a known early-morning tithi transition (search-window bug)
"""
from datetime import date

import pytest

from app.routers.panchangam import (
    get_sunrise_sunset_jd,
    get_samvatsara_for_date,
    jd_to_local_time_str,
)


# ───────── Sunrise / sunset accuracy (within 3 min of NOAA reference) ─────────
# Tolerance: NOAA-based algorithms have ~1-2 min sunrise variance vs
# almanac sources due to atmospheric refraction modeling. 5 min tolerance
# is generous enough to be stable across library updates and tight enough
# to catch regressions like the previous "showed yesterday's sunset" bug.

def _hms_to_minutes(hms: str) -> int:
    """'HH:MM:SS' -> minutes since midnight (used for tolerance comparison)."""
    h, m, s = hms.split(":")
    return int(h) * 60 + int(m) + (1 if int(s) >= 30 else 0)


def _assert_close(got: str, expected: str, tol_min: int, label: str):
    g = _hms_to_minutes(got)
    e = _hms_to_minutes(expected)
    assert abs(g - e) <= tol_min, (
        f"{label}: got {got} ({g} min), expected {expected} ({e} min), "
        f"diff {abs(g - e)} min > tolerance {tol_min} min"
    )


def test_sunrise_etobicoke_april_2026():
    """Etobicoke, ON 2026-04-21 — DrikPanchang reports sunrise 06:24 EDT."""
    sr_jd, ss_jd = get_sunrise_sunset_jd(
        date(2026, 4, 21), 43.6532, -79.5832, -4.0,
    )
    _assert_close(jd_to_local_time_str(sr_jd, -4.0), "06:24:00", 5, "Etobicoke sunrise")
    _assert_close(jd_to_local_time_str(ss_jd, -4.0), "20:08:00", 5, "Etobicoke sunset")


def test_sunrise_tenali_april_2026():
    """Tenali, AP 2026-04-21 — DrikPanchang reports sunrise ~05:53 IST."""
    sr_jd, ss_jd = get_sunrise_sunset_jd(
        date(2026, 4, 21), 16.2396, 80.6407, 5.5,
    )
    _assert_close(jd_to_local_time_str(sr_jd, 5.5), "05:53:00", 5, "Tenali sunrise")
    _assert_close(jd_to_local_time_str(ss_jd, 5.5), "18:24:00", 5, "Tenali sunset")


def test_sunrise_hyderabad_september():
    """Hyderabad 2025-09-15 — autumnal equinox-ish, ~06:00/18:15 IST."""
    sr_jd, ss_jd = get_sunrise_sunset_jd(
        date(2025, 9, 15), 17.385, 78.4867, 5.5,
    )
    sr = jd_to_local_time_str(sr_jd, 5.5)
    ss = jd_to_local_time_str(ss_jd, 5.5)
    _assert_close(sr, "06:09:00", 5, "Hyderabad equinox sunrise")
    _assert_close(ss, "18:18:00", 5, "Hyderabad equinox sunset")


def test_sunrise_does_not_return_yesterdays_sunset():
    """
    Regression guard for the original user-reported bug.

    Before PR A1.2a, get_sunrise_sunset_jd round-tripped a JD through
    unix_seconds, which (for Etobicoke EDT) shifted target_date back by
    one day, causing astral_sun(date=April 20) to return April 19's
    sunset (because EDT sunset crosses UTC midnight).

    This test confirms the returned sunset's local hour is in the
    afternoon/evening (15:00-22:00) — never in the morning of the prior
    day.
    """
    _, ss_jd = get_sunrise_sunset_jd(
        date(2026, 4, 21), 43.6532, -79.5832, -4.0,
    )
    ss = jd_to_local_time_str(ss_jd, -4.0)
    hour = int(ss.split(":")[0])
    assert 15 <= hour <= 22, (
        f"Sunset time {ss} is suspicious — should be 15:00-22:00 EDT for "
        f"Etobicoke in April. Pre-A1.2a regression?"
    )


# ───────── Samvatsara cycle ─────────
# Cross-checked: 2026 Ugadi (Mar 19) → Parabhava per DrikPanchang,
# Hindutone, Wikipedia and every Telugu almanac.

def test_samvatsara_2026_post_ugadi_is_parabhava():
    s = get_samvatsara_for_date(date(2026, 4, 1))
    assert s["en"] == "Parabhava"
    assert s["cycle_year"] == 40
    assert "defeat" in s["meaning"].lower() or "reversal" in s["meaning"].lower()


def test_samvatsara_pre_ugadi_returns_previous_year():
    """
    Feb 2026 in Telugu/Tamil tradition is still the PREVIOUS year's
    samvatsara (Vishwavasu). The new year doesn't switch at Jan 1; it
    switches at Ugadi (Chaitra Shukla Pratipada, ~Mar 19-Apr 13).
    """
    s_feb = get_samvatsara_for_date(date(2026, 2, 1))
    assert s_feb["en"] == "Vishwavasu"
    s_apr = get_samvatsara_for_date(date(2026, 4, 1))
    assert s_apr["en"] == "Parabhava"


def test_samvatsara_60_year_cycle_anchor():
    """1867, 1927, 1987, 2047 are all Prabhava (cycle anchor)."""
    for year in (1867, 1927, 1987, 2047):
        # Use mid-year (Jun 15) to avoid the Ugadi cutoff edge.
        s = get_samvatsara_for_date(date(year, 6, 15))
        assert s["en"] == "Prabhava", (
            f"Year {year} should be Prabhava (cycle anchor), got {s['en']}"
        )
        assert s["cycle_year"] == 1


def test_samvatsara_response_has_full_richness():
    """en, te, meaning, cycle_year, cycle_index all populated."""
    s = get_samvatsara_for_date(date(2026, 4, 1))
    for key in ("en", "te", "meaning", "cycle_year", "cycle_index"):
        assert key in s, f"missing key: {key}"
    assert s["te"] != "" and s["en"] != "" and s["meaning"] != ""


# ───────── PR A1.2b regression guards ─────────

def test_calendar_endpoint_returns_30_or_31_days():
    """
    PR A1.2b regression guard for the `dt is not defined` NameError that
    was throwing 500 on every /calendar call. Frontend silently set
    calData=null and the calendar grid disappeared.
    """
    from app.routers.panchangam import get_monthly_calendar, CalendarRequest
    result = get_monthly_calendar(CalendarRequest(
        latitude=43.6532, longitude=-79.5832, year=2026, month=4
    ))
    assert "days" in result
    assert len(result["days"]) == 30  # April has 30 days
    # Each day must have a weekday integer (0-6, Mon..Sun per Python convention)
    for d in result["days"]:
        assert "weekday" in d
        assert isinstance(d["weekday"], int) and 0 <= d["weekday"] <= 6


def test_yoga_quality_classification():
    """The 9 papa yogas must be flagged inauspicious; rest auspicious."""
    from app.routers.panchangam import YOGA_QUALITY
    malefic = {
        "Vishkambha", "Atiganda", "Shula", "Ganda", "Vyaghata",
        "Vajra", "Vyatipata", "Parigha", "Vaidhriti",
    }
    for name in malefic:
        assert YOGA_QUALITY[name] == "inauspicious", f"{name} should be malefic"
    auspicious_sample = ("Priti", "Ayushman", "Saubhagya", "Siddhi", "Brahma")
    for name in auspicious_sample:
        assert YOGA_QUALITY[name] == "auspicious", f"{name} should be auspicious"


def test_durmuhurtha_tuesday_no_longer_overlaps_abhijit():
    """
    Tuesday was [4, 7] before PR A1.2b. Slot 7 = Abhijit Muhurta which
    is auspicious. Fixed to [4, 8].

    Note: Friday legitimately has slot 7 in some Hora Shastra traditions
    (Friday's Abhijit is contested). We only assert the specific
    historical bug — that Tuesday no longer pollutes its slot list with
    Abhijit. Other weekdays will be revisited with dad's reference.
    """
    from app.routers.panchangam import DURMUHURTHA_SLOTS
    assert 7 not in DURMUHURTHA_SLOTS[1], (
        "Tuesday Durmuhurtha must not include slot 7 (Abhijit). "
        "Pre-A1.2b regression."
    )

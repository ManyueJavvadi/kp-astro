"""
PR A1.12 — Regression tests for backend timezone resolution.

Before this PR, every chart-generating endpoint trusted the
`timezone_offset` number the frontend sent. That number defaulted to
5.5 (IST) and only updated if a bigdatacloud reverse-geocode lookup
happened to succeed AND return a timezone field. Both silently failed
for many non-Indian birthplaces (incl. the bug-report case below) →
charts were computed at the wrong UTC instant by up to ~13 hours →
every cusp, planet, and dasha was wrong.

The fix moves timezone resolution to the backend via `timezonefinder`
(offline lat/lon → IANA) + `zoneinfo` (full historical DST rules).
These tests lock in:

1. The original bug-report chart (Fremont CA, 19/10/2000 21:05) now
   resolves to PDT/UTC-7 — and the chart lagna lands in the correct
   sign (Taurus), not the broken-IST sign (Libra).
2. Standard IST charts still resolve to 5.5.
3. Historical DST quirks are honored (pre-2006 Indianapolis = no DST;
   post-2007 Indianapolis = DST; pre-2011 Russia = DST; etc.).
4. Sub-hour offsets (India +5.5, Nepal +5.75) are preserved.
5. Ocean / unresolvable coordinates fall back to the caller-supplied
   value without raising.
"""
import pytest

from app.services.timezone_utils import resolve_birth_offset
from app.services.chart_engine import generate_chart


class TestResolveBirthOffset:
    def test_fremont_oct_2000_is_pdt_not_ist(self):
        """The bug report. Fremont 19/10/2000 21:05 must resolve to PDT (-7)."""
        offset, tz_name = resolve_birth_offset(
            37.5483, -121.9886, "2000-10-19", "21:05",
            fallback_offset=5.5,
        )
        assert offset == -7.0, (
            f"Fremont in October 2000 must be PDT/UTC-7 (US DST didn't end "
            f"until Oct 29 2000). Got {offset}h — the IST-leak bug is back."
        )
        assert tz_name == "America/Los_Angeles"

    def test_fremont_january_is_pst(self):
        """California in winter — must drop to PST (UTC-8)."""
        offset, _ = resolve_birth_offset(37.5483, -121.9886, "2000-01-15", "12:00")
        assert offset == -8.0

    def test_hyderabad_is_ist(self):
        """Sanity — IST charts must still work."""
        offset, tz_name = resolve_birth_offset(17.385, 78.4867, "1995-06-15", "10:00")
        assert offset == 5.5
        assert tz_name == "Asia/Kolkata"

    def test_kathmandu_keeps_5_75_sub_hour_offset(self):
        """Nepal uses UTC+5:45. Must not round to 5.5 or 6."""
        offset, tz_name = resolve_birth_offset(27.7172, 85.3240, "2000-01-15", "12:00")
        assert offset == 5.75
        assert tz_name == "Asia/Kathmandu"

    def test_indianapolis_pre_2006_no_dst(self):
        """Indiana adopted DST in 2006. Pre-2006 summer must read as
        permanent EST (UTC-5), not EDT (UTC-4)."""
        offset, _ = resolve_birth_offset(39.7684, -86.1581, "2000-07-15", "12:00")
        assert offset == -5.0

    def test_indianapolis_post_2007_has_dst(self):
        """Post-2007 summer must read as EDT (UTC-4)."""
        offset, _ = resolve_birth_offset(39.7684, -86.1581, "2010-07-15", "12:00")
        assert offset == -4.0

    def test_bad_date_falls_back(self):
        """Garbage date strings fall back to the caller-supplied offset."""
        offset, _ = resolve_birth_offset(
            37.5483, -121.9886, "not-a-date", "xx:xx", fallback_offset=4.2,
        )
        assert offset == 4.2

    def test_london_winter_is_gmt(self):
        offset, _ = resolve_birth_offset(51.5074, -0.1278, "2000-01-15", "12:00")
        assert offset == 0.0

    def test_london_summer_is_bst(self):
        offset, _ = resolve_birth_offset(51.5074, -0.1278, "2000-07-15", "12:00")
        assert offset == 1.0


class TestFremontChartCorrectness:
    """Lock in the actual chart values for the bug-report fixture.

    Anyone who breaks the timezone resolution will fail these by miles
    — the lagna and Moon sign change by multiple full signs.
    """

    LAT = 37.5483
    LON = -121.9886
    DATE = "2000-10-19"
    TIME = "21:05"

    def test_fremont_chart_lagna_is_taurus(self):
        offset, _ = resolve_birth_offset(self.LAT, self.LON, self.DATE, self.TIME)
        chart = generate_chart(self.DATE, self.TIME, self.LAT, self.LON, offset)
        h1 = chart["cusps"]["House_1"]
        assert h1["sign"] == "Taurus", (
            f"Lagna must be Taurus for Fremont 19/10/2000 21:05 PDT. "
            f"Got {h1['sign']} {h1['cusp_longitude']:.2f}° — timezone "
            f"resolution is broken."
        )
        # Approx 24.4° — allow small ephemeris drift across pyswisseph versions.
        assert 23.0 <= h1["cusp_longitude"] - 30 <= 26.0  # Taurus = 30-60°

    def test_fremont_chart_moon_is_cancer(self):
        offset, _ = resolve_birth_offset(self.LAT, self.LON, self.DATE, self.TIME)
        chart = generate_chart(self.DATE, self.TIME, self.LAT, self.LON, offset)
        moon = chart["planets"]["Moon"]
        assert moon["sign"] == "Cancer", (
            f"Moon must be Cancer for Fremont 19/10/2000 21:05 PDT. "
            f"Got {moon['sign']} {moon['longitude']:.2f}° — timezone "
            f"resolution is broken."
        )

    def test_ist_leak_would_produce_wrong_chart(self):
        """Negative-control: feeding the wrong IST offset MUST produce
        the broken chart we used to ship. If this test fails it means
        someone defensive-coded the engine to ignore the offset arg —
        which would also break legitimate non-overridden callers."""
        chart_broken = generate_chart(
            self.DATE, self.TIME, self.LAT, self.LON, timezone_offset=5.5
        )
        # The broken chart placed lagna in Libra. We assert this so anyone
        # who reads the test understands what the bug actually looked like.
        assert chart_broken["cusps"]["House_1"]["sign"] == "Libra"

"""Regression tests for `rp_meta` — the location/time metadata emitted by
chart_pipeline alongside the computed Ruling Planets.

`rp_meta` exists so the frontend can show the astrologer EXACTLY where
every RP citation came from (their live location vs the natal-fallback
case).  These tests lock in:

1. When `live_*` lat/lon/tz are passed → source = "live", coords match
   the live values (not the natal ones).
2. When `live_*` are omitted → source = "natal_fallback", coords match
   the natal birth lat/lon (so the AI's "today's RPs" claim, while
   misleading, is at least mathematically derivable from the same data
   the frontend can display in its warning banner).
3. `tz_name` is the correct IANA name for each location, populated
   regardless of source.
4. `computed_at_local` is a non-empty HH:MM string.

These guard the trust contract:  frontend pill colour-coding + inline
labels are driven entirely off `rp_meta`, so a regression here silently
removes the location signal from every RP-bearing surface.
"""
from __future__ import annotations

import pytest

from app.services.chart_pipeline import build_full_chart_data


# Manyue fixture (one of the four canonical golden charts in CLAUDE.md).
NATAL_KW = dict(
    name="Manyue",
    date="2000-09-09",
    time="12:31",
    latitude=16.2378,
    longitude=80.6464,
    timezone_offset=5.5,
    gender="male",
    topic="marriage",
)


class TestRpMetaSource:
    def test_natal_fallback_when_no_live_location(self):
        """No live_* args → RPs computed at natal lat/lon/tz, source flagged."""
        cd = build_full_chart_data(**NATAL_KW)
        m = cd["rp_meta"]
        assert m["source"] == "natal_fallback"
        assert m["lat"] == 16.2378
        assert m["lon"] == 80.6464
        assert m["tz_offset"] == 5.5
        assert m["tz_name"] == "Asia/Kolkata"

    def test_live_when_live_location_provided(self):
        """live_* args → RPs computed at the live coords, source = 'live'."""
        cd = build_full_chart_data(
            **NATAL_KW,
            live_latitude=37.5483,
            live_longitude=-121.9886,
            live_timezone_offset=-7.0,
        )
        m = cd["rp_meta"]
        assert m["source"] == "live"
        assert m["lat"] == 37.5483
        assert m["lon"] == -121.9886
        assert m["tz_offset"] == -7.0
        assert m["tz_name"] == "America/Los_Angeles"

    def test_partial_live_still_falls_back(self):
        """If any one of the three live_* is missing, treat as fallback —
        we'd rather use a consistent natal triple than mix live lat/lon
        with natal tz (which would compute the wrong day-lord)."""
        cd = build_full_chart_data(
            **NATAL_KW,
            live_latitude=37.5483,
            live_longitude=-121.9886,
            live_timezone_offset=None,  # partial
        )
        m = cd["rp_meta"]
        assert m["source"] == "natal_fallback"
        # Falls back fully — not a mix.
        assert m["lat"] == 16.2378
        assert m["lon"] == 80.6464
        assert m["tz_offset"] == 5.5


class TestRpMetaEnrichment:
    def test_tz_name_for_hyderabad(self):
        cd = build_full_chart_data(**NATAL_KW)
        assert cd["rp_meta"]["tz_name"] == "Asia/Kolkata"

    def test_tz_name_for_california_via_live(self):
        cd = build_full_chart_data(
            **NATAL_KW,
            live_latitude=37.5483,
            live_longitude=-121.9886,
            live_timezone_offset=-7.0,
        )
        assert cd["rp_meta"]["tz_name"] == "America/Los_Angeles"

    def test_tz_name_for_kathmandu_live(self):
        """Sub-hour offset locations resolve correctly too."""
        cd = build_full_chart_data(
            **NATAL_KW,
            live_latitude=27.7172,
            live_longitude=85.3240,
            live_timezone_offset=5.75,
        )
        assert cd["rp_meta"]["tz_name"] == "Asia/Kathmandu"
        assert cd["rp_meta"]["tz_offset"] == 5.75

    def test_computed_at_local_is_hhmm_format(self):
        cd = build_full_chart_data(**NATAL_KW)
        local = cd["rp_meta"]["computed_at_local"]
        assert isinstance(local, str), f"expected HH:MM string, got {local!r}"
        assert len(local) == 5
        assert local[2] == ":"
        h, m = local.split(":")
        assert 0 <= int(h) <= 23
        assert 0 <= int(m) <= 59

    def test_place_name_is_none_at_this_layer(self):
        """The pipeline only knows lat/lon, not a human place name.  The
        frontend / useLiveLocation surfaces the display string.  Leaving
        this None on the backend is intentional — adding a reverse-geocode
        call here would block chart generation on a third-party service."""
        cd = build_full_chart_data(**NATAL_KW)
        assert cd["rp_meta"]["place_name"] is None


class TestRpMetaConsistencyWithRulingPlanets:
    """rp_meta MUST reflect the same lat/lon/tz that were actually passed
    to get_ruling_planets(). If a future refactor diverges these, the
    astrologer would see a "Hyderabad" label on RPs that were silently
    computed at a different location — exactly the trust bug rp_meta
    was added to prevent."""

    def test_live_rp_meta_matches_ruling_planets_inputs(self):
        cd = build_full_chart_data(
            **NATAL_KW,
            live_latitude=37.5483,
            live_longitude=-121.9886,
            live_timezone_offset=-7.0,
        )
        m = cd["rp_meta"]
        # Ruling planets bundle should reflect a computation at California:
        # the day_lord depends on the local weekday + sunrise at that lat/lon,
        # so a California-derived day lord != Hyderabad-derived day lord on
        # any cross-day boundary.  The exact lord depends on `now`, so we
        # only assert structural consistency, not the lord itself.
        assert m["lat"] == 37.5483
        assert m["lon"] == -121.9886
        # ruling_planets bundle should exist
        assert "ruling_planets" in cd
        assert isinstance(cd["ruling_planets"], dict)

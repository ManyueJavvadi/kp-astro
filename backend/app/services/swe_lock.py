"""swe_lock.py — Single global lock around swisseph C-state mutations.

PR A1.3-fix-24 — created to fix concurrent set_topo() races.

THE PROBLEM:
swisseph (the underlying pyswisseph wrapper around the C library) keeps
ALL state in a process-global C struct. Calls like:

    swe.set_sid_mode(swe.SIDM_KRISHNAMURTI_VP291)
    swe.set_topo(longitude, latitude, 0)
    result, _ = swe.calc_ut(jd, planet_id, swe.FLG_SIDEREAL | swe.FLG_TOPOCTR)

are NOT a transaction. Under FastAPI threadpool concurrency, the
following interleave is possible:

    Thread A: set_topo(Mumbai)
    Thread B: set_topo(Hyderabad)        ← clobbers A
    Thread A: calc_ut(...)               ← computed using B's topo!
    Thread B: calc_ut(...)               ← also B's topo, fine

Result: panchangam request for Mumbai silently uses Hyderabad coords
while a concurrent Hyderabad request happens. The user sees plausible-
but-wrong sunrise/sunset, tithi, etc.

set_sid_mode is NOT racy in our codebase because every caller sets the
SAME value (KP New ayanamsa). End state is constant regardless of
race. So we don't lock around sid_mode-only call sites — that would
be unnecessary overhead.

WHEN TO USE:
Any code path that calls `swe.set_topo(...)` followed by `swe.calc_ut(...)`
with FLG_TOPOCTR. Wrap the entire {set_topo + multiple calc_ut + done}
sequence in `with swe_lock():`.

For pure {set_sid_mode + calc_ut} sequences (most chart_engine paths,
muhurtha, transit, horary), no lock needed because sid_mode is constant.

PERFORMANCE:
Lock is uncontended in steady state — single user requests don't race.
Two simultaneous panchangam requests for different cities will serialize
their topo+calc blocks (which take ~10-50ms each). For a low-traffic
prelaunch app this is fine; under load, consider a process pool with
isolated swisseph state per worker.
"""

from __future__ import annotations
import threading

# Reentrant: some swisseph helpers may call others nested. Reentrancy
# avoids deadlock if a helper takes the lock and then calls a function
# that also takes it.
_SWE_LOCK = threading.RLock()


def swe_lock() -> threading.RLock:
    """Return the global swisseph lock.

    Use as a context manager:

        from app.services.swe_lock import swe_lock
        with swe_lock():
            swe.set_topo(lon, lat, 0)
            result, _ = swe.calc_ut(jd, planet, swe.FLG_SIDEREAL | swe.FLG_TOPOCTR)
    """
    return _SWE_LOCK

"""KP Astro API entry point.

PR A1.3-fix-24 — hardened CORS, added in-memory per-IP rate limiter,
request body size cap, global exception handler, structured logging,
/health endpoint, anthropic-key startup assertion.
"""

import logging
import os
import time
import uuid
from collections import deque
from typing import Deque, Dict

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.routers import chart, prediction, feedback
from app.routers import astrologer
from app.routers import muhurtha
from app.routers import compatibility
from app.routers import transit
from app.routers import pdf_export
from app.routers import horary
from app.routers import panchangam
# Phase 1 (2026-06-01) — auth-gated routers per ADR-001/002.
# These return 503 if DB or auth env vars aren't configured (graceful
# degradation; the chart/horary/etc. read-only endpoints still work).
from app.routers import me as me_router
from app.routers import chart_sessions as chart_sessions_router
# Phase 2 Slice 2 (2026-06-02) — CRM clients CRUD. Auth-gated. Returns
# 503 if DB not configured (same graceful-degradation pattern as the
# rest of Phase 1+ endpoints).
from app.routers import clients as clients_router
# Phase 3 Slice 1 (2026-06-02) — client portal (killer differentiator).
# client_portal: PUBLIC GET /c/{slug} — no auth, returns sanitized
#                portal payload for the client to view on their phone.
# client_notes: auth-gated CRUD for the astrologer's per-client notes.
from app.routers import client_portal as client_portal_router
from app.routers import client_notes as client_notes_router

# ════════════════════════════════════════════════════════════════
# Logging — structured-ish single-line records
# ════════════════════════════════════════════════════════════════
# PR A1.3-fix-25d — simplified from fix-24's broken setup. The original
# version pre-set `record.request_id = "-"` via a custom LogRecord factory
# AND passed `extra={"request_id": rid}` from the middleware. Python's
# logging library refuses to overwrite an existing record attribute via
# `extra=`, so EVERY request crashed with
#   KeyError: "Attempt to overwrite 'request_id' in LogRecord"
# That's why `/health` (and all other endpoints) returned 500 in
# production. Verified locally — reproduces 100% of the time.
#
# New approach: format the request_id INTO the message string at log
# time, no `extra=` magic needed. Standard Python logging idiom.
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
_log = logging.getLogger("kp_astro.main")

# ════════════════════════════════════════════════════════════════
# Anthropic key validation at startup (fail fast, not on first request)
# ════════════════════════════════════════════════════════════════
if not os.getenv("ANTHROPIC_API_KEY"):
    _log.warning(
        "ANTHROPIC_API_KEY env var is not set; LLM endpoints will fail. "
        "Set it in your environment before serving traffic."
    )

app = FastAPI(title="KP Astro API", version="0.1.0")

# ════════════════════════════════════════════════════════════════
# CORS — restrict to known origins (was open `*`, allowing any browser
# on any origin to drive paid Anthropic spend).
# ════════════════════════════════════════════════════════════════
# PR A1.3-fix-25b — broadened to fix prod regression where Vercel-hosted
# frontend couldn't reach the Railway backend. fix-24's tight whitelist
# missed the actual frontend deployment URL.
#
# Configuration precedence:
#   1. CORS_ALLOWED_ORIGINS env var (comma-separated explicit list) — takes priority
#   2. CORS_ALLOWED_ORIGIN_REGEX env var (single regex) — for wildcard patterns
#   3. _default_cors below (sensible production + dev defaults including
#      *.vercel.app preview URLs and the production Railway origin)
#
# To lock down further on Railway, set CORS_ALLOWED_ORIGINS to ONLY your
# real production frontend URLs.
_default_cors = ",".join([
    "https://devastroai.up.railway.app",
    "https://devastroai.com",
    "https://www.devastroai.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
])
_cors_origins = [o.strip() for o in os.getenv("CORS_ALLOWED_ORIGINS", _default_cors).split(",") if o.strip()]

# Default regex matches any *.vercel.app subdomain (covers preview deploys
# AND production Vercel URLs without us having to enumerate them). Override
# via CORS_ALLOWED_ORIGIN_REGEX env to restrict further.
_default_cors_regex = r"https://([a-z0-9-]+\.)*vercel\.app"
_cors_regex = os.getenv("CORS_ALLOWED_ORIGIN_REGEX", _default_cors_regex)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=_cors_regex,
    allow_credentials=False,  # not using cookies; set True only if needed
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# ════════════════════════════════════════════════════════════════
# Request body size cap — was unlimited (a 1GB POST could pin a worker)
# ════════════════════════════════════════════════════════════════
_MAX_BODY_BYTES = int(os.getenv("MAX_REQUEST_BODY_BYTES", str(256 * 1024)))  # 256 KB default

def _cors_headers_for(request: Request) -> Dict[str, str]:
    """Compute CORS headers for early-return responses that bypass the
    CORS middleware. Returns {} if origin isn't allowed (browser block
    is correct behavior in that case).

    Used by BodySizeLimit and RequestId middlewares which can return
    error responses BEFORE the request reaches the inner CORS middleware.
    Without these headers, browsers report those errors as "blocked by
    CORS" which is misleading (the actual issue is rate limit / payload
    size / server error).
    """
    origin = request.headers.get("origin", "")
    if not origin:
        return {}
    import re as _re
    allowed = origin in _cors_origins or (
        _cors_regex and _re.match(_cors_regex, origin)
    )
    if not allowed:
        return {}
    return {"Access-Control-Allow-Origin": origin, "Vary": "Origin"}


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject requests whose Content-Length exceeds the cap.

    Doesn't catch chunked-transfer-encoded large bodies (rare in practice
    for our HTTP/JSON traffic). For those, FastAPI's stream consumption
    will eventually OOM. Acceptable trade-off vs. adding starlette-pydantic
    body-streaming logic.
    """
    async def dispatch(self, request: Request, call_next):
        cl = request.headers.get("content-length")
        if cl is not None:
            try:
                if int(cl) > _MAX_BODY_BYTES:
                    return JSONResponse(
                        {"error": "request_too_large",
                         "max_bytes": _MAX_BODY_BYTES},
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        headers=_cors_headers_for(request),
                    )
            except ValueError:
                pass  # malformed header → let FastAPI handle
        return await call_next(request)

app.add_middleware(BodySizeLimitMiddleware)

# ════════════════════════════════════════════════════════════════
# In-memory per-IP rate limiter (no external dep)
# ════════════════════════════════════════════════════════════════
# Sliding-window counter per IP. Resets on process restart (acceptable for
# a single-instance deploy — can revisit Redis-backed when scaling out).
# Limits target the cost-paying endpoints: anything that calls Anthropic.

_RATE_LIMITS: Dict[str, tuple[int, int]] = {
    # path_prefix: (max_requests, window_seconds)
    "/prediction/ask":          (15, 60),
    "/prediction/ask-stream":   (15, 60),
    "/astrologer/analyze":      (20, 60),
    "/astrologer/analyze-stream": (20, 60),
    "/astrologer/quick-insights": (10, 60),
    "/compatibility/analyze":   (15, 60),
    "/muhurtha/analyze":        (15, 60),
    # Phase 3 Slice 4 (2026-06-02) — public client portal endpoint.
    # Per client-portal-spec: 60 req/min per IP. Single endpoint surface
    # so the prefix matches all /c/<uuid> requests. UUID-level dedup
    # would need a custom key extractor (current limiter is IP-based);
    # 60/min/IP is sufficient for v1 — brute-forcing UUID v4 space at
    # that rate is infeasible (centuries to enumerate).
    "/c/":                      (60, 60),
}
# Per-IP request timestamps, deque per limit key
_request_log: Dict[str, Deque[float]] = {}

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-IP sliding-window rate limit on cost-paid endpoints.

    Disabled by setting RATE_LIMIT_ENABLED=0 in env (useful for local dev
    or if you want to disable temporarily without a deploy).
    """
    async def dispatch(self, request: Request, call_next):
        if os.getenv("RATE_LIMIT_ENABLED", "1") != "1":
            return await call_next(request)
        path = request.url.path
        # Find the longest matching prefix
        match = None
        for prefix in _RATE_LIMITS:
            if path.startswith(prefix):
                if match is None or len(prefix) > len(match):
                    match = prefix
        if match is None:
            return await call_next(request)

        # Identify client. X-Forwarded-For first (Railway/Vercel set this),
        # then request.client.host as fallback. Take the first IP in the
        # XFF chain (the original client, not intermediate proxies).
        xff = request.headers.get("x-forwarded-for", "")
        ip = (xff.split(",")[0].strip() if xff else "") or (request.client.host if request.client else "unknown")

        max_req, window = _RATE_LIMITS[match]
        key = f"{match}|{ip}"
        now = time.time()
        dq = _request_log.setdefault(key, deque(maxlen=max_req * 2))
        # Drop expired
        while dq and (now - dq[0]) > window:
            dq.popleft()
        if len(dq) >= max_req:
            retry_after = max(1, int(window - (now - dq[0])))
            _log.warning(
                "rate_limit_block path=%s ip=%s count=%d window=%ds",
                path, ip, len(dq), window,
            )
            # CORS headers must be added manually here — this response is
            # returned BEFORE call_next, so it bypasses the inner CORS
            # middleware. Without these headers, browsers report 429
            # responses as CORS errors (misleading: it's a rate limit,
            # not a CORS misconfig). Only echo the origin if it's
            # plausibly allowed (devastroai.com or *.vercel.app); for
            # other origins fall back to no header (browser will block,
            # which is the correct behavior anyway).
            origin = request.headers.get("origin", "")
            cors_headers: Dict[str, str] = {"Retry-After": str(retry_after)}
            if origin in _cors_origins or (
                _cors_regex and __import__("re").match(_cors_regex, origin)
            ):
                cors_headers["Access-Control-Allow-Origin"] = origin
                cors_headers["Vary"] = "Origin"
            return JSONResponse(
                {"error": "rate_limit_exceeded",
                 "retry_after_seconds": retry_after},
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                headers=cors_headers,
            )
        dq.append(now)
        return await call_next(request)

app.add_middleware(RateLimitMiddleware)

# ════════════════════════════════════════════════════════════════
# Request ID + access logging middleware
# ════════════════════════════════════════════════════════════════
# Every request gets a UUID. It's set on the LogRecord factory so all
# log lines emitted during the request carry the same rid. Returned to
# the client via X-Request-ID for cross-system correlation.
class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
        # Stash on request.state for handlers that want it
        request.state.request_id = rid
        # Make the rid visible on log records emitted during this request
        # by binding via the LogRecord factory — but Python loggers don't
        # have a clean per-request context without contextvars. Simplest:
        # pass rid through extra= when handlers log explicitly. For the
        # access log line below we attach manually.
        start = time.time()
        try:
            response = await call_next(request)
        except Exception as exc:
            duration_ms = int((time.time() - start) * 1000)
            # PR A1.3-fix-25d — inline rid in message (was extra= which crashed)
            _log.exception(
                "rid=%s unhandled_exception path=%s method=%s duration_ms=%d",
                rid, request.url.path, request.method, duration_ms,
            )
            # 2026-06-02: CORS headers must be added here too — this 500
            # response bypasses the inner CORS middleware (because the
            # exception interrupted the response chain). Without these
            # headers, ANY backend exception manifests in the browser as
            # "blocked by CORS" instead of "internal server error" —
            # making it impossible to debug from devtools.
            err_headers = _cors_headers_for(request)
            err_headers["X-Request-ID"] = rid
            return JSONResponse(
                {"error": "internal_server_error", "request_id": rid},
                status_code=500,
                headers=err_headers,
            )
        duration_ms = int((time.time() - start) * 1000)
        # PR A1.3-fix-25d — inline rid in message (was extra= which crashed)
        _log.info(
            "rid=%s %s %s -> %d (%dms)",
            rid, request.method, request.url.path, response.status_code, duration_ms,
        )
        response.headers["X-Request-ID"] = rid
        return response

app.add_middleware(RequestIdMiddleware)

# ════════════════════════════════════════════════════════════════
# Routers
# ════════════════════════════════════════════════════════════════
app.include_router(chart.router, prefix="/chart", tags=["Chart"])
app.include_router(prediction.router, prefix="/prediction", tags=["Prediction"])
app.include_router(feedback.router, prefix="/feedback", tags=["Feedback"])
app.include_router(astrologer.router, prefix="/astrologer", tags=["astrologer"])
app.include_router(muhurtha.router, prefix="/muhurtha", tags=["Muhurtha"])
app.include_router(compatibility.router, prefix="/compatibility", tags=["Compatibility"])
app.include_router(transit.router, prefix="/transit", tags=["Transit"])
app.include_router(pdf_export.router, prefix="/pdf", tags=["PDF"])
app.include_router(horary.router, prefix="/horary", tags=["Horary"])
app.include_router(panchangam.router, prefix="/panchangam", tags=["Panchangam"])
# Phase 1 — auth-gated routes (per ADR-001/002).
app.include_router(me_router.router, prefix="/me", tags=["Astrologer Profile"])
app.include_router(
    chart_sessions_router.router,
    prefix="/chart-sessions",
    tags=["Chart Sessions"],
)
app.include_router(
    clients_router.router,
    prefix="/clients",
    tags=["Clients"],
)
# Phase 3 — client notes (auth-gated) mounted at /clients/{id}/notes
# (the router already includes the {client_id}/notes path prefix).
app.include_router(
    client_notes_router.router,
    prefix="/clients",
    tags=["Client Notes"],
)
# Phase 3 — public client portal at /c/{portal_slug}
app.include_router(
    client_portal_router.router,
    prefix="/c",
    tags=["Client Portal (Public)"],
)


@app.get("/")
def health_check():
    return {"status": "KP Astro API is running"}


# PR F2 (Phase A foundation) — process start time for uptime tracking
import time as _time
_PROCESS_START_TIME = _time.time()


@app.get("/health")
async def health():
    """Deep health check (PR F2 — Phase A foundation).

    Exercises the critical paths so UptimeRobot can distinguish
    "process running" from "backend actually functional." Designed to
    be safe to call every 5 minutes without cost or load impact.

    Checks:
      ephemeris      — swisseph can compute a planet position
      chart_compute  — chart_engine can build a real chart
      anthropic_key  — env var is set (does NOT call the API)
      database       — round-trips a SELECT 1 (async, in current loop)
      auth           — SUPABASE env vars set
      version        — git commit info

    HOTFIX 2026-06-02: was a sync handler that used
    asyncio.new_event_loop() + run_until_complete() to call the async
    DB engine. This corrupts the shared SQLAlchemy async engine's
    asyncpg connection pool because asyncpg connections are bound to
    the loop they were created on — running them in a DIFFERENT loop
    (and closing that loop) leaves the engine's pool referencing
    closed loops. Subsequent requests from the main FastAPI loop that
    use the engine then throw low-level errors that bypass CORS
    middleware → browser sees "no Access-Control-Allow-Origin" →
    blocked. EVERY auth-gated DB endpoint became unusable after
    Railway's uptime probe hit /health a few times.

    Fix: make /health itself async so it runs IN the same event loop
    as everything else. Use the engine directly via async-with — no
    loop manipulation.

    Status code:
      200 — fully ok or degraded (non-critical issue)
      503 — DOWN (a critical check failed; UptimeRobot alerts)
    """
    from datetime import datetime as _dt
    from fastapi import Response
    import json as _json

    checks: dict = {}

    # Check 1 — ephemeris: can swisseph compute a sidereal position?
    # If ephemeris files are missing or swisseph is broken, this errors out.
    # CRITICAL — without this, no chart can be generated.
    try:
        import swisseph as _swe
        _swe.set_sid_mode(_swe.SIDM_KRISHNAMURTI_VP291)
        # Use a fixed test JD (2000-01-01 12:00 UT) so the result is
        # deterministic + comparable across deploys.
        _test_jd = 2451545.0
        _sun_pos, _ = _swe.calc_ut(_test_jd, _swe.SUN, _swe.FLG_SIDEREAL)
        _sun_lon = round(_sun_pos[0], 2)
        checks["ephemeris"] = {
            "status": "ok",
            "detail": f"Sun sidereal lon at J2000 = {_sun_lon}°",
        }
    except Exception as e:
        checks["ephemeris"] = {
            "status": "fail",
            "detail": f"swisseph failure: {type(e).__name__}: {str(e)[:120]}",
        }

    # Check 2 — chart_compute: end-to-end chart generation works?
    # Tests the full chart_engine path with a fixed input.
    # CRITICAL — if this fails, /chart/generate is broken.
    try:
        from app.services.chart_engine import generate_chart as _gen
        _test_chart = _gen(
            date="2000-09-09",
            time="12:31",
            latitude=16.2378,
            longitude=80.6464,
            timezone_offset=5.5,
        )
        _cusp_count = len(_test_chart.get("cusps", []))
        _planet_count = len(_test_chart.get("planets", {}))
        if _cusp_count == 12 and _planet_count >= 9:
            checks["chart_compute"] = {
                "status": "ok",
                "detail": f"{_cusp_count} cusps + {_planet_count} planets generated",
            }
        else:
            checks["chart_compute"] = {
                "status": "fail",
                "detail": f"unexpected output: {_cusp_count} cusps, {_planet_count} planets",
            }
    except Exception as e:
        checks["chart_compute"] = {
            "status": "fail",
            "detail": f"chart_engine failure: {type(e).__name__}: {str(e)[:120]}",
        }

    # Check 3 — anthropic_key: env var is set?
    # NON-CRITICAL — chart still works without AI. We do NOT make a live
    # API call (would cost money on every health check + add latency).
    _anthropic_set = bool(os.getenv("ANTHROPIC_API_KEY"))
    checks["anthropic_key"] = {
        "status": "ok" if _anthropic_set else "fail",
        "detail": "key configured" if _anthropic_set else "ANTHROPIC_API_KEY not set",
    }

    # Check 4 (Phase 1, fixed 2026-06-02) — database: round-trip a
    # SELECT 1 to verify the connection works. Runs in the same event
    # loop as the rest of FastAPI (no asyncio.new_event_loop tricks —
    # those corrupt the engine's connection pool).
    # NON-CRITICAL while we phase auth/DB in — read-only chart
    # endpoints still serve traffic without DB.
    try:
        from app.config import get_settings as _gs
        _settings = _gs()
        if not _settings.database_configured:
            checks["database"] = {
                "status": "fail",
                "detail": "DATABASE_URL not set (auth-gated endpoints will 503)",
            }
        else:
            # Lazy import so health endpoint doesn't pay engine creation
            # cost when DB isn't configured.
            from app.db.engine import get_engine as _ge
            from sqlalchemy import text as _text
            try:
                eng = _ge()
                async with eng.connect() as conn:
                    result = await conn.execute(_text("SELECT 1"))
                    _val = result.scalar()
                checks["database"] = {
                    "status": "ok" if _val == 1 else "fail",
                    "detail": f"SELECT 1 returned {_val}",
                }
            except Exception as e:
                checks["database"] = {
                    "status": "fail",
                    "detail": f"DB query failed: {type(e).__name__}: {str(e)[:120]}",
                }
    except Exception as e:
        checks["database"] = {
            "status": "fail",
            "detail": f"DB check setup failed: {type(e).__name__}: {str(e)[:120]}",
        }

    # Check 5 (Phase 1) — auth: SUPABASE_JWT_SECRET is set?
    # NON-CRITICAL — auth-gated endpoints return 503 if missing; read-only
    # endpoints unaffected.
    try:
        from app.config import get_settings as _gs2
        _settings2 = _gs2()
        # auth_configured now only requires SUPABASE_URL (JWKS URL derived
        # from it covers the new asymmetric flow). JWT_SECRET is optional —
        # only needed for legacy HS256 tokens. Surface both states in detail.
        if _settings2.auth_configured:
            has_secret = bool(_settings2.SUPABASE_JWT_SECRET)
            detail = (
                "SUPABASE_URL configured (asymmetric JWKS flow active)"
                + (" + legacy HS256 secret available" if has_secret else "")
            )
            checks["auth"] = {"status": "ok", "detail": detail}
        else:
            checks["auth"] = {
                "status": "fail",
                "detail": "SUPABASE_URL unset (auth-gated endpoints will 503)",
            }
    except Exception as e:
        checks["auth"] = {
            "status": "fail",
            "detail": f"auth config check failed: {type(e).__name__}",
        }

    # Decide overall status + HTTP code.
    # CRITICAL checks: ephemeris, chart_compute (the app fundamentally
    # cannot serve charts without these).
    # NON-CRITICAL: anthropic_key, database, auth (degrade gracefully —
    # subsets of endpoints fail with informative errors).
    critical_failed = any(
        checks[c]["status"] == "fail" for c in ("ephemeris", "chart_compute")
    )
    non_critical_failed = any(
        checks[c]["status"] == "fail" for c in ("anthropic_key", "database", "auth")
    )

    if critical_failed:
        overall_status = "down"
        http_code = 503
    elif non_critical_failed:
        overall_status = "degraded"
        http_code = 200
    else:
        overall_status = "ok"
        http_code = 200

    body = {
        "status": overall_status,
        "checks": checks,
        "version": "0.1.0",
        "commit": (
            os.getenv("RAILWAY_GIT_COMMIT_SHA")
            or os.getenv("RAILWAY_GIT_COMMIT_MESSAGE")
            or "unknown"
        )[:12],  # short sha
        "uptime_seconds": int(_time.time() - _PROCESS_START_TIME),
        "timestamp": _dt.utcnow().isoformat() + "Z",
    }

    return Response(
        content=_json.dumps(body),
        media_type="application/json",
        status_code=http_code,
    )


# ════════════════════════════════════════════════════════════════
# /version — Phase 13.6
# ════════════════════════════════════════════════════════════════
# Returns the current deployed git commit + a stamp of which cost-control
# features are active. Hit this from the browser:
#   https://devastroai.up.railway.app/version
# to verify the latest cost-fix commits are LIVE on Railway, not just
# pushed to GitHub. Railway env vars RAILWAY_GIT_COMMIT_SHA +
# RAILWAY_GIT_BRANCH are auto-injected on every deploy.
# ════════════════════════════════════════════════════════════════
@app.get("/version")
def version():
    return {
        "commit": (os.getenv("RAILWAY_GIT_COMMIT_SHA")
                   or os.getenv("RAILWAY_GIT_COMMIT_MESSAGE")
                   or "unknown"),
        "branch": os.getenv("RAILWAY_GIT_BRANCH") or "unknown",
        "deployed_at": os.getenv("RAILWAY_DEPLOYMENT_DRAINING_SECONDS") or "unknown",
        # Phase markers — flip these as features ship so we can verify
        # via /version which cost-fix commits are actually running.
        "cost_features": {
            "phase_13_1_quick_insights_410": True,
            "phase_13_2_anthropic_audit_log": True,
            "phase_13_3_cache_prefix_reorder": True,
            "phase_13_4_haiku_followup": True,
            "phase_13_5_topic_switch_detect": True,
            "phase_13_6_chart_uncached_max_tokens_4000": True,
        },
    }

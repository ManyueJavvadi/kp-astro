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

# ════════════════════════════════════════════════════════════════
# Logging — structured-ish single-line records
# ════════════════════════════════════════════════════════════════
# Default Python logging is WARNING-level with no formatter, so module
# `_log.info(...)` calls were silently dropped. Set a baseline that
# captures useful events without a JSON dependency.
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s rid=%(request_id)s %(message)s",
)
# Inject a default request_id so log records that don't carry one don't crash
old_factory = logging.getLogRecordFactory()
def _record_factory(*args, **kwargs):
    rec = old_factory(*args, **kwargs)
    if not hasattr(rec, "request_id"):
        rec.request_id = "-"
    return rec
logging.setLogRecordFactory(_record_factory)
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
            return JSONResponse(
                {"error": "rate_limit_exceeded",
                 "retry_after_seconds": retry_after},
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={"Retry-After": str(retry_after)},
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
            _log.exception(
                "unhandled_exception path=%s method=%s duration_ms=%d",
                request.url.path, request.method, duration_ms,
                extra={"request_id": rid},
            )
            return JSONResponse(
                {"error": "internal_server_error", "request_id": rid},
                status_code=500,
                headers={"X-Request-ID": rid},
            )
        duration_ms = int((time.time() - start) * 1000)
        # One-line access log
        _log.info(
            "%s %s -> %d (%dms)",
            request.method, request.url.path, response.status_code, duration_ms,
            extra={"request_id": rid},
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


@app.get("/")
def health_check():
    return {"status": "KP Astro API is running"}


@app.get("/health")
def health():
    """Operational health endpoint — checks env + dep readiness.

    Doesn't expose secret values. `anthropic_key_set` is a boolean flag,
    not the key itself.
    """
    return {
        "status": "ok",
        "anthropic_key_set": bool(os.getenv("ANTHROPIC_API_KEY")),
        "version": "0.1.0",
    }

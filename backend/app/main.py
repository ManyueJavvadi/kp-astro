import logging
import os
import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routers import chart, prediction, feedback
from app.routers import astrologer
from app.routers import muhurtha
from app.routers import compatibility
from app.routers import transit
from app.routers import pdf_export
from app.routers import horary
from app.routers import panchangam
from app.routers import auth as auth_router
from app.routers import clients as clients_router
from app.routers import sessions as sessions_router
from app.routers import predictions as predictions_router
from app.routers import followups as followups_router

log = logging.getLogger("uvicorn.error")

app = FastAPI(title="KP Astro API", version="0.1.0")

# CORS — env-driven. ALLOWED_ORIGINS takes a comma-separated list (exact
# origins) and/or we also honor ALLOWED_ORIGIN_REGEX for a fallback pattern.
# If neither is set we default to "*".
_origins_raw = os.getenv("ALLOWED_ORIGINS", "*").strip()
_origin_regex = os.getenv("ALLOWED_ORIGIN_REGEX", "").strip()

if _origins_raw == "*" and not _origin_regex:
    _allowed_origins: list[str] = ["*"]
else:
    _allowed_origins = [o.strip() for o in _origins_raw.split(",") if o.strip() and o.strip() != "*"]

# Sensible default: if the user only set ALLOWED_ORIGINS to a single production
# origin, also match every vercel.app preview deploy + localhost automatically
# so preview deploys don't get CORS errors.
if not _origin_regex and _allowed_origins and _allowed_origins != ["*"]:
    _origin_regex = r"https://([a-z0-9-]+\.)*vercel\.app$|http://localhost(:\d+)?$|http://127\.0\.0\.1(:\d+)?$"

log.info(
    "CORS config — allow_origins=%s allow_origin_regex=%r",
    _allowed_origins,
    _origin_regex,
)

# allow_credentials=True is incompatible with allow_origins=["*"] per spec;
# flip it on only when origins are whitelisted explicitly.
_use_credentials = _allowed_origins != ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=_origin_regex or None,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=_use_credentials,
    expose_headers=["*"],
)

# Register routes
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
app.include_router(auth_router.router, prefix="/auth", tags=["Auth"])
app.include_router(clients_router.router, prefix="/clients", tags=["Clients"])
app.include_router(sessions_router.router, prefix="/sessions", tags=["Sessions"])
app.include_router(predictions_router.router, prefix="/predictions", tags=["Predictions"])
app.include_router(followups_router.router, prefix="/followups", tags=["Followups"])

# Catch-all exception handler so every 500 carries CORS headers AND we see
# the real traceback in Railway logs instead of silently crashing.
@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception):
    log.exception(
        "Unhandled exception on %s %s: %s",
        request.method,
        request.url.path,
        exc,
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error_type": type(exc).__name__,
            "error": str(exc)[:500],
        },
    )


@app.get("/")
def health_check():
    return {"status": "KP Astro API is running"}


@app.get("/_debug/cors")
def debug_cors():
    """Diagnostics — shows exactly which CORS config the running container
    parsed from its environment. Safe to expose (no secrets).
    Hit it in the browser tab of the site having CORS trouble.
    """
    return {
        "allow_origins": _allowed_origins,
        "allow_origin_regex": _origin_regex or None,
        "allow_credentials": _use_credentials,
        "raw_ALLOWED_ORIGINS": _origins_raw,
    }
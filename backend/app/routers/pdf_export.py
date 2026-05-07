import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
# Phase 14 / PR A — pdf_engine_v2 produces a 30-50 page deterministic
# KP report (cover, charts, planets, cusps with CSL chains, RPs, 4-level
# significators, per-house verdict, dasha trees, Tara Chakra, vargottama,
# borderline CSL, glossary). Zero LLM cost. The legacy 3-page
# `pdf_engine.generate_pdf` is kept untouched for any future "Quick PDF"
# fallback but no longer wired here.
from app.services.pdf_engine_v2 import generate_pdf_v2

router = APIRouter()
_log = logging.getLogger("pdf_export")


# PR A1.3-fix-24 — workspace dict bounded by global 256KB body cap in
# main.py. Added try/except so PDF engine errors don't 500-with-stack-trace
# (was leaking internal paths).
class PdfRequest(BaseModel):
    workspace: dict


@router.post("/export")
def export_pdf(request: PdfRequest):
    try:
        pdf_bytes = generate_pdf_v2(request.workspace)
    except Exception as e:
        _log.exception("pdf_generate failed: %s", e)
        raise HTTPException(status_code=422, detail="pdf_generation_failed")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=kp_chart_report.pdf"},
    )

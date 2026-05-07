import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from app.services.pdf_engine import generate_pdf

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
        pdf_bytes = generate_pdf(request.workspace)
    except Exception as e:
        _log.exception("pdf_generate failed: %s", e)
        raise HTTPException(status_code=422, detail="pdf_generation_failed")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=kp_chart_report.pdf"},
    )

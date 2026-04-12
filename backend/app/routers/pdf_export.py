from fastapi import APIRouter
from fastapi.responses import Response
from pydantic import BaseModel
from app.services.pdf_engine import generate_pdf

router = APIRouter()


class PdfRequest(BaseModel):
    workspace: dict


@router.post("/export")
def export_pdf(request: PdfRequest):
    pdf_bytes = generate_pdf(request.workspace)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=kp_chart_report.pdf"},
    )

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import chart, prediction, feedback
from app.routers import astrologer
from app.routers import muhurtha
from app.routers import compatibility
from app.routers import transit
from app.routers import pdf_export
from app.routers import horary
from app.routers import panchangam

app = FastAPI(title="KP Astro API", version="0.1.0")

# This allows your frontend to talk to your backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
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

@app.get("/")
def health_check():
    return {"status": "KP Astro API is running"}
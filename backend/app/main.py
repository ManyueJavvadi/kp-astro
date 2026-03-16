from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import chart, prediction, feedback

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

@app.get("/")
def health_check():
    return {"status": "KP Astro API is running"}
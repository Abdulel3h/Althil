# Main FastAPI Application
from fastapi import FastAPI, UploadFile, File, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel
import uvicorn
import os

from .services.analysis_service import get_sun_data, calculate_heat_score, generate_shade_recommendations, simulate_urban_density
from .services.image_service import analyze_urban_image
from .services.report_service import generate_analysis_pdf

app = FastAPI(title="al'thil API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")


class LocationRequest(BaseModel):
    lat: float
    lng: float


class ReportRequest(BaseModel):
    location: dict
    sun_data: dict
    heat_analysis: dict
    recommendations: dict
    image_analysis: dict = None


@app.get("/", response_class=HTMLResponse)
async def serve_index():
    with open(os.path.join(BASE_DIR, "templates", "index.html"), "r", encoding="utf-8") as f:
        return f.read()


@app.get("/report", response_class=HTMLResponse)
async def serve_report():
    with open(os.path.join(BASE_DIR, "templates", "report.html"), "r", encoding="utf-8") as f:
        return f.read()


@app.post("/analyze")
def run_analysis(location: LocationRequest):
    print(f"DEBUG: Received analysis request for {location}")
    # Get sun data
    try:
        sun_data = get_sun_data(location.lat, location.lng)
        print(f"DEBUG: Sun data: {sun_data}")
    except Exception as e:
        print(f"ERROR in get_sun_data: {e}")
        raise e

    
    # Simulate urban density based on location (deterministic)
    urban_density = simulate_urban_density(location.lat, location.lng)
    
    # Calculate heat score using both sun altitude and simulated urban density
    heat_analysis = calculate_heat_score(sun_data["altitude"], urban_density)
    
    # Generate recommendations based on sun altitude and heat score
    recommendations = generate_shade_recommendations(
        location.lat,
        location.lng,
        sun_data["altitude"],
        heat_analysis["heat_score"]
    )
    
    # Include urban density in the response for reporting / image analysis integration
    return {
        "status": "success",
        "location": {"lat": location.lat, "lng": location.lng},
        "sun_data": sun_data,
        "heat_analysis": heat_analysis,
        "urban_density": urban_density,
        "recommendations": recommendations
    }


@app.post("/analyze-image")
async def upload_image(file: UploadFile = File(...)):
    contents = await file.read()
    result = analyze_urban_image(contents)
    return result


@app.post("/generate-report")
async def generate_report(data: ReportRequest):
    pdf_bytes = generate_analysis_pdf(data.dict())
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=althil_report.pdf"}
    )


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)

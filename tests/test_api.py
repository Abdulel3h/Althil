"""API tests for the FastAPI application."""

import cv2
import numpy as np
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
LOCATION = {"lat": 24.7136, "lng": 46.6753}


def test_map_and_report_pages_are_served():
    index = client.get("/")
    assert index.status_code == 200
    assert "id=\"map\"" in index.text

    report = client.get("/report")
    assert report.status_code == 200
    assert "report-content" in report.text

    assert client.get("/static/script.js").status_code == 200


def test_analyze_returns_sun_heat_and_recommendations():
    response = client.post("/analyze", json=LOCATION)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["location"] == LOCATION
    assert {"altitude", "azimuth", "timestamp"} <= body["sun_data"].keys()
    assert body["heat_analysis"]["risk_level"] in {"Low", "Moderate", "High"}
    assert len(body["recommendations"]["recommendations"]) == 3


def test_analyze_rejects_missing_coordinates():
    assert client.post("/analyze", json={"lat": 24.7}).status_code == 422


def test_analyze_image_accepts_an_upload():
    image = np.full((32, 32, 3), 128, dtype=np.uint8)
    _, encoded = cv2.imencode(".png", image)
    response = client.post(
        "/analyze-image",
        files={"file": ("site.png", encoded.tobytes(), "image/png")},
    )
    assert response.status_code == 200
    assert response.json()["urban_density"] == 100.0


def test_generate_report_returns_a_pdf():
    analysis = client.post("/analyze", json=LOCATION).json()
    response = client.post("/generate-report", json=analysis)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")


def test_agent_needs_a_selected_location():
    response = client.post("/agent/query", json={"query": "Where should we add shade?", "context": {}})
    assert response.status_code == 200
    assert response.json()["optional_actions"] == {}


def test_agent_highlights_the_selected_location():
    response = client.post(
        "/agent/query",
        json={"query": "Where should we add shade?", "context": {"selected_location": LOCATION}},
    )
    body = response.json()
    assert body["optional_actions"]["highlight_zone"]["radius"] == 150
    assert "24.7136" in body["agent_message"]


def test_cors_allows_configured_origin_only():
    allowed = client.options(
        "/analyze",
        headers={"Origin": "http://localhost:5500", "Access-Control-Request-Method": "POST"},
    )
    assert allowed.headers.get("access-control-allow-origin") == "http://localhost:5500"

    blocked = client.options(
        "/analyze",
        headers={"Origin": "https://example.com", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in blocked.headers

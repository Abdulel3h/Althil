"""Unit tests for the analysis, image and report services."""

import cv2
import numpy as np
import pytest

from app.services.analysis_service import (
    calculate_heat_score,
    generate_shade_recommendations,
    get_sun_data,
    simulate_urban_density,
)
from app.services.image_service import analyze_urban_image
from app.services.report_service import generate_analysis_pdf

RIYADH = (24.7136, 46.6753)


def _png(bgr: tuple, size: int = 64) -> bytes:
    image = np.zeros((size, size, 3), dtype=np.uint8)
    image[:] = bgr
    ok, encoded = cv2.imencode(".png", image)
    assert ok
    return encoded.tobytes()


def test_sun_data_has_altitude_azimuth_and_timestamp():
    sun = get_sun_data(*RIYADH)
    assert -90 <= sun["altitude"] <= 90
    assert 0 <= sun["azimuth"] <= 360
    assert sun["timestamp"].endswith("+00:00")


def test_urban_density_is_deterministic_and_bounded():
    first = simulate_urban_density(*RIYADH)
    assert first == simulate_urban_density(*RIYADH)
    assert 20 <= first <= 80


@pytest.mark.parametrize(
    "altitude, density, expected",
    [(90, 80, "High"), (60, 50, "Moderate"), (-10, 20, "Low")],
)
def test_heat_score_risk_levels(altitude, density, expected):
    result = calculate_heat_score(altitude, density)
    assert result["risk_level"] == expected
    assert 0 <= result["heat_score"] <= 100


def test_heat_score_weights_sun_and_density():
    # sun factor 99 * 0.6 + density factor 40 * 0.4
    result = calculate_heat_score(90, 80)
    assert result["heat_score"] == 75.4
    assert result["sun_contribution"] == 99.0
    assert result["urban_contribution"] == 40.0


@pytest.mark.parametrize(
    "altitude, primary",
    [(70, "Horizontal Canopy Structure"), (45, "Angled Shade Sail"), (10, "Vertical Green Wall")],
)
def test_solution_type_follows_sun_altitude(altitude, primary):
    result = generate_shade_recommendations(*RIYADH, altitude, 50)
    assert result["summary"]["primary_solution"] == primary
    assert result["recommendations"][0]["type"] == primary


def test_recommendation_points_stay_near_the_selected_location():
    lat, lng = RIYADH
    result = generate_shade_recommendations(lat, lng, 65, 80)
    points = result["recommendations"]
    assert len(points) == 3
    for point in points:
        assert abs(point["lat"] - lat) <= 0.0005
        assert abs(point["lon"] - lng) <= 0.0005
    assert result["summary"]["cooling_potential"] == "Very High"


def test_image_analysis_reads_vegetation():
    result = analyze_urban_image(_png((40, 180, 40)))
    assert result["green_coverage"] == 100.0
    assert result["shade_need"] == "Low"


def test_image_analysis_reads_grey_surfaces():
    result = analyze_urban_image(_png((128, 128, 128)))
    assert result["urban_density"] == 100.0
    assert result["shade_need"] == "Critical"
    assert result["heat_island_risk"] == "Very High"


def test_image_analysis_rejects_undecodable_bytes():
    assert analyze_urban_image(b"not an image") == {"error": "Could not decode image"}


def test_report_is_a_pdf():
    sun = get_sun_data(*RIYADH)
    heat = calculate_heat_score(sun["altitude"], 50)
    pdf = generate_analysis_pdf({
        "location": {"lat": RIYADH[0], "lng": RIYADH[1]},
        "sun_data": sun,
        "heat_analysis": heat,
        "recommendations": generate_shade_recommendations(*RIYADH, sun["altitude"], heat["heat_score"]),
        "image_analysis": analyze_urban_image(_png((128, 128, 128))),
    })
    assert pdf.startswith(b"%PDF")

# Image Service - Basic urban image analysis
import cv2
import numpy as np
from typing import Tuple


def analyze_urban_image(image_bytes: bytes) -> dict:
    """
    Analyze an urban image to detect surface types.
    Returns percentages of green, gray (urban), and open areas.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return {"error": "Could not decode image"}
    
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    total_pixels = img.shape[0] * img.shape[1]
    
    # Detect green areas (vegetation)
    lower_green = np.array([35, 40, 40])
    upper_green = np.array([85, 255, 255])
    green_mask = cv2.inRange(hsv, lower_green, upper_green)
    green_pixels = cv2.countNonZero(green_mask)
    green_ratio = (green_pixels / total_pixels) * 100
    
    # Detect gray areas (urban surfaces - asphalt, concrete)
    lower_gray = np.array([0, 0, 50])
    upper_gray = np.array([180, 50, 200])
    gray_mask = cv2.inRange(hsv, lower_gray, upper_gray)
    gray_pixels = cv2.countNonZero(gray_mask)
    urban_ratio = (gray_pixels / total_pixels) * 100
    
    # Calculate open/other areas
    open_ratio = 100 - green_ratio - urban_ratio
    open_ratio = max(0, open_ratio)
    
    # Generate assessment
    if urban_ratio > 50:
        shade_need = "Critical"
        heat_island_risk = "Very High"
    elif urban_ratio > 30:
        shade_need = "High"
        heat_island_risk = "High"
    elif green_ratio > 40:
        shade_need = "Low"
        heat_island_risk = "Low"
    else:
        shade_need = "Moderate"
        heat_island_risk = "Moderate"
    
    return {
        "green_coverage": round(green_ratio, 1),
        "urban_density": round(urban_ratio, 1),
        "open_areas": round(open_ratio, 1),
        "shade_need": shade_need,
        "heat_island_risk": heat_island_risk,
        "recommendation": _generate_image_recommendation(green_ratio, urban_ratio)
    }


def _generate_image_recommendation(green_ratio: float, urban_ratio: float) -> str:
    """Generate a text recommendation based on image analysis."""
    if urban_ratio > 50:
        return "High urban density detected. Priority intervention required: Install shade structures and plant heat-resistant native trees."
    elif urban_ratio > 30 and green_ratio < 20:
        return "Moderate urban surface with low vegetation. Recommended: Add tree clusters and permeable ground cover."
    elif green_ratio > 40:
        return "Good vegetation coverage. Maintain current green infrastructure. Consider adding shade connectors between green zones."
    else:
        return "Mixed surface detected. Recommended: Strategic tree placement along pedestrian pathways."

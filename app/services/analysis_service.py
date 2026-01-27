# Analysis Service - Rule-based ML logic for shade planning
import datetime
import random
from pysolar.solar import get_altitude, get_azimuth

# Simple deterministic simulation of urban density based on location
def simulate_urban_density(lat: float, lon: float) -> float:
    """Return a pseudo‑random urban density (0‑100) based on lat/lon.
    The calculation is deterministic so the same coordinates always yield the same
    value, which is useful for a reproducible prototype.
    """
    # Create a simple seed from coordinates
    seed = int((abs(lat) * 1000 + abs(lon) * 1000)) % 100
    random.seed(seed)
    # Produce a density between 20 and 80 percent
    return 20 + random.random() * 60



def get_sun_data(lat: float, lon: float) -> dict:
    """Calculate real sun position data."""
    date = datetime.datetime.now(datetime.timezone.utc)
    altitude = get_altitude(lat, lon, date)
    azimuth = get_azimuth(lat, lon, date)
    return {
        "altitude": round(altitude, 2),
        "azimuth": round(azimuth, 2),
        "timestamp": date.isoformat()
    }


def calculate_heat_score(sun_altitude: float, urban_density: float = 50.0) -> dict:
    """
    Calculate a simulated heat score based on sun altitude and urban density.
    Returns a score 0-100 and a risk level.
    """
    # Base score from sun altitude (higher sun = more heat)
    sun_factor = max(0, min(100, sun_altitude * 1.1))
    
    # Urban density factor (more concrete = more heat retention)
    density_factor = urban_density * 0.5
    
    # Combined score
    heat_score = min(100, (sun_factor * 0.6) + (density_factor * 0.4))
    
    if heat_score > 70:
        risk_level = "High"
    elif heat_score > 40:
        risk_level = "Moderate"
    else:
        risk_level = "Low"
    
    return {
        "heat_score": round(heat_score, 1),
        "risk_level": risk_level,
        "sun_contribution": round(sun_factor, 1),
        "urban_contribution": round(density_factor, 1)
    }


def generate_shade_recommendations(lat: float, lon: float, sun_altitude: float, heat_score: float) -> list:
    """
    Generate shade solution recommendations based on analysis.
    Rule-based logic for prototype.
    """
    recommendations = []
    
    # Determine solution type based on sun altitude
    if sun_altitude > 60:
        primary_solution = "Horizontal Canopy Structure"
        secondary_solution = "Dense Tree Canopy (e.g., Ghaf, Sidra)"
    elif sun_altitude > 30:
        primary_solution = "Angled Shade Sail"
        secondary_solution = "Medium Tree Coverage"
    else:
        primary_solution = "Vertical Green Wall"
        secondary_solution = "Tall Trees for Side Shade"
    
    # Calculate cooling potential based on heat score
    if heat_score > 70:
        cooling_potential = "Very High"
        tree_count = random.randint(8, 12)
    elif heat_score > 40:
        cooling_potential = "High"
        tree_count = random.randint(4, 7)
    else:
        cooling_potential = "Moderate"
        tree_count = random.randint(2, 4)
    
    # Generate 3 recommendation points around the clicked location
    for i in range(3):
        offset_lat = lat + random.uniform(-0.0005, 0.0005)
        offset_lon = lon + random.uniform(-0.0005, 0.0005)
        
        recommendations.append({
            "id": i + 1,
            "lat": round(offset_lat, 6),
            "lon": round(offset_lon, 6),
            "type": primary_solution if i == 0 else secondary_solution,
            "cooling_potential": cooling_potential,
            "estimated_temp_reduction": f"{random.randint(3, 8)} C (Estimated)",
            "description": f"Recommended placement for {primary_solution if i == 0 else secondary_solution}"
        })
    
    return {
        "recommendations": recommendations,
        "summary": {
            "primary_solution": primary_solution,
            "secondary_solution": secondary_solution,
            "estimated_tree_count": tree_count,
            "cooling_potential": cooling_potential
        }
    }

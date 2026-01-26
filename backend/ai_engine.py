import cv2
import numpy as np
import datetime
import random
from pysolar.solar import get_altitude, get_azimuth

# --- 1. وظائف تحليل الموقع والشمس ---

def get_sun_data(lat, lon):
    """
    تحسب الارتفاع والزاوية الحقيقية للشمس في الوقت الحالي
    """
    date = datetime.datetime.now(datetime.timezone.utc)
    altitude = get_altitude(lat, lon, date)
    azimuth = get_azimuth(lat, lon, date)
    # إعادة القيم مع تقريبها لمنزلتين عشريتين
    return round(altitude, 2), round(azimuth, 2)

def generate_visual_solutions(lat, lon, sun_altitude):
    """
    توليد نقاط مقترحة (دوائر) لرسمها على الخريطة بناءً على زاوية الشمس
    """
    recommendations = []
    
    # تحديد نوع الحل الهندسي بناءً على ارتفاع الشمس
    # إذا كانت الشمس عالية (فوق 45 درجة) نحتاج مظلات أفقية، وإلا نحتاج مصدات عمودية
    solution_type = "Reflective Overhead Canopy" if sun_altitude > 45 else "Vertical Shading / Green Wall"
    cooling_effect = "Very High" if sun_altitude > 45 else "High"

    # إنشاء 3 نقاط مقترحة حول المركز الذي ضغط عليه المستخدم
    for i in range(3):
        # إضافة إزاحة عشوائية بسيطة للإحداثيات لتوزيع النقاط
        offset_lat = lat + (random.uniform(-0.0006, 0.0006))
        offset_lon = lon + (random.uniform(-0.0006, 0.0006))
        
        recommendations.append({
            "id": i,
            "lat": offset_lat,
            "lon": offset_lon,
            "type": solution_type,
            "cooling_score": cooling_effect,
            # نصيحة ديناميكية تظهر في الـ Popup
            "description": f"Optimal placement for {solution_type} based on current sun altitude of {int(sun_altitude)}°."
        })
        
    return recommendations

# --- 2. وظائف تحليل الصور ---

def analyze_image_colors(image_bytes):
    """
    تحليل بسيط للصورة لحساب نسبة اللون الرمادي (مؤشر على الأسفلت/الخرسانة)
    """
    # تحويل البيانات الخام إلى صورة
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None: return {"error": "Could not decode image"}

    # التحويل إلى فضاء ألوان HSV ليسهل عزل الألوان
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # تحديد نطاق اللون الرمادي (يمكن تعديله حسب الحاجة)
    lower_gray = np.array([0, 0, 50])
    upper_gray = np.array([180, 50, 200])
    
    # إنشاء قناع (Mask) للمناطق الرمادية
    mask = cv2.inRange(hsv, lower_gray, upper_gray)
    
    # حساب النسبة المئوية
    gray_pixels = cv2.countNonZero(mask)
    total_pixels = img.shape[0] * img.shape[1]
    urban_ratio = (gray_pixels / total_pixels) * 100

    # كتابة توصية بناءً على النسبة
    rec_text = ""
    if urban_ratio > 40:
        rec_text = "⚠️ High heat risk detected (dense urban surface). Requires aggressive cooling (e.g., large canopy + trees)."
    elif urban_ratio > 15:
        rec_text = "ℹ️ Moderate heat risk. Recommended: Add shaded walkways and street furniture."
    else:
        rec_text = "✅ Low heat risk detected. Current vegetation/shading seems adequate."
    
    return {
        "urban_density_score": round(urban_ratio, 1),
        "recommendation": rec_text
    }
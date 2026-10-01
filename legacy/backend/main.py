from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
# استيراد الدوال من ملف محرك الذكاء الاصطناعي
from ai_engine import get_sun_data, generate_visual_solutions, analyze_image_colors
import uvicorn

app = FastAPI()

# السماح للواجهة الأمامية بالاتصال بالسيرفر المحلي
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# نموذج استقبال بيانات الموقع
class LocationRequest(BaseModel):
    lat: float
    lng: float

@app.get("/")
def read_root():
    return {"message": "Al'thil AI System is Running 🚀"}

# نقطة تحليل الموقع (عند الضغط على الخريطة)
@app.post("/analyze")
def run_analysis(location: LocationRequest):
    # 1. حساب بيانات الشمس الحقيقية
    alt, azi = get_sun_data(location.lat, location.lng)
    
    # 2. توليد العناصر البصرية للخريطة بناءً على زاوية الشمس
    visual_recs = generate_visual_solutions(location.lat, location.lng, alt)
    
    # 3. إرجاع النتيجة المجمعة للواجهة
    return {
        "status": "success",
        "sun_data": {
            "altitude": alt,
            "azimuth": azi
        },
        "recommendations": visual_recs # هذه البيانات التي سترسم الدوائر
    }

# نقطة تحليل الصور (عند رفع ملف)
@app.post("/analyze-image")
async def upload_image(file: UploadFile = File(...)):
    contents = await file.read()
    # استدعاء دالة تحليل الألوان
    result = analyze_image_colors(contents)
    return result

# تشغيل السيرفر
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
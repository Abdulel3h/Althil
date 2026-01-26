// 1. تهيئة الخريطة (نقطة البداية: الرياض)
const map = L.map('map').setView([24.7136, 46.6753], 13);

// إضافة طبقة الخريطة الأساسية (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

// مصفوفة لتخزين العلامات والدوائر المرسومة حالياً لحذفها لاحقاً
let currentMarkers = [];

// --- التعامل مع النقر على الخريطة ---
map.on('click', async function(e) {
    const { lat, lng } = e.latlng;
    
    // تنظيف الخريطة من النتائج السابقة
    currentMarkers.forEach(layer => map.removeLayer(layer));
    currentMarkers = [];

    // إظهار حالة التحميل في القائمة الجانبية
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<p class="placeholder loading">🔄 Analyzing solar data & generating solutions...</p>';

    // إضافة علامة مكان النقرة
    const clickMarker = L.marker([lat, lng]).addTo(map);
    currentMarkers.push(clickMarker);

    // الاتصال بالباك إند
    try {
        const response = await fetch('http://127.0.0.1:8000/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: lat, lng: lng })
        });
        
        const data = await response.json();
        displayMapResults(data); // استدعاء دالة عرض النتائج

    } catch (error) {
        console.error("Error:", error);
        resultsDiv.innerHTML = '<p style="color:red; text-align:center;">⚠️ Error connecting to Backend. Is it running?</p>';
    }
});

// --- دالة عرض نتائج الخريطة (الدوائر والنصوص) ---
function displayMapResults(data) {
    const resultsDiv = document.getElementById('results');
    const sun = data.sun_data;
    
    // 1. بناء محتوى القائمة الجانبية
    let html = `
        <div class="result-card">
            <h4>☀️ Solar Analysis</h4>
            <p><strong>Altitude:</strong> ${sun.altitude}° (Vertical angle)</p>
            <p><strong>Azimuth:</strong> ${sun.azimuth}° (Direction)</p>
        </div>
        <h4>🌱 AI Recommended Actions:</h4>
    `;

    // 2. رسم الدوائر الخضراء على الخريطة
    if(data.recommendations) {
        data.recommendations.forEach(rec => {
            // رسم الدائرة
            const circle = L.circle([rec.lat, rec.lon], {
                color: 'var(--primary-color)',    // لون الإطار
                fillColor: 'var(--accent-color)', // لون التعبئة المشع
                fillOpacity: 0.5,
                radius: 40 // نصف قطر الدائرة بالمتر
            }).addTo(map);

            // إضافة نافذة معلومات (Popup) عند الضغط على الدائرة
            circle.bindPopup(`
                <div style="text-align:center;">
                    <b>${rec.type}</b><br>
                    <span style="color:green;">Cooling Effect: ${rec.cooling_score}</span><br>
                    <small>${rec.description}</small>
                </div>
            `);
            
            currentMarkers.push(circle); // حفظها للحذف لاحقاً

            // إضافة كارت صغير في القائمة الجانبية لكل توصية
            html += `
                <div class="result-card" style="border-left-color: var(--accent-color); padding: 10px;">
                    <strong>${rec.type}</strong><br>
                    <small>${rec.description}</small>
                </div>
            `;
        });
    }
    // تحديث محتوى القائمة الجانبية
    resultsDiv.innerHTML = html;
}


// --- التعامل مع رفع وتحليل الصور ---
async function uploadImage() {
    const input = document.getElementById('imageInput');
    const resultDiv = document.getElementById('imageResult');

    if (input.files.length === 0) {
        alert("⚠️ Please select an image first!");
        return;
    }

    // تجهيز الملف للإرسال
    const formData = new FormData();
    formData.append("file", input.files[0]);

    resultDiv.innerHTML = "<span style='color:var(--secondary-color);'>🔄 Processing image...</span>";

    try {
        // الاتصال بنقطة تحليل الصور في الباك إند
        const response = await fetch('http://127.0.0.1:8000/analyze-image', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if(data.error) {
             resultDiv.innerHTML = `<span style="color:red;">Error: ${data.error}</span>`;
        } else {
            // عرض النتيجة
            resultDiv.innerHTML = `
                <div class="result-card" style="background: #f0f2f5; border:none;">
                    <p><strong>🏙️ Urban Density (Gray Surface):</strong> ${data.urban_density_score}%</p>
                    <p style="margin-top:10px; font-weight:500;">${data.recommendation}</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error(error);
        resultDiv.innerHTML = "<span style='color:red;'>⚠️ Error uploading/analyzing image.</span>";
    }
}
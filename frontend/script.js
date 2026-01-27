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
map.on('click', async function (e) {
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
    if (data.recommendations) {
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

        if (data.error) {
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

// --- Agent al'thil Logic ---

let isAgentProcessing = false;
let lastSelectedLocation = null;

// Track last click location for context
map.on('click', (e) => {
    lastSelectedLocation = e.latlng;
});

function toggleAgent() {
    const container = document.getElementById('althil-agent-container');
    container.classList.toggle('collapsed');
}

function autoResizeInput(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

async function sendAgentMessage() {
    const input = document.getElementById('agent-input');
    const message = input.value.trim();

    if (!message || isAgentProcessing) return;

    // Render user message
    renderAgentMessage(message, 'user');
    input.value = '';
    input.style.height = 'auto';

    // Show loading
    const loadingId = showAgentLoading();
    isAgentProcessing = true;

    // Prepare context
    const context = gatherAgentContext();

    try {
        const response = await fetch('http://127.0.0.1:8000/agent/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                context: context
            })
        });

        const data = await response.json();

        // Remove loading
        document.getElementById(loadingId).remove();

        if (data.agent_message) {
            renderAgentMessage(data.agent_message, 'system');

            // Handle optional actions
            if (data.optional_actions) {
                handleAgentActions(data.optional_actions);
            }
        } else {
            renderAgentMessage("I'm sorry, I couldn't process that request.", 'system');
        }

    } catch (error) {
        console.error("Agent Error:", error);
        document.getElementById(loadingId).remove();
        renderAgentMessage("Connection failed. Please ensure the backend is active.", 'system');
    } finally {
        isAgentProcessing = false;
    }
}

function renderAgentMessage(text, type) {
    const messagesContainer = document.getElementById('agent-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    msgDiv.innerText = text;
    messagesContainer.appendChild(msgDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showAgentLoading() {
    const messagesContainer = document.getElementById('agent-messages');
    const loadingDiv = document.createElement('div');
    const id = 'loading-' + Date.now();
    loadingDiv.id = id;
    loadingDiv.className = 'message system';
    loadingDiv.innerHTML = `
        <div class="agent-loading">
            <span></span><span></span><span></span>
        </div>
    `;
    messagesContainer.appendChild(loadingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return id;
}

function gatherAgentContext() {
    // Determine page state (simple check based on visibility)
    const isMapVisible = document.getElementById('map').style.display !== 'none';

    return {
        selected_location: lastSelectedLocation ? {
            lat: lastSelectedLocation.lat,
            lng: lastSelectedLocation.lng
        } : null,
        active_layers: ['thermal_map'], // Mocked for now
        current_kpis: {}, // Could be pulled from sidebar if structured
        page_state: isMapVisible ? 'map' : 'report'
    };
}

function handleAgentActions(actions) {
    if (actions.map_focus) {
        map.setView(actions.map_focus, 15);
    }
    if (actions.highlight_zone) {
        const { lat, lng, radius } = actions.highlight_zone;
        L.circle([lat, lng], {
            color: 'var(--accent-color)',
            fillColor: 'var(--accent-color)',
            fillOpacity: 0.2,
            radius: radius || 100
        }).addTo(map);
    }
    if (actions.open_report) {
        // Implementation for opening report if applicable
        console.log("Agent requested report opening");
    }
}

// Global Enter Key Listener for Input
document.getElementById('agent-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAgentMessage();
    }
});
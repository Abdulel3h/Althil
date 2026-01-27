// Final Clean Script for Al'thil
// Handles interactive map, image analysis, and reporting

let map;
let currentMarkers = [];

// Initialize map if container exists
function initMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    map = L.map('map').setView([24.7136, 46.6753], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    map.on('click', onMapClick);
}

// Map click handler
async function onMapClick(e) {
    const { lat, lng } = e.latlng;
    clearMarkers();

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<p class="placeholder loading">🔄 Analyzing solar data & generating solutions...</p>';

    // Add temporary marker
    const clickMarker = L.marker([lat, lng]).addTo(map);
    currentMarkers.push(clickMarker);

    try {
        console.log(`Fetching analysis for: ${lat}, ${lng}`);
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('Analysis data received:', data);
        displayMapResults(data);

        // Store for report
        localStorage.setItem('althil_analysis', JSON.stringify(data));
        document.getElementById('view-report').style.display = 'block';

    } catch (err) {
        console.error('Fetch error:', err);
        resultsDiv.innerHTML = `<p style="color:red; text-align:center;">⚠️ Connection Error: ${err.message}</p>`;
    }
}

function clearMarkers() {
    if (map) {
        currentMarkers.forEach(m => map.removeLayer(m));
    }
    currentMarkers = [];
}

function displayMapResults(data) {
    const resultsDiv = document.getElementById('results');
    const sun = data.sun_data;

    let html = `
        <div class="result-card">
            <h4>☀️ Solar Analysis</h4>
            <p><strong>Altitude:</strong> ${sun.altitude}°</p>
            <p><strong>Azimuth:</strong> ${sun.azimuth}°</p>
        </div>
        <h4>🌱 AI Recommended Actions:</h4>
    `;

    if (data.recommendations && data.recommendations.recommendations) {
        data.recommendations.recommendations.forEach(rec => {
            if (map && rec.lat && rec.lon) {
                const circle = L.circle([rec.lat, rec.lon], {
                    color: 'var(--primary-color)',
                    fillColor: 'var(--accent-color)',
                    fillOpacity: 0.5,
                    radius: 40
                }).addTo(map);

                circle.bindPopup(`<b>${rec.type}</b><br>${rec.description}`);
                currentMarkers.push(circle);
            }
            html += `
                <div class="result-card" style="border-left-color: var(--accent-color);">
                    <strong>${rec.type}</strong><br>
                    <small>${rec.description}</small>
                </div>
            `;
        });
    }
    resultsDiv.innerHTML = html;
}

// Image analysis
async function uploadImage() {
    const input = document.getElementById('imageInput');
    const resultDiv = document.getElementById('imageResult');
    if (input.files.length === 0) {
        alert('⚠️ Please select an image first!');
        return;
    }

    const formData = new FormData();
    formData.append('file', input.files[0]);
    resultDiv.innerHTML = "<span>🔄 Processing...</span>";

    try {
        const response = await fetch('/analyze-image', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

        const data = await response.json();
        const existing = JSON.parse(localStorage.getItem('althil_analysis') || '{}');
        existing.image_analysis = data;
        localStorage.setItem('althil_analysis', JSON.stringify(existing));

        resultDiv.innerHTML = `
            <div class="result-card" style="background: #f0f2f5;">
                <p><strong>Density:</strong> ${data.urban_density_score}%</p>
                <p>${data.recommendation}</p>
            </div>
        `;
    } catch (err) {
        console.error(err);
        resultDiv.innerHTML = '<span style="color:red;">⚠️ Analysis failed.</span>';
    }
}

// Function to populate report page
function populateReport() {
    const container = document.getElementById('report-content');
    if (!container) return;

    const stored = localStorage.getItem('althil_analysis');
    if (!stored) {
        container.innerHTML = '<p>No data found. Please analyze a location on the map first.</p>';
        return;
    }

    const data = JSON.parse(stored);
    const sun = data.sun_data;
    const heat = data.heat_analysis;
    const img = data.image_analysis;

    let html = `
        <div class="report-section">
            <h3>📍 Location & Solar</h3>
            <p>Coords: ${data.location.lat.toFixed(4)}, ${data.location.lng.toFixed(4)}</p>
            <p>Sun: ${sun.altitude}°, ${sun.azimuth}°</p>
        </div>
        <div class="report-section">
            <h3>🔥 Heat Risk</h3>
            <p>Score: ${heat.heat_score}/100 | Risk: ${heat.risk_level}</p>
        </div>
    `;

    if (img) {
        html += `
            <div class="report-section">
                <h3>📸 Image Analysis</h3>
                <p>Urban Density: ${img.urban_density_score}%</p>
                <p>${img.recommendation}</p>
            </div>
        `;
    }

    if (data.recommendations && data.recommendations.recommendations) {
        html += `<div class="report-section"><h3>🌿 Recommendations</h3><ul>`;
        data.recommendations.recommendations.forEach(rec => {
            html += `<li><strong>${rec.type}:</strong> ${rec.description}</li>`;
        });
        html += `</ul></div>`;
    }

    container.innerHTML = html;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    populateReport();

    const viewReportBtn = document.getElementById('view-report');
    if (viewReportBtn) {
        viewReportBtn.onclick = () => window.location.href = '/report';
    }

    const backHomeBtn = document.getElementById('back-home');
    if (backHomeBtn) {
        backHomeBtn.onclick = () => window.location.href = '/';
    }

    const downloadPdfBtn = document.getElementById('download-pdf');
    if (downloadPdfBtn) {
        downloadPdfBtn.onclick = downloadPDF;
    }
});

async function downloadPDF() {
    const stored = localStorage.getItem('althil_analysis');
    if (!stored) return;

    try {
        const response = await fetch('/generate-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: stored
        });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'althil_report.pdf';
        a.click();
    } catch (err) {
        alert('Failed to generate PDF');
    }
}

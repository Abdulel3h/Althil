// Final Clean Script for Al'thil
// Handles interactive map, image analysis, and reporting

let map;
let currentMarkers = [];
let heatLayer = null;
let isHeatMode = false;

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

    html += `<img src="/static/logo.png" class="report-footer-logo" alt="Logo footer">`;

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

    // Heat Analysis Toggle
    const heatBtn = document.getElementById('heat-analysis-btn');
    if (heatBtn) {
        heatBtn.onclick = toggleHeatMode;
    }
});

async function toggleHeatMode() {
    isHeatMode = !isHeatMode;
    const btn = document.getElementById('heat-analysis-btn');

    if (isHeatMode) {
        btn.textContent = "🗺️ Standard Map";
        btn.style.background = "var(--secondary-color)";
        document.body.classList.add('heat-mode-active');

        // Smooth transition: zoom + fade
        map.flyTo(map.getCenter(), map.getZoom() + 1, {
            duration: 1.5,
            easeLinearity: 0.25
        });

        // Load heat data and show progressively
        showHeatmap();
    } else {
        btn.textContent = "🔥 Heat Analysis";
        btn.style.background = ""; // Reset to CSS default
        document.body.classList.remove('heat-mode-active');

        if (heatLayer) {
            map.removeLayer(heatLayer);
            heatLayer = null;
        }

        map.flyTo(map.getCenter(), map.getZoom() - 1, {
            duration: 1.5
        });
    }
}

function showHeatmap() {
    // Simulated heat data points [lat, lng, intensity]
    // In a real app, this would come from the backend analysis
    const center = map.getCenter();
    const points = [];

    // Generate some hotspots around the center
    for (let i = 0; i < 20; i++) {
        const r = 0.01 * Math.sqrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        points.push([
            center.lat + r * Math.cos(theta),
            center.lng + r * Math.sin(theta),
            Math.random() // intensity
        ]);
    }

    // Progressive appearance
    let opacity = 0;
    heatLayer = L.heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
    }).addTo(map);

    heatLayer.setOptions({ opacity: 0 });

    const fadeIn = setInterval(() => {
        opacity += 0.05;
        heatLayer.setOptions({ opacity: opacity });
        if (opacity >= 0.8) clearInterval(fadeIn);
    }, 50);

    // Interaction Tooltips (Simulated with transparent circles for clicking)
    points.filter(p => p[2] > 0.7).forEach(p => {
        const interactiveCircle = L.circleMarker([p[0], p[1]], {
            radius: 20,
            fillColor: 'transparent',
            color: 'transparent',
            stroke: false
        }).addTo(map);

        interactiveCircle.bindTooltip("High Heat Accumulation Area (Estimated)", {
            className: 'heat-tooltip',
            direction: 'top',
            sticky: true
        });

        interactiveCircle.on('mouseover', function () {
            this.setStyle({ fillColor: 'rgba(255, 255, 255, 0.1)', stroke: true, color: 'white', weight: 1 });
        });

        interactiveCircle.on('mouseout', function () {
            this.setStyle({ fillColor: 'transparent', stroke: false });
        });

        currentMarkers.push(interactiveCircle);
    });
}

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

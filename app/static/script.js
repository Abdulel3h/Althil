// Final Clean Script for Al'thil
// Handles interactive map, image analysis, reporting, and premium UI states

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
    lastSelectedLocation = e.latlng;
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
        const viewReportBtn = document.getElementById('view-report');
        viewReportBtn.style.display = 'block';
        setButtonState('view-report', 'attention');

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
    resultsDiv.innerHTML = ''; // Clear previous
    const sun = data.sun_data;

    const summaryHtml = `
        <div class="result-card reveal-item delay-1">
            <h4>☀️ Solar Analysis</h4>
            <p><strong>Altitude:</strong> <span class="counter" data-target="${sun.altitude}">${sun.altitude}</span>°</p>
            <p><strong>Azimuth:</strong> <span class="counter" data-target="${sun.azimuth}">${sun.azimuth}</span>°</p>
        </div>
        <h4 class="reveal-item delay-2">🌱 Recommended Actions:</h4>
    `;

    resultsDiv.insertAdjacentHTML('beforeend', summaryHtml);

    if (data.recommendations && data.recommendations.recommendations) {
        data.recommendations.recommendations.forEach((rec, index) => {
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

            const recHtml = `
                <div class="result-card reveal-item" style="border-left-color: var(--accent-color); animation-delay: ${300 + (index * 100)}ms;">
                    <strong>${rec.type}</strong><br>
                    <small>${rec.description}</small>
                </div>
            `;
            resultsDiv.insertAdjacentHTML('beforeend', recHtml);
        });
    }

    animateCounters();
}

function animateCounters() {
    const counters = document.querySelectorAll('.counter');
    counters.forEach(counter => {
        const target = +counter.getAttribute('data-target');
        const count = 0;
        const duration = 1000; // 1s
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const value = (progress * target).toFixed(2);
            counter.innerText = value;
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    });
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

    setButtonState('analyze-image-btn', 'processing');

    try {
        const response = await fetch('/analyze-image', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setButtonState('analyze-image-btn', 'success');

        const existing = JSON.parse(localStorage.getItem('althil_analysis') || '{}');
        existing.image_analysis = data;
        localStorage.setItem('althil_analysis', JSON.stringify(existing));

        resultDiv.innerHTML = `
            <div class="result-card reveal-item" style="background: #f0f2f5;">
                <p><strong>Urban surface:</strong> ${data.urban_density}%</p>
                <p><strong>Vegetation:</strong> ${data.green_coverage}%</p>
                <p>${data.recommendation}</p>
            </div>
        `;

        setTimeout(() => setButtonState('analyze-image-btn', 'idle'), 2000);
    } catch (err) {
        console.error(err);
        setButtonState('analyze-image-btn', 'idle');
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

    if (img && !img.error) {
        html += `
            <div class="report-section">
                <h3>📸 Image Analysis</h3>
                <p>Urban surface: ${img.urban_density}% · Vegetation: ${img.green_coverage}%</p>
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
    // Add loaded class for entrance animations
    document.body.classList.add('loaded');

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

    // Drag and Drop implementation
    const dropzone = document.getElementById('dropzone');
    const imageInput = document.getElementById('imageInput');

    if (dropzone && imageInput) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
        });

        dropzone.addEventListener('drop', e => {
            const dt = e.dataTransfer;
            const files = dt.files;
            imageInput.files = files;
            updateFilenameDisplay(files[0]);
        }, false);

        imageInput.addEventListener('change', function () {
            if (this.files.length > 0) {
                updateFilenameDisplay(this.files[0]);
            }
        });
    }
});

function updateFilenameDisplay(file) {
    const mainText = document.querySelector('.upload-text .main-text');
    const subText = document.querySelector('.upload-text .sub-text');
    if (mainText && subText && file) {
        mainText.textContent = file.name;
        subText.textContent = `${(file.size / 1024).toFixed(1)} KB - Ready for analysis`;
        mainText.style.color = 'var(--primary-color)';

        // Visual trigger attention
        setButtonState('analyze-image-btn', 'attention');
    }
}

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

        // Attention pulse to signal normal mode return
        setButtonState('heat-analysis-btn', 'attention');
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
        setButtonState('download-pdf', 'processing');
        const response = await fetch('/generate-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: stored
        });
        const blob = await response.blob();
        setButtonState('download-pdf', 'success');

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'althil_report.pdf';
        a.click();

        setTimeout(() => setButtonState('download-pdf', 'idle'), 2000);
    } catch (err) {
        setButtonState('download-pdf', 'idle');
        alert('Failed to generate PDF');
    }
}

/**
 * Premium Button State Management
 * Transitions buttons between 'idle', 'processing', and 'success'
 */
function setButtonState(buttonId, state) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    // Reset states
    btn.classList.remove('btn-processing', 'btn-success', 'btn-attention');
    const originalText = btn.getAttribute('data-original-text') || btn.innerHTML;

    if (!btn.getAttribute('data-original-text')) {
        btn.setAttribute('data-original-text', originalText);
    }

    switch (state) {
        case 'processing':
            btn.classList.add('btn-processing');
            btn.innerHTML = `<span>🔄 Processing...</span>`;
            break;
        case 'success':
            btn.classList.add('btn-success');
            btn.innerHTML = `<span>✅ Complete</span>`;
            break;
        case 'idle':
            btn.innerHTML = originalText;
            break;
        case 'attention':
            btn.classList.add('btn-attention');
            break;
    }
}

// --- Agent al’thil Logic ---

let isAgentProcessing = false;
// Set by onMapClick so the agent knows which point is selected
let lastSelectedLocation = null;

function toggleAgent() {
    const container = document.getElementById('althil-agent-container');
    if (container) {
        const isActive = container.classList.toggle('active');
        document.body.classList.toggle('agent-active', isActive);

        // Scroll to bottom on open to ensure latest messages are seen
        if (isActive) {
            const messagesContainer = document.getElementById('agent-messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }
    }
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
        const response = await fetch('/agent/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: message,
                context: context
            })
        });

        if (!response.ok) throw new Error(`Agent API returned ${response.status}`);

        const data = await response.json();

        // Remove loading
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();

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
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        renderAgentMessage("Connection failed. The AI agent is currently offline.", 'system');
    } finally {
        isAgentProcessing = false;
    }
}

function renderAgentMessage(text, type) {
    const messagesContainer = document.getElementById('agent-messages');
    if (!messagesContainer) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    msgDiv.innerText = text;
    messagesContainer.appendChild(msgDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showAgentLoading() {
    const messagesContainer = document.getElementById('agent-messages');
    if (!messagesContainer) return null;

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
    return {
        selected_location: lastSelectedLocation ? {
            lat: lastSelectedLocation.lat,
            lng: lastSelectedLocation.lng
        } : null,
        active_layers: isHeatMode ? ['thermal_map'] : [],
        current_kpis: {},
        page_state: window.location.pathname.includes('report') ? 'report' : 'map'
    };
}

function handleAgentActions(actions) {
    if (!map) return;

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
        window.location.href = '/report';
    }
}

// Global Enter Key Listener for Agent Input
document.addEventListener('DOMContentLoaded', () => {
    const agentInput = document.getElementById('agent-input');
    if (agentInput) {
        agentInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAgentMessage();
            }
        });
    }
});

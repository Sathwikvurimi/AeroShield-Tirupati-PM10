let liveMap = null;
let stationMarkersMap = {};
let liveStreamChart = null;
let currentRange = '24h';
let activeStationId = getSelectedStation();
let activeStateFilter = 'all';
let indiaStationsList = [];

document.addEventListener('DOMContentLoaded', () => {
    activeStationId = getSelectedStation();
    initLeafletMap();
    loadLivePageData();
    setInterval(() => {
        loadLivePageData();
    }, 30000);
});

function initLeafletMap() {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer || liveMap) return;
    
    const tirupatiLat = 13.6288;
    const tirupatiLon = 79.4192;
    
    liveMap = L.map('map-container').setView([tirupatiLat, tirupatiLon], 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors | AeroShield Tirupati PM10 Station'
    }).addTo(liveMap);
}

async function loadLivePageData(force = false) {
    activeStationId = 'AP001';
    const btn = document.getElementById('btn-manual-refresh-live');
    if (btn && force) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-rotate-right fa-spin"></i> Refreshing...';
    }
    
    try {
        let url = `/api/india-stations-pm10?refresh=${force}`;
        const res = await fetch(url);
        const json = await res.json();
        
        if (json.status === 'success' && json.data) {
            indiaStationsList = json.data;
            
            const badge = document.getElementById('map-station-count');
            if (badge) badge.textContent = `1 Active Station (Tirupati)`;
            
            populateStationDropdown(indiaStationsList);
            renderStationsMap(indiaStationsList);
            renderStationsTable(indiaStationsList);
        }
        
        const liveRes = await fetch(`/api/current-pm10?station_id=AP001&refresh=${force}`);
        const liveJson = await liveRes.json();
        
        if (liveJson.status === 'success' && liveJson.data) {
            updateSelectedStationUI(liveJson.data);
        }
        
        loadStreamChartData();

        if (force) {
            showToast('Tirupati Live Station Telemetry Refreshed!', 'success');
        }
    } catch (err) {
        console.error('Error loading live page:', err);
        showToast('Temporary error refreshing telemetry feed.', 'warning');
    } finally {
        if (btn && force) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Refresh Live Data';
        }
    }
}

function filterByState(state, btn) {
    activeStateFilter = state;
    document.querySelectorAll('.region-pill').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    loadLivePageData();
}

function populateStationDropdown(stations) {
    const select = document.getElementById('select-ap-station');
    if (!select) return;
    
    select.innerHTML = stations.map(s => `
        <option value="${s.station_id}" ${s.station_id === activeStationId ? 'selected' : ''}>
            ${s.city} (${s.state}) - ${s.pm10} µg/m³
        </option>
    `).join('');
    
    select.value = activeStationId;
}

function switchAPStation(stationId) {
    activeStationId = stationId;
    setSelectedStation(stationId);
    
    const select = document.getElementById('select-ap-station');
    if (select) select.value = stationId;
    
    loadLivePageData();
    
    const target = indiaStationsList.find(s => s.station_id === stationId);
    if (target && liveMap) {
        liveMap.setView([target.latitude, target.longitude], 11);
        if (stationMarkersMap[stationId]) {
            stationMarkersMap[stationId].openPopup();
        }
    }
}

function renderStationsMap(stations) {
    if (!liveMap) return;
    
    const validIds = new Set(stations.map(s => s.station_id));
    Object.keys(stationMarkersMap).forEach(id => {
        if (!validIds.has(id)) {
            liveMap.removeLayer(stationMarkersMap[id]);
            delete stationMarkersMap[id];
        }
    });
    
    const latLgGroup = [];
    
    stations.forEach(s => {
        const popupContent = `
            <div style="font-family:sans-serif; text-align:center; min-width:140px;">
                <h4 style="margin:0 0 2px 0; color:#0f172a; font-size:14px;">${s.city}</h4>
                <p style="margin:0; font-size:11px; color:#64748b;">${s.state} (${s.station_id})</p>
                <div style="font-size:18px; font-weight:800; color:${s.category_color}; margin:4px 0;">${s.pm10} µg/m³</div>
                <span style="display:inline-block; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:700; background:${s.category_color}; color:${(s.category === 'Good' || s.category === 'Satisfactory' || s.category === 'Moderate') ? '#000' : '#fff'};">
                    ${s.category}
                </span>
                <br>
                <button onclick="switchAPStation('${s.station_id}')" style="margin-top:6px; background:#0284c7; color:#fff; border:none; padding:3px 8px; border-radius:4px; font-size:11px; cursor:pointer;">
                    Select Station
                </button>
            </div>
        `;
        
        latLgGroup.push([s.latitude, s.longitude]);
        
        if (stationMarkersMap[s.station_id]) {
            stationMarkersMap[s.station_id].setLatLng([s.latitude, s.longitude]);
            stationMarkersMap[s.station_id].setPopupContent(popupContent);
        } else {
            const marker = L.marker([s.latitude, s.longitude]).addTo(liveMap);
            marker.bindPopup(popupContent);
            stationMarkersMap[s.station_id] = marker;
        }
    });
    
    if (latLgGroup.length > 0 && activeStateFilter !== 'all') {
        liveMap.fitBounds(latLgGroup, { padding: [30, 30] });
    }
}

function renderStationsTable(stations) {
    const tbody = document.getElementById('tbody-ap-stations');
    if (!tbody) return;
    
    tbody.innerHTML = stations.map(s => {
        const isSelected = s.station_id === activeStationId;
        return `
            <tr style="${isSelected ? 'background: rgba(56, 189, 248, 0.12); font-weight: 700;' : ''}" onclick="switchAPStation('${s.station_id}')" style="cursor:pointer;">
                <td><span class="badge blue">${s.station_id}</span></td>
                <td><strong>${s.city}</strong></td>
                <td><span class="badge purple">${s.state}</span></td>
                <td style="font-size:1.05rem; font-weight:800; color:var(--accent-blue);">${s.pm10} µg/m³</td>
                <td><span class="category-badge" style="background:${s.category_color}; color:${(s.category === 'Good' || s.category === 'Satisfactory' || s.category === 'Moderate') ? '#000' : '#fff'};">${s.category}</span></td>
                <td style="font-size:0.8rem; color:var(--text-muted);">${s.latitude}° N, ${s.longitude}° E</td>
                <td style="font-size:0.8rem;">${s.timestamp.split(' ')[1]}</td>
                <td>
                    <button class="btn ${isSelected ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="event.stopPropagation(); switchAPStation('${s.station_id}');">
                        ${isSelected ? '<i class="fa-solid fa-check"></i> Selected' : 'Inspect'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateSelectedStationUI(data) {
    document.getElementById('live-pm10-value').textContent = data.pm10 !== null ? data.pm10.toFixed(1) : '--';
    
    const catBadge = document.getElementById('live-category-badge');
    catBadge.textContent = data.category || 'Unknown';
    catBadge.style.backgroundColor = data.category_color || '#6b7280';
    catBadge.style.color = (data.category === 'Good' || data.category === 'Satisfactory' || data.category === 'Moderate') ? '#000' : '#fff';
    
    document.getElementById('live-station-name').textContent = data.station_name || 'Monitoring Station';
    document.getElementById('live-location').textContent = `${data.city}, ${data.state || 'India'} (${data.latitude}° N, ${data.longitude}° E)`;
    document.getElementById('live-timestamp').textContent = data.timestamp || '--';
    document.getElementById('live-freshness').textContent = `${data.minutes_ago || 0} minutes ago`;
    document.getElementById('live-source').textContent = data.source || 'CPCB National Telemetry';
    
    const apiBadge = document.getElementById('live-api-badge');
    apiBadge.textContent = `API ${data.api_status}`;
    apiBadge.className = `badge ${data.is_stale ? 'yellow' : 'green'}`;
}

function setChartRange(range, btn) {
    currentRange = range;
    document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadStreamChartData();
}

async function loadStreamChartData() {
    let limit = 24;
    if (currentRange === '1h') limit = 6;
    if (currentRange === '6h') limit = 12;
    if (currentRange === '12h') limit = 18;
    if (currentRange === '24h') limit = 24;
    if (currentRange === '7d') limit = 168;
    
    try {
        const res = await fetch(`/api/historical-pm10?limit=${limit}`);
        const json = await res.json();
        
        if (json.status === 'success' && json.data) {
            renderStreamChart(json.data);
        }
    } catch (err) {
        console.error('Error fetching stream chart:', err);
    }
}

function renderStreamChart(data) {
    const ctx = document.getElementById('liveStreamChart');
    if (!ctx) return;
    
    const labels = data.map(d => d.timestamp.split(' ')[1].substring(0, 5));
    const values = data.map(d => d.pm10);
    const colors = data.map(d => d.category_color);
    
    if (liveStreamChart) {
        liveStreamChart.destroy();
    }
    
    liveStreamChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'PM10 Concentration (µg/m³)',
                data: values,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                fill: true,
                tension: 0.35,
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'PM10 (µg/m³)' } }
            }
        }
    });
}

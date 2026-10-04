let dashboardChart = null;
let activeDashStationId = getSelectedStation();
let dashStationsList = [];

document.addEventListener('DOMContentLoaded', () => {
    activeDashStationId = getSelectedStation();
    loadDashboardStations();
    refreshDashboardData(false);
    setInterval(() => {
        refreshDashboardData(false);
    }, 30000);
});

async function loadDashboardStations() {
    activeDashStationId = 'AP001';
    setSelectedStation('AP001');
}

function populateDashboardStationDropdown(stations) {
    const select = document.getElementById('dash-select-station');
    if (!select) return;
    
    select.innerHTML = stations.map(s => `
        <option value="${s.station_id}" ${s.station_id === activeDashStationId ? 'selected' : ''}>
            ${s.city} (${s.state}) ${s.station_id === 'AP001' ? '★ Tirupati Dataset' : ''} - ${s.pm10} µg/m³
        </option>
    `).join('');
    
    select.value = activeDashStationId;
}

function changeDashboardStation(stationId) {
    activeDashStationId = stationId;
    setSelectedStation(stationId);
    refreshDashboardData();
}

async function refreshDashboardData(force = true) {
    activeDashStationId = 'AP001';
    const btn = document.getElementById('btn-refresh-dashboard');
    if (btn && force) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i> Refreshing...';
    }
    
    try {
        const liveRes = await fetch(`/api/current-pm10?station_id=AP001&refresh=${force}`);
        const liveJson = await liveRes.json();
        
        if (liveJson.status === 'success' && liveJson.data) {
            updateLiveCards(liveJson.data);
        }
        
        const predRes = await fetch(`/api/prediction?station_id=AP001`);
        const predJson = await predRes.json();
        
        if (predJson.status === 'success' && predJson.data) {
            updatePredictionCards(predJson.data);
        }
        
        const histRes = await fetch('/api/historical-pm10?limit=24');
        const histJson = await histRes.json();
        
        if (histJson.status === 'success' && histJson.data) {
            renderDashboardChart(histJson.data, predJson.data);
        }

        if (force) {
            showToast('Tirupati Live PM10 Data Refreshed!', 'success');
        }
        
    } catch (err) {
        console.error('Error refreshing dashboard:', err);
        showToast('Temporary error connecting to live telemetry API.', 'warning');
    } finally {
        if (btn && force) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Refresh Live Data';
        }
    }
}

function updateLiveCards(data) {
    document.getElementById('card-current-pm10').textContent = data.pm10 !== null ? data.pm10.toFixed(1) : '--';
    
    const catBadge = document.getElementById('card-category-badge');
    catBadge.textContent = data.category || 'Unknown';
    catBadge.style.backgroundColor = data.category_color || '#6b7280';
    catBadge.style.color = (data.category === 'Good' || data.category === 'Satisfactory' || data.category === 'Moderate') ? '#000' : '#fff';
    
    document.getElementById('card-freshness').innerHTML = `<i class="fa-regular fa-clock"></i> ${data.source} (${data.minutes_ago || 0}m ago)`;
    document.getElementById('comp-current').textContent = `${data.pm10 !== null ? data.pm10.toFixed(1) : '--'} µg/m³`;
    
    document.getElementById('meta-station-name').textContent = data.station_name || 'Monitoring Station';
    document.getElementById('meta-coords').textContent = `${data.latitude}° N, ${data.longitude}° E (${data.city || 'India'})`;
    
    const statusBadge = document.getElementById('meta-api-status');
    statusBadge.textContent = data.api_status || 'ONLINE';
    statusBadge.className = `val-badge ${data.is_stale ? 'yellow' : 'green'}`;
}

function updatePredictionCards(data) {
    document.getElementById('card-predicted-pm10').textContent = data.predicted_pm10 !== null ? data.predicted_pm10.toFixed(1) : '--';
    
    const predCatBadge = document.getElementById('card-predicted-category');
    predCatBadge.textContent = data.category || 'Unknown';
    predCatBadge.style.backgroundColor = data.category_color || '#6b7280';
    predCatBadge.style.color = (data.category === 'Good' || data.category === 'Satisfactory' || data.category === 'Moderate') ? '#000' : '#fff';
    
    document.getElementById('card-model-name').innerHTML = `<i class="fa-solid fa-robot"></i> ${data.model_used || 'XGBoost Regressor'}`;
    document.getElementById('comp-predicted').textContent = `${data.predicted_pm10.toFixed(1)} µg/m³`;
    
    const changeVal = data.expected_change;
    const changePct = data.change_pct;
    const changeElem = document.getElementById('card-change-val');
    const changePctElem = document.getElementById('card-change-pct');
    const arrowElem = document.getElementById('card-change-arrow');
    const compTextElem = document.getElementById('comp-change-text');
    
    const sign = changeVal > 0 ? '+' : '';
    changeElem.textContent = `${sign}${changeVal.toFixed(1)} µg/m³`;
    changePctElem.textContent = `(${sign}${changePct.toFixed(1)}%)`;
    
    if (changeVal > 0) {
        changeElem.className = 'metric-number text-danger';
        arrowElem.innerHTML = `<span class="badge red"><i class="fa-solid fa-arrow-up"></i> Expected Increase</span>`;
        compTextElem.textContent = `Expected PM10 Increase: +${changeVal.toFixed(1)} µg/m³ (+${changePct.toFixed(1)}%)`;
    } else if (changeVal < 0) {
        changeElem.className = 'metric-number text-success';
        arrowElem.innerHTML = `<span class="badge green"><i class="fa-solid fa-arrow-down"></i> Expected Decrease</span>`;
        compTextElem.textContent = `Expected PM10 Decrease: ${changeVal.toFixed(1)} µg/m³ (${changePct.toFixed(1)}%)`;
    } else {
        changeElem.className = 'metric-number text-muted';
        arrowElem.innerHTML = `<span class="badge blue"><i class="fa-solid fa-minus"></i> No Change</span>`;
        compTextElem.textContent = `Expected PM10 Steady: 0.0 µg/m³`;
    }
    
    const anoBadge = document.getElementById('card-anomaly-badge');
    if (data.anomaly_status === 'ANOMALY DETECTED') {
        anoBadge.className = 'anomaly-badge detected';
        anoBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ANOMALY DETECTED`;
    } else {
        anoBadge.className = 'anomaly-badge normal';
        anoBadge.innerHTML = `<i class="fa-solid fa-check"></i> NORMAL`;
    }
    document.getElementById('card-anomaly-score').textContent = data.anomaly_score !== undefined ? data.anomaly_score.toFixed(4) : '0.00';
    
    renderXAIDrivers(data.xai_drivers || []);
}

function renderXAIDrivers(drivers) {
    const container = document.getElementById('xai-drivers-list');
    if (!container) return;
    
    container.innerHTML = drivers.map(d => `
        <div class="xai-item" style="margin-bottom: 0.75rem;">
            <div style="display:flex; justify-content:space-between; font-size:0.82rem; font-weight:600; margin-bottom:0.2rem;">
                <span>${d.label}</span>
                <span class="text-accent">${d.importance.toFixed(1)}% weight</span>
            </div>
            <div style="width:100%; background:rgba(255,255,255,0.05); height:8px; border-radius:4px; overflow:hidden;">
                <div style="width:${Math.min(100, d.importance * 2)}%; background:linear-gradient(90deg, var(--accent-blue), var(--accent-indigo)); height:100%;"></div>
            </div>
        </div>
    `).join('');
}

function renderDashboardChart(histData, predData) {
    const ctx = document.getElementById('dashboardTrendChart');
    if (!ctx) return;
    
    const labels = histData.map(d => d.timestamp.split(' ')[1].substring(0, 5));
    const actualValues = histData.map(d => d.pm10);
    
    if (predData && predData.predicted_pm10) {
        labels.push('Next Hour');
        actualValues.push(null);
    }
    
    const predictedSeries = new Array(actualValues.length - 1).fill(null);
    if (predData && predData.predicted_pm10) {
        predictedSeries[actualValues.length - 2] = actualValues[actualValues.length - 2];
        predictedSeries.push(predData.predicted_pm10);
    }
    
    if (dashboardChart) {
        dashboardChart.destroy();
    }
    
    dashboardChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Measured PM10 (µg/m³)',
                    data: actualValues,
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 3
                },
                {
                    label: 'Next-Hour ML Forecast (µg/m³)',
                    data: predictedSeries,
                    borderColor: '#c084fc',
                    borderDash: [5, 5],
                    backgroundColor: 'rgba(192, 132, 252, 0.2)',
                    fill: false,
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 6,
                    pointBackgroundColor: '#c084fc'
                }
            ]
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

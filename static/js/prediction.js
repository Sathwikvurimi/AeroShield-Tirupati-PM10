let xaiChart = null;
let backtestChart = null;
let currentMode = 'LIVE';
let activePredStationId = getSelectedStation();
let predStationsList = [];

document.addEventListener('DOMContentLoaded', () => {
    activePredStationId = getSelectedStation();
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('input-datetime').value = now.toISOString().slice(0, 16);
    
    loadPredStations();
    loadBacktestData();
});

async function loadPredStations() {
    activePredStationId = 'AP001';
    setSelectedStation('AP001');
    fetchStationDataAndPredict('AP001');
}

async function changePredStation(stationId) {
    activePredStationId = stationId;
    setSelectedStation(stationId);
    await fetchStationDataAndPredict(stationId);
}

async function fetchStationDataAndPredict(stationId) {
    activePredStationId = stationId;
    setSelectedStation(stationId);
    try {
        const res = await fetch(`/api/current-pm10?station_id=${stationId}&refresh=false`);
        const json = await res.json();
        if (json.status === 'success' && json.data) {
            const st = json.data;
            document.getElementById('input-current-pm10').value = st.pm10.toFixed(1);
            document.getElementById('input-lag-1h').value = (st.pm10 * 0.98).toFixed(1);
            document.getElementById('input-lag-2h').value = (st.pm10 * 0.96).toFixed(1);
            document.getElementById('input-lag-3h').value = (st.pm10 * 0.95).toFixed(1);
            document.getElementById('input-lag-24h').value = (st.pm10 * 1.04).toFixed(1);
            runPrediction();
        }
    } catch (err) {
        runPrediction();
    }
}

function switchPredMode(mode) {
    currentMode = mode;
    document.getElementById('btn-mode-live').classList.toggle('active', mode === 'LIVE');
    document.getElementById('btn-mode-sim').classList.toggle('active', mode === 'SIMULATED');
    
    const badge = document.getElementById('mode-badge');
    badge.textContent = mode === 'LIVE' ? 'LIVE FORECAST MODE' : 'SCENARIO SIMULATION MODE';
    badge.className = `badge ${mode === 'LIVE' ? 'blue' : 'purple'}`;
    
    if (mode === 'LIVE') {
        fetchStationDataAndPredict(activePredStationId);
    }
}

async function runPrediction() {
    activePredStationId = getSelectedStation();
    const currentVal = parseFloat(document.getElementById('input-current-pm10').value) || 72.0;
    const lag1 = parseFloat(document.getElementById('input-lag-1h').value) || currentVal;
    const lag2 = parseFloat(document.getElementById('input-lag-2h').value) || currentVal;
    const lag3 = parseFloat(document.getElementById('input-lag-3h').value) || currentVal;
    const lag24 = parseFloat(document.getElementById('input-lag-24h').value) || currentVal;
    const dtVal = document.getElementById('input-datetime').value;
    
    const payload = {
        station_id: activePredStationId,
        current_pm10: currentVal,
        datetime: dtVal,
        prediction_type: currentMode,
        lags: {
            lag_1h: lag1,
            lag_2h: lag2,
            lag_3h: lag3,
            lag_6h: (lag3 + lag24) / 2,
            lag_12h: (lag3 + lag24) / 2,
            lag_24h: lag24
        }
    };
    
    try {
        const res = await fetch('/api/prediction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const json = await res.json();
        if (json.status === 'success' && json.data) {
            updatePredictionResultsUI(json.data);
            showToast(`Next-Hour PM10 Forecast generated for ${json.data.city || 'Location'}!`, 'success');
        }
    } catch (err) {
        console.error('Error running prediction:', err);
        showToast('Failed to execute prediction request.', 'error');
    }
}

function updatePredictionResultsUI(data) {
    document.getElementById('res-predicted-pm10').textContent = data.predicted_pm10.toFixed(1);
    
    const catBadge = document.getElementById('res-category-badge');
    catBadge.textContent = data.category;
    catBadge.style.backgroundColor = data.category_color;
    catBadge.style.color = (data.category === 'Good' || data.category === 'Satisfactory' || data.category === 'Moderate') ? '#000' : '#fff';
    
    document.getElementById('res-current-pm10').textContent = `${data.current_pm10.toFixed(1)} µg/m³ (${data.city || 'India'})`;
    
    const sign = data.expected_change > 0 ? '+' : '';
    document.getElementById('res-expected-change').textContent = `${sign}${data.expected_change.toFixed(1)} µg/m³ (${sign}${data.change_pct.toFixed(1)}%)`;
    document.getElementById('res-expected-change').style.color = data.expected_change > 0 ? 'var(--status-verypoor)' : 'var(--status-good)';
    
    document.getElementById('res-anomaly-status').textContent = data.anomaly_status;
    document.getElementById('res-anomaly-status').style.color = data.anomaly_status === 'ANOMALY DETECTED' ? 'var(--status-verypoor)' : 'var(--status-good)';
    
    renderXAIBarChart(data.xai_drivers || []);
}

function renderXAIBarChart(drivers) {
    const ctx = document.getElementById('xaiBarChart');
    if (!ctx) return;
    
    const labels = drivers.map(d => d.label);
    const importances = drivers.map(d => d.importance);
    
    if (xaiChart) {
        xaiChart.destroy();
    }
    
    xaiChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Relative Importance Weight (%)',
                data: importances,
                backgroundColor: ['#38bdf8', '#818cf8', '#c084fc', '#34d399', '#f59e0b'],
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Importance Weight (%)' } },
                y: { grid: { display: false } }
            }
        }
    });
    
    const textContainer = document.getElementById('xai-explanation-text');
    if (textContainer && drivers.length > 0) {
        textContainer.innerHTML = `
            <h4><i class="fa-solid fa-circle-check text-accent"></i> Key Prediction Factors Breakdown:</h4>
            <p style="margin-top:0.5rem; font-size:0.9rem; color:var(--text-secondary);">
                The trained tree ensemble regression model identified <strong>${drivers[0].label}</strong> as the primary driver 
                (contributing <strong>${drivers[0].importance}%</strong> to the forecast), followed by <strong>${drivers[1].label}</strong>. 
                Temporal features prevent target leakage while accurately capturing diurnal variations.
            </p>
        `;
    }
}

async function loadBacktestData() {
    try {
        const res = await fetch('/api/model-performance');
        const json = await res.json();
        
        if (json.status === 'success' && json.backtest) {
            renderBacktestChart(json.backtest);
        }
    } catch (err) {
        console.error('Error loading backtest chart:', err);
    }
}

function renderBacktestChart(backtest) {
    const ctx = document.getElementById('backtestChart');
    if (!ctx) return;
    
    const timestamps = (backtest.timestamps || []).slice(-60).map(ts => ts.split(' ')[1].substring(0, 5));
    const actual = (backtest.actual || []).slice(-60);
    const predicted = (backtest.predicted || []).slice(-60);
    
    if (backtestChart) {
        backtestChart.destroy();
    }
    
    backtestChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [
                {
                    label: 'Actual Unseen Test PM10 (µg/m³)',
                    data: actual,
                    borderColor: '#38bdf8',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.2,
                    pointRadius: 2
                },
                {
                    label: 'Model Predicted PM10 (µg/m³)',
                    data: predicted,
                    borderColor: '#c084fc',
                    borderWidth: 2,
                    borderDash: [4, 4],
                    fill: false,
                    tension: 0.2,
                    pointRadius: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'PM10 (µg/m³)' } }
            }
        }
    });
}

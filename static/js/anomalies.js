let anomalyChart = null;
let detectedAnomaliesList = [];

document.addEventListener('DOMContentLoaded', () => {
    loadAnomaliesPage();
});

async function loadAnomaliesPage() {
    try {
        const res = await fetch('/api/anomalies');
        const json = await res.json();
        
        if (json.status === 'success') {
            const info = json.info || {};
            detectedAnomaliesList = json.detected_anomalies || [];
            
            document.getElementById('ano-total-obs').textContent = (info.total_observations || 0).toLocaleString();
            document.getElementById('ano-count').textContent = (info.isolation_forest_anomalies || 0).toLocaleString();
            document.getElementById('ano-pct').textContent = `${info.isolation_forest_percentage || 0}%`;
            
            renderAnomalyTable(detectedAnomaliesList);
            renderAnomalyChart(detectedAnomaliesList);
        }
    } catch (err) {
        console.error('Error loading anomalies:', err);
    }
}

function renderAnomalyTable(anomalies) {
    const tbody = document.getElementById('tbody-anomalies');
    if (!tbody) return;
    
    tbody.innerHTML = anomalies.slice(0, 50).map((a, idx) => `
        <tr onclick="inspectAnomaly(${idx})" style="cursor:pointer;">
            <td>${a.timestamp}</td>
            <td class="text-danger font-bold">${a.pm10} µg/m³</td>
            <td><span class="badge ${a.iso_score < 0 ? 'red' : 'blue'}">${a.iso_score}</span></td>
            <td>${a.lag_1h}</td>
            <td>${a.rolling_mean_24h}</td>
            <td>${a.hour}:00</td>
            <td><button class="btn btn-outline btn-sm"><i class="fa-solid fa-eye"></i> Inspect</button></td>
        </tr>
    `).join('');
}

function renderAnomalyChart(anomalies) {
    const ctx = document.getElementById('anomalyChart');
    if (!ctx) return;
    
    const labels = anomalies.map(a => a.timestamp.split(' ')[0]);
    const values = anomalies.map(a => a.pm10);
    
    if (anomalyChart) anomalyChart.destroy();
    
    anomalyChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Detected Anomaly Event',
                data: anomalies.map((a, i) => ({ x: i, y: a.pm10 })),
                backgroundColor: '#ef4444',
                borderColor: '#ef4444',
                pointRadius: 6,
                pointHoverRadius: 9
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Observation Index' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'PM10 Concentration (µg/m³)' } }
            }
        }
    });
}

function inspectAnomaly(idx) {
    const item = detectedAnomaliesList[idx];
    if (!item) return;
    
    const modalBody = document.getElementById('modal-anomaly-body');
    modalBody.innerHTML = `
        <div style="font-size:0.95rem;">
            <p><strong>Timestamp:</strong> ${item.timestamp}</p>
            <p><strong>PM10 Concentration:</strong> <span style="color:var(--status-verypoor); font-size:1.4rem; font-weight:800;">${item.pm10} µg/m³</span></p>
            <p><strong>Isolation Forest Anomaly Score:</strong> <span class="badge red">${item.iso_score}</span></p>
            <hr style="border-color:var(--border-color); margin:1rem 0;">
            <p><strong>Historical Lags Context:</strong></p>
            <ul>
                <li>PM10 Lag 1 Hour: ${item.lag_1h} µg/m³</li>
                <li>24-Hour Rolling Average: ${item.rolling_mean_24h} µg/m³</li>
                <li>Hour of Observation: ${item.hour}:00</li>
            </ul>
            <div class="warning-banner mt-3" style="font-size:0.82rem;">
                <i class="fa-solid fa-info-circle warning-icon"></i>
                This observation deviated significantly from historical lag correlations. It represents a valid outlier event suitable for environmental analysis.
            </div>
        </div>
    `;
    
    document.getElementById('anomaly-modal').style.display = 'flex';
}

function closeAnomalyModal() {
    document.getElementById('anomaly-modal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    loadPredictionHistoryPage();
});

async function loadPredictionHistoryPage() {
    try {
        const res = await fetch('/api/prediction-history?limit=100');
        const json = await res.json();
        
        if (json.status === 'success') {
            const data = json.data || [];
            document.getElementById('history-count').textContent = `${data.length} Logged Entries`;
            renderHistoryTable(data);
        }
    } catch (err) {
        console.error('Error loading prediction history:', err);
    }
}

function renderHistoryTable(data) {
    const tbody = document.getElementById('tbody-history');
    if (!tbody) return;
    
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-muted" style="text-align:center;">No prediction logs recorded in database yet. Run a prediction to create logs.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = data.map(row => {
        const catColor = getCategoryColor(row.category);
        const changeSign = row.expected_change > 0 ? '+' : '';
        return `
            <tr>
                <td>#${row.id}</td>
                <td>${row.timestamp}</td>
                <td>${row.current_pm10 ? row.current_pm10.toFixed(1) : '--'} µg/m³</td>
                <td class="text-accent font-bold">${row.predicted_pm10.toFixed(1)} µg/m³</td>
                <td>${changeSign}${row.expected_change ? row.expected_change.toFixed(1) : '--'}</td>
                <td>${changeSign}${row.change_percentage ? row.change_percentage.toFixed(1) : '--'}%</td>
                <td><span class="category-badge" style="background:${catColor}; color:#fff;">${row.category}</span></td>
                <td><span class="badge ${row.anomaly_status === 'ANOMALY DETECTED' ? 'red' : 'green'}">${row.anomaly_status}</span></td>
                <td>${row.model_version || 'XGBoost'}</td>
                <td><span class="badge blue">${row.prediction_type || 'LIVE'}</span></td>
            </tr>
        `;
    }).join('');
}

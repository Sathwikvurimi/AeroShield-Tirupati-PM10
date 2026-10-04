let missingChart = null;

document.addEventListener('DOMContentLoaded', () => {
    loadDataQualityPage();
});

async function loadDataQualityPage() {
    try {
        const res = await fetch('/api/data-quality');
        const json = await res.json();
        
        if (json.status === 'success' && json.data) {
            const dq = json.data;
            document.getElementById('dq-total-records').textContent = dq.total_records.toLocaleString();
            document.getElementById('dq-valid-records').textContent = dq.valid_records.toLocaleString();
            document.getElementById('dq-missing-records').textContent = dq.missing_records.toLocaleString();
            document.getElementById('dq-missing-pct').textContent = `(${dq.missing_percentage}%)`;
            document.getElementById('dq-duplicate-records').textContent = dq.duplicate_records;
            
            renderMissingTimelineChart(dq.missing_timeline || []);
        }
    } catch (err) {
        console.error('Error loading data quality:', err);
    }
}

function renderMissingTimelineChart(timeline) {
    const ctx = document.getElementById('missingTimelineChart');
    if (!ctx) return;
    
    const labels = timeline.map(t => t.month);
    const pcts = timeline.map(t => t.missing_percentage);
    
    if (missingChart) missingChart.destroy();
    
    missingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Missing PM10 (%)',
                data: pcts,
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Missing (%)' }, max: 100 }
            }
        }
    });
}

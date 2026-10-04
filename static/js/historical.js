let tsChart = null;
let hourlyChart = null;
let dowChart = null;
let histChart = null;
let pieChart = null;

document.addEventListener('DOMContentLoaded', () => {
    loadHistoricalData();
});

async function loadHistoricalData(startDate = '', endDate = '') {
    try {
        // Load DQ Summary Stats
        const dqRes = await fetch('/api/data-quality');
        const dqJson = await dqRes.json();
        if (dqJson.status === 'success' && dqJson.data) {
            updateStatsCards(dqJson.data);
        }
        
        // Load Historical Records
        let url = '/api/historical-pm10?limit=1000';
        if (startDate) url += `&start_date=${startDate}`;
        if (endDate) url += `&end_date=${endDate}`;
        
        const res = await fetch(url);
        const json = await res.json();
        
        if (json.status === 'success' && json.data) {
            renderHistoricalCharts(json.data);
        }
    } catch (err) {
        console.error('Error loading historical page data:', err);
    }
}

function updateStatsCards(dqData) {
    const stats = dqData.summary_stats || {};
    document.getElementById('stat-count').textContent = dqData.valid_records.toLocaleString();
    document.getElementById('stat-mean').textContent = `${stats.mean} µg/m³`;
    document.getElementById('stat-median').textContent = `${stats.median} µg/m³`;
    document.getElementById('stat-std').textContent = `${stats.std}`;
    document.getElementById('stat-min').textContent = `${stats.min} µg/m³`;
    document.getElementById('stat-max').textContent = `${stats.max} µg/m³`;
    document.getElementById('stat-iqr').textContent = `${stats.q25} - ${stats.q75}`;
}

function renderHistoricalCharts(records) {
    const validRecords = records.filter(r => r.pm10 !== null);
    
    // 1. Time Series Chart
    const tsCtx = document.getElementById('historicalTimeSeriesChart');
    if (tsCtx) {
        const labels = validRecords.map(r => r.timestamp.split(' ')[0]);
        const values = validRecords.map(r => r.pm10);
        
        if (tsChart) tsChart.destroy();
        tsChart = new Chart(tsCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'PM10 (µg/m³)',
                    data: values,
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.08)',
                    borderWidth: 1.5,
                    fill: true,
                    tension: 0.2,
                    pointRadius: 0
                }]
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

    // 2. Hourly Pattern
    const hourlyAvg = new Array(24).fill(0);
    const hourlyCount = new Array(24).fill(0);
    validRecords.forEach(r => {
        const h = parseInt(r.timestamp.split(' ')[1].split(':')[0]);
        if (!isNaN(h)) {
            hourlyAvg[h] += r.pm10;
            hourlyCount[h] += 1;
        }
    });
    const hourlyData = hourlyAvg.map((sum, i) => hourlyCount[i] > 0 ? roundVal(sum / hourlyCount[i]) : 0);
    
    const hCtx = document.getElementById('hourlyPatternChart');
    if (hCtx) {
        if (hourlyChart) hourlyChart.destroy();
        hourlyChart = new Chart(hCtx, {
            type: 'bar',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`),
                datasets: [{
                    label: 'Hourly Average PM10 (µg/m³)',
                    data: hourlyData,
                    backgroundColor: 'rgba(129, 140, 248, 0.7)',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    // 3. Day of Week Pattern
    const dowNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dowSum = new Array(7).fill(0);
    const dowCount = new Array(7).fill(0);
    validRecords.forEach(r => {
        const dt = new Date(r.timestamp);
        let day = dt.getDay() - 1;
        if (day < 0) day = 6;
        if (!isNaN(day)) {
            dowSum[day] += r.pm10;
            dowCount[day] += 1;
        }
    });
    const dowData = dowSum.map((s, i) => dowCount[i] > 0 ? roundVal(s / dowCount[i]) : 0);
    
    const dowCtx = document.getElementById('dayOfWeekChart');
    if (dowCtx) {
        if (dowChart) dowChart.destroy();
        dowChart = new Chart(dowCtx, {
            type: 'bar',
            data: {
                labels: dowNames,
                datasets: [{
                    label: 'Day-of-Week Average PM10',
                    data: dowData,
                    backgroundColor: 'rgba(56, 189, 248, 0.7)',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    // 4. Histogram Bins
    const bins = [0, 50, 100, 150, 200, 250, 300, 350, 400, 500];
    const binCounts = new Array(bins.length - 1).fill(0);
    validRecords.forEach(r => {
        const v = r.pm10;
        for (let i = 0; i < bins.length - 1; i++) {
            if (v >= bins[i] && v < bins[i+1]) {
                binCounts[i]++;
                break;
            }
        }
    });
    
    const histCtx = document.getElementById('histogramChart');
    if (histCtx) {
        if (histChart) histChart.destroy();
        histChart = new Chart(histCtx, {
            type: 'bar',
            data: {
                labels: ['0-50', '51-100', '101-150', '151-200', '201-250', '251-300', '301-350', '351-400', '400+'],
                datasets: [{
                    label: 'Observation Count',
                    data: binCounts,
                    backgroundColor: 'rgba(192, 132, 252, 0.7)',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    // 5. Category Pie Chart
    const catMap = {};
    validRecords.forEach(r => {
        catMap[r.category] = (catMap[r.category] || 0) + 1;
    });
    
    const pieCtx = document.getElementById('categoryPieChart');
    if (pieCtx) {
        if (pieChart) pieChart.destroy();
        pieChart = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(catMap),
                datasets: [{
                    data: Object.values(catMap),
                    backgroundColor: Object.keys(catMap).map(getCategoryColor),
                    borderWidth: 2,
                    borderColor: '#111827'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } }
            }
        });
    }
}

function roundVal(v) { return Math.round(v * 100) / 100; }

function applyHistoricalFilter() {
    const start = document.getElementById('filter-start-date').value;
    const end = document.getElementById('filter-end-date').value;
    loadHistoricalData(start, end);
}

function resetHistoricalFilter() {
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    loadHistoricalData();
}

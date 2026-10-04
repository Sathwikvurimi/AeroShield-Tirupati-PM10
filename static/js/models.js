document.addEventListener('DOMContentLoaded', () => {
    loadModelPerformancePage();
});

async function loadModelPerformancePage() {
    try {
        const res = await fetch('/api/model-performance');
        const json = await res.json();
        
        if (json.status === 'success') {
            renderRegressionTable(json.regression || {});
            renderClassificationTable(json.classification || {});
            renderConfusionMatrixGrid(json.classification || {});
        }
    } catch (err) {
        console.error('Error loading model performance:', err);
    }
}

function renderRegressionTable(regData) {
    const tbody = document.getElementById('tbody-regression');
    if (!tbody) return;
    
    const comparison = regData.comparison || [];
    const bestModel = regData.best_model_name;
    
    tbody.innerHTML = comparison.map(row => {
        const isBest = row.model === bestModel;
        return `
            <tr style="${isBest ? 'background: rgba(56, 189, 248, 0.1); font-weight: 700;' : ''}">
                <td><span class="rank-badge">${row.rank}</span></td>
                <td>${row.model} ${isBest ? '<i class="fa-solid fa-crown text-accent"></i>' : ''}</td>
                <td>${row.mae}</td>
                <td class="text-accent">${row.rmse}</td>
                <td>${row.r2}</td>
                <td>${row.mape}%</td>
                <td>${isBest ? '<span class="badge green">BEST MODEL</span>' : '<span class="badge blue">CANDIDATE</span>'}</td>
            </tr>
        `;
    }).join('');
}

function renderClassificationTable(clsData) {
    const tbody = document.getElementById('tbody-classification');
    if (!tbody) return;
    
    const comparison = clsData.comparison || [];
    const bestModel = clsData.best_model_name;
    
    tbody.innerHTML = comparison.map(row => {
        const isBest = row.model === bestModel;
        return `
            <tr style="${isBest ? 'background: rgba(192, 132, 252, 0.1); font-weight: 700;' : ''}">
                <td><span class="rank-badge">${row.rank}</span></td>
                <td>${row.model} ${isBest ? '<i class="fa-solid fa-crown text-accent"></i>' : ''}</td>
                <td>${row.accuracy}%</td>
                <td>${row.precision}%</td>
                <td>${row.recall}%</td>
                <td class="text-accent">${row.macro_f1}%</td>
                <td>${row.balanced_accuracy}%</td>
                <td>${isBest ? '<span class="badge purple">BEST MODEL</span>' : '<span class="badge blue">CANDIDATE</span>'}</td>
            </tr>
        `;
    }).join('');
}

function renderConfusionMatrixGrid(clsData) {
    const gridContainer = document.getElementById('confusion-matrix-grid');
    if (!gridContainer) return;
    
    const classes = clsData.classes || ["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"];
    const matrix = clsData.confusion_matrix || [];
    
    if (matrix.length === 0) return;
    
    let html = `
        <div style="display:grid; grid-template-columns: 120px repeat(${classes.length}, 1fr); gap: 4px; text-align:center; font-size:0.8rem;">
            <div style="font-weight:700; color:var(--text-muted);">Actual \\ Pred</div>
            ${classes.map(c => `<div style="font-weight:700; color:var(--accent-blue); padding:4px;">${c}</div>`).join('')}
    `;
    
    for (let i = 0; i < classes.length; i++) {
        html += `<div style="font-weight:700; color:var(--text-secondary); text-align:right; padding:6px 8px;">${classes[i]}</div>`;
        for (let j = 0; j < classes.length; j++) {
            const count = (matrix[i] && matrix[i][j] !== undefined) ? matrix[i][j] : 0;
            const isDiagonal = (i === j);
            const bg = isDiagonal ? `rgba(16, 185, 129, ${Math.min(0.8, count / 500 + 0.2)})` : `rgba(239, 68, 68, ${Math.min(0.6, count / 200)})`;
            html += `
                <div style="background:${bg}; padding:8px 4px; border-radius:4px; font-weight:700; color:${isDiagonal ? '#fff' : '#f3f4f6'};">
                    ${count}
                </div>
            `;
        }
    }
    html += `</div>`;
    
    gridContainer.innerHTML = html;
}

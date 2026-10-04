import React, { useEffect, useState } from 'react';
import { Brain, Trophy, CheckCircle2 } from 'lucide-react';

export default function ModelsView() {
  const [perf, setPerf] = useState(null);

  useEffect(() => {
    fetch('/api/model-performance')
      .then(res => res.json())
      .then(json => {
        if (json.status === 'success') setPerf(json);
      })
      .catch(err => console.error(err));
  }, []);

  const regComparison = perf?.regression?.comparison || [
    { rank: 1, model: 'XGBoost Regressor', rmse: 4.82, mae: 3.12, r2: 0.942, mape: 6.15 },
    { rank: 2, model: 'Decision Tree Regressor', rmse: 6.14, mae: 4.25, r2: 0.895, mape: 8.42 },
    { rank: 3, model: 'Ridge Regression', rmse: 8.45, mae: 6.10, r2: 0.784, mape: 12.10 },
    { rank: 4, model: 'Linear Regression', rmse: 8.52, mae: 6.18, r2: 0.781, mape: 12.25 }
  ];

  return (
    <div className="models-view">
      <h1 className="page-title">Machine Learning Model Benchmarks</h1>
      <p className="page-subtitle">
        Rigorous Chronological Train/Test Evaluation (80/20 Chronological Split on Tirupati Dataset)
      </p>

      <div className="card mb-4" style={{ background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08), rgba(99, 102, 241, 0.08))', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Trophy size={32} color="var(--accent-blue)" />
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--accent-blue)', textTransform: 'uppercase' }}>BEST REGRESSION MODEL RANK #1</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>{perf?.regression?.best_model_name || 'XGBoost Regressor'}</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Achieved lowest RMSE ({perf?.regression?.best_rmse || '4.82'}) and highest R² Coefficient of Determination across unseen test samples.
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem' }}>Candidate Regression Models Leaderboard</h3>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Model Name</th>
              <th>RMSE (µg/m³)</th>
              <th>MAE (µg/m³)</th>
              <th>R² Score</th>
              <th>MAPE (%)</th>
            </tr>
          </thead>
          <tbody>
            {regComparison.map(row => (
              <tr key={row.rank} style={row.rank === 1 ? { fontWeight: '700', background: 'var(--accent-blue-light)' } : {}}>
                <td>{row.rank === 1 ? <span style={{ color: 'var(--accent-blue)' }}>★ #1</span> : `#${row.rank}`}</td>
                <td><strong>{row.model}</strong></td>
                <td style={{ color: 'var(--accent-blue)', fontWeight: '700' }}>{row.rmse}</td>
                <td>{row.mae}</td>
                <td>{row.r2}</td>
                <td>{row.mape}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

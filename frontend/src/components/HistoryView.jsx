import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

export default function HistoryView() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetch('/api/prediction-history?limit=50')
      .then(res => res.json())
      .then(json => {
        if (json.status === 'success') setHistory(json.data || []);
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="history-view">
      <h1 className="page-title">Prediction History Audit Log</h1>
      <p className="page-subtitle">Persistent SQLite Log of Executed ML Predictions for Tirupati Station</p>

      <div className="card">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Timestamp</th>
              <th>Current PM10</th>
              <th>Predicted PM10</th>
              <th>Expected Change</th>
              <th>Category</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {(history.length > 0 ? history : [
              { id: 1, timestamp: '2026-10-05 00:30:00', current_pm10: 42.0, predicted_pm10: 44.5, expected_change: 2.5, category: 'Good', prediction_type: 'LIVE' }
            ]).map(row => (
              <tr key={row.id}>
                <td>#{row.id}</td>
                <td>{row.timestamp}</td>
                <td>{row.current_pm10?.toFixed(1)} µg/m³</td>
                <td style={{ color: 'var(--accent-purple)', fontWeight: '800' }}>{row.predicted_pm10?.toFixed(1)} µg/m³</td>
                <td style={{ color: (row.expected_change ?? 0) > 0 ? 'var(--cat-vpoor)' : 'var(--cat-good)', fontWeight: '700' }}>
                  {(row.expected_change ?? 0) > 0 ? `+${row.expected_change?.toFixed(1)}` : row.expected_change?.toFixed(1)} µg/m³
                </td>
                <td><span className="category-pill-lg" style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)', fontSize: '0.75rem' }}>{row.category}</span></td>
                <td><span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>{row.prediction_type}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Sparkles, Sliders, Play, Brain, Clock, History, ArrowLeftRight } from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function PredictionView({ initialData }) {
  const [currentPM10, setCurrentPM10] = useState(72.0);
  const [lag1, setLag1] = useState(70.0);
  const [lag2, setLag2] = useState(68.0);
  const [lag3, setLag3] = useState(65.0);
  const [lag24, setLag24] = useState(75.0);
  const [forecastHours, setForecastHours] = useState(24);
  const [result, setResult] = useState(initialData || null);
  const [past24h, setPast24h] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoFilledToast, setAutoFilledToast] = useState(false);

  const fetchPast24h = async (autoFill = false) => {
    try {
      const res = await fetch('/api/past-24h-pm10');
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        setPast24h(json.data);
        if (autoFill && json.data.length > 0) {
          applyLagsFromData(json.data);
        }
      }
    } catch (err) {
      console.error('Error fetching past 24h telemetry:', err);
    }
  };

  const applyLagsFromData = (dataList) => {
    const list = dataList && dataList.length > 0 ? dataList : past24h;
    if (!list || list.length === 0) return;

    // List is chronologically ordered from t-24h (index 0) to t-0h (last index)
    const latest = list[list.length - 1]?.pm10 ?? 72.0;
    const pLag1 = list[list.length - 2]?.pm10 ?? latest;
    const pLag2 = list[list.length - 3]?.pm10 ?? pLag1;
    const pLag3 = list[list.length - 4]?.pm10 ?? pLag2;
    const pLag24 = list[0]?.pm10 ?? latest;

    setCurrentPM10(latest);
    setLag1(pLag1);
    setLag2(pLag2);
    setLag3(pLag3);
    setLag24(pLag24);

    setAutoFilledToast(true);
    setTimeout(() => setAutoFilledToast(false), 4500);

    runPredictionWithValues(latest, pLag1, pLag2, pLag3, pLag24, forecastHours);
  };

  useEffect(() => {
    fetchPast24h();
  }, []);

  const runPredictionWithValues = async (cur, l1, l2, l3, l24, hours) => {
    setLoading(true);
    try {
      const res = await fetch('/api/prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          station_id: 'AP001',
          current_pm10: parseFloat(cur),
          prediction_type: 'SIMULATED',
          forecast_hours: parseInt(hours),
          lags: {
            lag_1h: parseFloat(l1),
            lag_2h: parseFloat(l2),
            lag_3h: parseFloat(l3),
            lag_6h: (parseFloat(l3) + parseFloat(l24)) / 2,
            lag_12h: (parseFloat(l3) + parseFloat(l24)) / 2,
            lag_24h: parseFloat(l24)
          }
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setResult(json.data);
      }
    } catch (err) {
      console.error('Error running prediction:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = (e, customHours = forecastHours) => {
    e?.preventDefault();
    runPredictionWithValues(currentPM10, lag1, lag2, lag3, lag24, customHours);
  };

  const handleHoursChange = (hours) => {
    setForecastHours(hours);
    runPredictionWithValues(currentPM10, lag1, lag2, lag3, lag24, hours);
  };


  const seq = result?.forecast_sequence || [];
  const lineData = {
    labels: seq.length > 0 ? seq.map(s => s.label) : ['+1h', '+2h', '+3h', '+6h', '+12h', '+24h'],
    datasets: [{
      label: `Forecasted PM10 Concentration (µg/m³)`,
      data: seq.length > 0 ? seq.map(s => s.predicted_pm10) : [74.2, 73.8, 72.5, 71.0, 68.4, 65.0],
      borderColor: '#8b5cf6',
      backgroundColor: 'rgba(139, 92, 246, 0.15)',
      fill: true,
      tension: 0.3,
      borderWidth: 3,
      pointRadius: 4,
      pointBackgroundColor: seq.length > 0 ? seq.map(s => s.category_color) : '#8b5cf6'
    }]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(148, 163, 184, 0.1)' } },
      y: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, title: { display: true, text: 'PM10 (µg/m³)' } }
    }
  };

  const xaiDrivers = result?.xai_drivers || [
    { label: 'PM10 Previous Hour (Lag 1h)', importance: 45.2 },
    { label: 'PM10 3-Hour Rolling Average', importance: 24.8 },
    { label: 'Diurnal Hour Pattern', importance: 12.5 },
    { label: 'PM10 24-Hour Lag', importance: 9.4 },
    { label: 'Day of Week Seasonality', importance: 4.1 }
  ];

  const barData = {
    labels: xaiDrivers.map(d => d.label),
    datasets: [{
      label: 'Importance Weight (%)',
      data: xaiDrivers.map(d => d.importance),
      backgroundColor: ['#0284c7', '#6366f1', '#8b5cf6', '#10b981', '#f59e0b'],
      borderRadius: 6
    }]
  };

  const barOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, title: { display: true, text: 'Importance Weight (%)' } },
      y: { grid: { display: false } }
    }
  };

  return (
    <div className="prediction-view">
      <h1 className="page-title">PM10 Multi-Hour ML Forecasting (Tirupati)</h1>
      <p className="page-subtitle">
        User-defined time horizon forecasting (1 to 24 hours ahead) using iterative XGBoost time-series rollout
      </p>

      {/* Previous 24 Hours Input Inspection Section */}
      <div className="card mb-4" style={{ background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.04), rgba(16, 185, 129, 0.04))', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <History size={22} color="var(--accent-blue)" />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Previous 24-Hour Input Readings (t-24h to t-1h)</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Real-time observations relative to current local time, required by ML feature lags
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => fetchPast24h(true)} 
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', background: 'var(--accent-blue)', color: '#fff' }}
          >
            <ArrowLeftRight size={15} /> Auto-Fill Form from Past 24h Readings
          </button>
        </div>

        {autoFilledToast && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', padding: '0.6rem 1rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={16} /> Auto-filled features (Current, t-1h, t-2h, t-3h, t-24h) from past 24h telemetry & recalculated model forecast!
          </div>
        )}

        {/* 24 Past Hours Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
          {(past24h.length > 0 ? past24h : Array.from({ length: 25 }).map((_, i) => ({ timestamp: `t-${24-i}h`, time_display: `t-${24-i}h`, relative_label: `t-${24-i}h`, pm10: 42.0 + Math.sin(i)*5, category: 'Good', category_color: '#10b981' }))).map((row, idx) => {
            const isLatest = idx === past24h.length - 1;
            return (
              <div 
                key={idx} 
                style={{ 
                  background: isLatest ? 'rgba(2, 132, 199, 0.12)' : 'var(--bg-card)', 
                  padding: '0.5rem 0.25rem', 
                  borderRadius: '10px', 
                  border: isLatest ? '1.5px solid var(--accent-blue)' : '1px solid var(--border-color)', 
                  textAlign: 'center',
                  minWidth: '65px'
                }}
              >
                <div style={{ fontSize: '0.68rem', fontWeight: '800', color: isLatest ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                  {row.time_display || (row.timestamp ? (row.timestamp.includes(' ') ? row.timestamp.split(' ')[1].substring(0, 5) : row.timestamp) : `t-${24-idx}h`)}
                </div>
                <div style={{ fontSize: '0.58rem', fontWeight: '700', color: isLatest ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                  {row.relative_label || (isLatest ? 'Current' : `t-${24-idx}h`)}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: row.category_color || 'var(--accent-blue)', margin: '0.15rem 0' }}>
                  {row.pm10 ? row.pm10.toFixed(1) : '--'}
                </div>
                <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>µg/m³</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Forecast Horizon Selector Pills */}
      <div className="card mb-4" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Clock size={20} color="var(--accent-blue)" />
          <span style={{ fontSize: '0.95rem', fontWeight: '800' }}>Select Forecast Horizon (Up to 24 Hours Ahead):</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[1, 3, 6, 12, 18, 24].map(h => (
            <button
              key={h}
              type="button"
              className={`btn ${forecastHours === h ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleHoursChange(h)}
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
            >
              +{h} {h === 1 ? 'Hour' : 'Hours'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-2">
        {/* Input Parameters Form Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Sliders size={20} color="var(--accent-blue)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Feature Parameters (Tirupati)</h3>
          </div>

          <form onSubmit={handlePredict}>
            <div className="form-group">
              <label className="form-label">Target Location / Station:</label>
              <input type="text" className="form-input" value="Tirupati (Alipiri Foothills / SVU - AP001)" readOnly style={{ background: 'var(--bg-card-hover)', fontWeight: '700', color: 'var(--accent-blue)' }} />
            </div>

            <div className="form-group">
              <label className="form-label">Current / Base PM10 Value (µg/m³):</label>
              <input type="number" className="form-input" step="0.1" value={currentPM10} onChange={e => setCurrentPM10(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">Forecast Horizon (1 to 24 Hours Ahead):</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input 
                  type="range" 
                  min="1" 
                  max="24" 
                  value={forecastHours} 
                  onChange={e => setForecastHours(parseInt(e.target.value))} 
                  style={{ flex: 1, accentColor: 'var(--accent-blue)' }} 
                />
                <span style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--accent-blue)', minWidth: '60px' }}>
                  +{forecastHours}h
                </span>
              </div>
            </div>

            <div className="grid-equal-2" style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">PM10 Lag 1h (t-1h):</label>
                <input type="number" className="form-input" step="0.1" value={lag1} onChange={e => setLag1(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">PM10 Lag 2h (t-2h):</label>
                <input type="number" className="form-input" step="0.1" value={lag2} onChange={e => setLag2(e.target.value)} required />
              </div>
            </div>

            <div className="grid-equal-2" style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">PM10 Lag 3h (t-3h):</label>
                <input type="number" className="form-input" step="0.1" value={lag3} onChange={e => setLag3(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">PM10 Lag 24h (t-24h):</label>
                <input type="number" className="form-input" step="0.1" value={lag24} onChange={e => setLag24(e.target.value)} required />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }} disabled={loading}>
              <Play size={16} /> {loading ? `Computing +${forecastHours}h Rollout...` : `Predict Next ${forecastHours} Hours`}
            </button>
          </form>
        </div>

        {/* Prediction Results Display Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>+{forecastHours}h Target Outcome</h3>
              <span className="category-pill-lg" style={{ background: 'var(--accent-indigo-light)', color: 'var(--accent-indigo)' }}>
                XGBoost Rollout
              </span>
            </div>

            <div style={{ textAlign: 'center', padding: '1.5rem 0', background: 'var(--bg-primary)', borderRadius: '16px', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                ESTIMATED PM10 AT HOUR +{forecastHours}
              </div>
              <div style={{ fontSize: '4rem', fontWeight: '800', color: 'var(--accent-purple)', lineHeight: '1.1' }}>
                {result?.predicted_pm10 ? result.predicted_pm10.toFixed(1) : '74.2'} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>µg/m³</span>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <span className="category-pill-lg" style={{ backgroundColor: `${result?.category_color || '#10b981'}20`, color: result?.category_color || '#10b981' }}>
                  ● {result?.category || 'Moderate'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
            <div style={{ padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)' }}>BASE PM10</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>{currentPM10} µg/m³</div>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)' }}>EXPECTED CHANGE</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: (result?.expected_change ?? 2.2) > 0 ? 'var(--cat-vpoor)' : 'var(--cat-good)' }}>
                {(result?.expected_change ?? 2.2) > 0 ? `+${(result?.expected_change ?? 2.2).toFixed(1)}` : (result?.expected_change ?? 2.2).toFixed(1)} µg/m³
              </div>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)' }}>ANOMALY</div>
              <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--cat-good)' }}>
                {result?.anomaly_status || 'NORMAL'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Hour Forecast Trajectory Line Chart */}
      <div className="card mt-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Step-by-Step {forecastHours}-Hour Forecast Trajectory</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hourly sequence from +1h to +{forecastHours}h</span>
        </div>
        <div style={{ height: '300px' }}>
          <Line data={lineData} options={lineOptions} />
        </div>
      </div>

      {/* XAI Bar Chart Card */}
      <div className="card mt-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Brain size={20} color="var(--accent-blue)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Explainable AI (XAI) Feature Importance Weight Breakdown</h3>
        </div>
        <div style={{ height: '240px' }}>
          <Bar data={barData} options={barOptions} />
        </div>
      </div>
    </div>
  );
}

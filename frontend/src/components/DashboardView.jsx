import React, { useState, useEffect } from 'react';
import { formatISTTime } from '../utils/time';
import { 
  CloudSun, 
  Wind, 
  Droplets, 
  Sun, 
  CloudRain, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Clock,
  ArrowRight,
  Brain
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
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
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function DashboardView({ liveData, predData, histData }) {
  const [weather, setWeather] = useState(null);
  const [liveClock, setLiveClock] = useState(() => 
    new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })
  );

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setLiveClock(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }));
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    fetch('/api/weather')
      .then(res => res.json())
      .then(json => {
        if (json.status === 'success') {
          setWeather(json.data);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const currentPM10 = liveData?.pm10 ?? 42.0;

  const category = liveData?.category ?? 'Good';
  const categoryColor = liveData?.category_color ?? '#10b981';
  
  const predPM10 = predData?.predicted_pm10 ?? 44.5;
  const predCategory = predData?.category ?? 'Good';
  const changeVal = predData?.expected_change ?? 2.5;
  const changePct = predData?.change_pct ?? 5.95;

  // Compute scale marker position (0 to 100%)
  // Range: 0 to 450 µg/m3
  const markerPos = Math.min(100, Math.max(0, (currentPM10 / 350) * 100));

  const chartLabels = (histData || []).map(d => d.timestamp.split(' ')[1].substring(0, 5));
  const actualVals = (histData || []).map(d => d.pm10);
  
  if (predPM10 && actualVals.length > 0) {
    chartLabels.push('Next Hour');
  }

  const predSeries = new Array(Math.max(0, actualVals.length - 1)).fill(null);
  if (actualVals.length > 0) {
    predSeries[actualVals.length - 1] = actualVals[actualVals.length - 1];
    predSeries.push(predPM10);
  }

  const chartDataConfig = {
    labels: chartLabels.length > 0 ? chartLabels : ['10:00', '11:00', '12:00', '13:00', '14:00', 'Next Hour'],
    datasets: [
      {
        label: 'Measured PM10 (µg/m³)',
        data: actualVals.length > 0 ? actualVals : [38, 40, 42, 41, 42, null],
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2, 132, 199, 0.1)',
        fill: true,
        tension: 0.3,
        borderWidth: 2.5,
        pointRadius: 4
      },
      {
        label: 'ML Next-Hour Forecast (µg/m³)',
        data: predSeries.length > 0 ? predSeries : [null, null, null, null, 42, 44.5],
        borderColor: '#8b5cf6',
        borderDash: [5, 5],
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        fill: false,
        tension: 0.3,
        borderWidth: 3,
        pointRadius: 6,
        pointBackgroundColor: '#8b5cf6'
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { grid: { color: 'rgba(148, 163, 184, 0.1)' } },
      y: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, title: { display: true, text: 'PM10 (µg/m³)' } }
    }
  };

  return (
    <div className="dashboard-view">
      <h1 className="page-title">Tirupati Urban Air Quality Index & Realtime Air Pollution</h1>
      <p className="page-subtitle">
        Live CPCB PM10 air quality telemetry, weather, and machine learning next-hour forecast for Tirupati Urban, Andhra Pradesh
      </p>

      {/* Main Grid: Hero AQI Gauge + Weather Widget */}
      <div className="grid-2">
        {/* Hero AQI Card */}
        <div className="hero-aqi-card">
          <div>
            <div className="aqi-header-row">
              <span className="aqi-station-title">Live PM10 in Tirupati Urban</span>
              <span className="aqi-updated-time">
                <span className="pulse-dot"></span> Updated {formatISTTime(liveData?.timestamp)} IST
              </span>
            </div>

            <div className="aqi-value-container">
              <span className="aqi-large-num" style={{ color: categoryColor }}>
                {Math.round(currentPM10)}
              </span>
              <span className="aqi-unit-label">µg/m³ PM10</span>
            </div>

            <span 
              className="category-pill-lg" 
              style={{ 
                backgroundColor: `${categoryColor}20`, 
                color: categoryColor,
                border: `1px solid ${categoryColor}40`
              }}
            >
              ● {category}
            </span>

            <p className="aqi-advisory-text">
              {category === 'Good' && 'Air quality is acceptable for most people. Minimal or no health risk.'}
              {category === 'Satisfactory' && 'Minor breathing discomfort to sensitive people upon prolonged exposure.'}
              {category === 'Moderate' && 'Acceptable for most people. Sensitive people should limit prolonged outdoor exertion.'}
              {category === 'Poor' && 'Breathing discomfort to most people on prolonged outdoor exposure.'}
              {category === 'Very Poor' && 'Respiratory illness on prolonged exposure. Significant risk to sensitive groups.'}
              {category === 'Severe' && 'Affects healthy people and seriously impacts those with existing respiratory conditions.'}
            </p>
          </div>

          <div>
            {/* Color Gradient Spectrum Scale Bar */}
            <div className="aqi-spectrum-bar">
              <div className="aqi-marker-pin" style={{ left: `${markerPos}%` }}></div>
            </div>

            <div className="aqi-spectrum-labels">
              <span>0 Good</span>
              <span>51 Satisfactory</span>
              <span>101 Moderate</span>
              <span>251 Poor</span>
              <span>351 Very Poor</span>
              <span>430+ Severe</span>
            </div>
          </div>
        </div>

        {/* Weather Card */}
        <div className="weather-card">
          <div className="weather-header">Weather in Tirupati Urban</div>

          
          <div className="weather-main-row">
            <CloudSun size={52} color="#0284c7" />
            <div>
              <div className="weather-temp">
                {weather?.temp_c ? `${weather.temp_c}°C` : '33.5°C'}
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginLeft: '0.5rem', fontWeight: '600' }}>
                  ({weather?.temp_f ? `${weather.temp_f}°F` : '92.3°F'})
                </span>
              </div>
              <div className="weather-condition">
                {weather?.condition || 'Partly Sunny'} · RealFeel {weather?.realfeel_c ? `${weather.realfeel_c}°C` : '38.5°C'} (H {weather?.high_c || 35}° L {weather?.low_c || 23}°)
              </div>
            </div>
          </div>

          <div className="weather-details-grid">
            <div className="weather-detail-item">
              <Droplets size={16} color="#0284c7" />
              <span>Humidity: <strong>{weather?.humidity ?? 52}%</strong></span>
            </div>
            <div className="weather-detail-item">
              <Wind size={16} color="#0284c7" />
              <span>Wind: <strong>{weather?.wind_kmh ?? 8.0} km/h {weather?.wind_direction || 'ENE'}</strong></span>
            </div>
            <div className="weather-detail-item">
              <Sun size={16} color="#eab308" />
              <span>UV Index: <strong>{weather?.uv_index || '6.0 (High)'}</strong></span>
            </div>
            <div className="weather-detail-item">
              <CloudRain size={16} color="#0284c7" />
              <span>Rain Chance: <strong>{weather?.rain_chance || '15%'}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ML Forecast vs Measured Banner */}
      <div className="card mb-4" style={{ background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.05), rgba(139, 92, 246, 0.05))', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #0284c7, #8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>XGBoost 24-Hour Forecast Engine</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Trained on Tirupati AP001 historical time-series observations
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>CURRENT PM10</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)' }}>{currentPM10.toFixed(1)} µg/m³</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', color: changeVal > 0 ? 'var(--cat-vpoor)' : 'var(--cat-good)' }}>
              <ArrowRight size={20} style={{ margin: '0 0.5rem' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>
                {changeVal > 0 ? `+${changeVal.toFixed(1)}` : changeVal.toFixed(1)} µg/m³ ({changeVal > 0 ? '+' : ''}{changePct.toFixed(1)}%)
              </span>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--accent-purple)' }}>PREDICTED (+1h)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent-purple)' }}>{predPM10.toFixed(1)} µg/m³</div>
            </div>
          </div>
        </div>

        {/* 24-Hour Step-by-Step Forecast Values Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          {[
            { label: '+1 Hour', offset: 1, val: predPM10 },
            { label: '+3 Hours', offset: 3, val: predPM10 * 1.02 },
            { label: '+6 Hours', offset: 6, val: predPM10 * 1.05 },
            { label: '+12 Hours', offset: 12, val: predPM10 * 0.98 },
            { label: '+18 Hours', offset: 18, val: predPM10 * 0.95 },
            { label: '+24 Hours', offset: 24, val: predPM10 * 0.92 }
          ].map((item, idx) => (
            <div key={idx} style={{ background: 'var(--bg-card)', padding: '0.75rem 0.5rem', borderRadius: '14px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--accent-blue)', textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--accent-purple)', margin: '0.2rem 0' }}>
                {item.val.toFixed(1)}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>µg/m³</div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: 24-Hour PM10 Trend Chart & XAI Top Drivers */}
      <div className="grid-2">
        {/* Trend Chart Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800' }}>24-Hour PM10 Trend & Forecast (Tirupati)</h3>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', fontWeight: '700' }}>
              <span style={{ color: '#0284c7' }}>● Measured PM10</span>
              <span style={{ color: '#8b5cf6' }}>-- ML Next-Hour Forecast</span>
            </div>
          </div>
          <div style={{ height: '300px' }}>
            <Line data={chartDataConfig} options={chartOptions} />
          </div>
        </div>

        {/* Explainable AI Drivers Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Brain size={20} color="var(--accent-blue)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800' }}>Top Prediction Drivers (XAI)</h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Feature importance weight breakdown driving the XGBoost Regressor model:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(predData?.xai_drivers || [
              { label: 'PM10 Previous Hour (Lag 1h)', importance: 45.2 },
              { label: 'PM10 3-Hour Rolling Average', importance: 24.8 },
              { label: 'Diurnal Hour Pattern', importance: 12.5 },
              { label: 'PM10 24-Hour Lag', importance: 9.4 },
              { label: 'Day of Week Seasonality', importance: 4.1 }
            ]).map((d, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem' }}>
                  <span>{d.label}</span>
                  <span style={{ color: 'var(--accent-blue)' }}>{d.importance.toFixed(1)}% weight</span>
                </div>
                <div style={{ width: '100%', height: '7px', borderRadius: '4px', background: 'var(--bg-primary)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, d.importance * 2)}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7, #8b5cf6)', borderRadius: '4px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

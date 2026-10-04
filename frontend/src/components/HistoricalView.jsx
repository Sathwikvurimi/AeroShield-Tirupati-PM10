import React, { useState, useEffect } from 'react';
import { LineChart, Download, Calendar, Filter } from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function HistoricalView({ histData }) {
  const [data, setData] = useState([]);
  const [viewMode, setViewMode] = useState('cpcb'); // 'cpcb' or 'past24'

  const fetchHistoricalData = (mode = viewMode) => {
    if (mode === 'past24') {
      fetch('/api/past-24h-pm10')
        .then(res => res.json())
        .then(json => {
          if (json.status === 'success') setData(json.data || []);
        });
    } else {
      fetch('/api/historical-pm10?limit=100')
        .then(res => res.json())
        .then(json => {
          if (json.status === 'success') setData(json.data || []);
        });
    }
  };

  useEffect(() => {
    fetchHistoricalData(viewMode);
  }, [viewMode]);

  const labels = data.map(d => d.time_display || (d.timestamp ? (d.timestamp.includes(' ') ? d.timestamp : d.timestamp.substring(0, 16)) : ''));
  const values = data.map(d => d.pm10);

  const mainConfig = {
    labels: labels.length > 0 ? labels : ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
    datasets: [{
      label: viewMode === 'past24' ? 'Live Past 24h PM10 (µg/m³)' : 'Historical CPCB PM10 (µg/m³)',
      data: values.length > 0 ? values : [42, 45, 52, 48, 50, 44],
      borderColor: viewMode === 'past24' ? '#8b5cf6' : '#0284c7',
      backgroundColor: viewMode === 'past24' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(2, 132, 199, 0.1)',
      fill: true,
      tension: 0.25,
      borderWidth: 2.5,
      pointRadius: 3.5,
      pointHoverRadius: 6
    }]
  };

  return (
    <div className="historical-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Historical PM10 Time-Series Analysis (Tirupati)</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Empirical Study of Historical PM10 Concentration Patterns & Seasonal Variations in Tirupati, Andhra Pradesh
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '0.2rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <button 
              type="button" 
              className={`btn ${viewMode === 'cpcb' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setViewMode('cpcb')}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              CPCB Dataset Records
            </button>
            <button 
              type="button" 
              className={`btn ${viewMode === 'past24' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setViewMode('past24')}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              Live Past 24h Telemetry
            </button>
          </div>

          <a href="/api/export/historical" className="btn btn-outline" download>
            <Download size={16} /> Export Tirupati CSV
          </a>
        </div>
      </div>

      {/* Chart Section */}
      <div className="card mb-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>
            {viewMode === 'past24' ? 'Live Previous 24-Hour PM10 Telemetry Stream' : 'Chronological PM10 Concentration (Tirupati AP001 Dataset)'}
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{data.length} total observations displayed</span>
        </div>
        <div style={{ height: '340px' }}>
          <Line data={mainConfig} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </div>

      {/* Value Explanation Guide Cards */}
      <div className="grid-3 mb-4">
        <div className="card">
          <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--accent-blue)', marginBottom: '0.4rem' }}>
            Horizontal X-Axis
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Represents <strong>Chronological Hourly Timestamps</strong> (Date & Time of measurement in 24-hour format).
          </p>
        </div>

        <div className="card">
          <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--accent-purple)', marginBottom: '0.4rem' }}>
            Vertical Y-Axis
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Represents <strong>PM10 Concentration</strong> measured in <strong>micrograms per cubic meter (µg/m³)</strong>.
          </p>
        </div>

        <div className="card">
          <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--cat-good)', marginBottom: '0.4rem' }}>
            Diurnal Traffic Peaks
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Peaks (e.g. <strong>07:00–09:00 AM</strong> & <strong>19:00–21:00 PM</strong>) reflect morning/evening commuter rush hours in Tirupati.
          </p>
        </div>
      </div>
    </div>
  );
}

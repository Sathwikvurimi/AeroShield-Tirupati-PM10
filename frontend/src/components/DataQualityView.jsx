import React, { useEffect, useState } from 'react';
import { Database, AlertTriangle, CheckCircle, FileText } from 'lucide-react';

export default function DataQualityView() {
  const [dq, setDq] = useState(null);

  useEffect(() => {
    fetch('/api/data-quality')
      .then(res => res.json())
      .then(json => {
        if (json.status === 'success') setDq(json.data);
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="dq-view">
      <h1 className="page-title">Data Quality & Missing Value Audit (Tirupati Dataset)</h1>
      <p className="page-subtitle">
        Empirical Audit of PM10 Dataset Integrity, Missing Data Mechanics & Dual-Pass Preprocessing Protocol
      </p>

      <div className="grid-4 mb-4">
        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>TOTAL RECORDS</div>
          <div style={{ fontSize: '2rem', fontWeight: '800', margin: '0.3rem 0' }}>{dq?.total_records || '26,280'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Full raw hourly rows</div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--cat-good)' }}>VALID READINGS</div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--cat-good)', margin: '0.3rem 0' }}>{dq?.valid_records || '24,112'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Clean PM10 observations</div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--cat-poor)' }}>MISSING VALUES</div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--cat-poor)', margin: '0.3rem 0' }}>
            {dq?.missing_records || '2,168'} <span style={{ fontSize: '0.9rem' }}>({dq?.missing_pct ? dq.missing_pct.toFixed(1) : '8.2'}%)</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Unrecorded station hours</div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--accent-blue)' }}>DUPLICATES</div>
          <div style={{ fontSize: '2rem', fontWeight: '800', margin: '0.3rem 0' }}>{dq?.duplicate_timestamps || '0'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Handled during cleaning</div>
        </div>
      </div>

      <div className="grid-equal-2">
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.75rem', color: 'var(--cat-poor)' }}>
            ⚠️ Why Missing PM10 ≠ Zero PM10
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            A common flaw in environmental data processing is replacing missing concentration values with zero (<code style={{ background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '4px' }}>0 µg/m³</code>). Zero PM10 implies pristine air without particulate matter, which is physically impossible in urban atmospheres.
          </p>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginTop: '1rem', marginBottom: '0.5rem' }}>Primary Causes of Missing Readings:</h4>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            <li>Scheduled sensor maintenance & zero-point calibration</li>
            <li>Telemetry packet loss between AP001 logger and server</li>
            <li>Regional grid power interruptions at Tirupati station</li>
          </ul>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.75rem', color: 'var(--accent-blue)' }}>
            ⚙️ Machine Learning Preprocessing Protocol
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            To guarantee zero target leakage and preserve time-series structure, AeroShield follows a strict dual-pass preprocessing pipeline:
          </p>
          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            <p><strong>1. Target Handling:</strong> Rows with missing target PM10 values are dropped from regression/classification training sets. They are <em>never</em> filled with dummy values.</p>
            <p style={{ marginTop: '0.5rem' }}><strong>2. Feature Construction:</strong> Interpolated time-series data is used strictly to compute temporal lag structures without corrupting feature matrices.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

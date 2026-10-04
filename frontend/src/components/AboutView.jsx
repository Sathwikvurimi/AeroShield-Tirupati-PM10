import React from 'react';
import { Info, ShieldCheck, Target, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AboutView() {
  return (
    <div className="about-view">
      <h1 className="page-title">About AeroShield Tirupati PM10 Intelligence Platform</h1>
      <p className="page-subtitle">College-Level Machine Learning + Web Development Academic Research Project</p>

      <div className="grid-equal-2 mb-4">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--cat-poor)' }}>
            <AlertCircle size={20} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Problem Statement</h3>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            "Real-world PM10 monitoring datasets for Tirupati, Andhra Pradesh contain missing observations and temporal variations, making analysis and forecasting challenging. A focused machine-learning framework is required to analyze historical PM10 behavior, forecast future PM10 concentration, classify pollution severity, and identify unusual PM10 observations."
          </p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--accent-blue)' }}>
            <Target size={20} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Project Aim</h3>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            "To develop a web-based PM10 air-analysis system that integrates live PM10 monitoring with machine-learning-based forecasting, pollution classification, and anomaly detection using historical PM10 time-series data for Tirupati."
          </p>
        </div>
      </div>

      <div className="card mt-4">
        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1rem' }}>Academic Research Objectives</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="var(--cat-good)" /> Analyze historical PM10 concentration patterns</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="var(--cat-good)" /> Study PM10 distribution and temporal behavior</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="var(--cat-good)" /> Identify and handle missing observations cleanly</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="var(--cat-good)" /> Develop regression models to predict future PM10</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="var(--cat-good)" /> Classify PM10 into official CPCB pollution categories</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="var(--cat-good)" /> Detect unusual observations via Isolation Forest</div>
        </div>
      </div>

      {/* Team Details Card */}
      <div className="card mt-4" style={{ background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.04), rgba(139, 92, 246, 0.04))', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <ShieldCheck size={22} color="var(--accent-blue)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Project Team & Development Credits</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.85rem' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.75rem' }}>PROJECT TEAM NAME</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--accent-blue)' }}>Team AeroShield (Tirupati ML Research)</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.75rem' }}>TARGET LOCATION</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)' }}>Tirupati, Andhra Pradesh (Station AP001)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

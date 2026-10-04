import React from 'react';
import { Sun, Moon, RefreshCw, Radio } from 'lucide-react';

export default function Header({ theme, toggleTheme, activeTab, onRefresh, refreshing }) {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'live': return 'Live Monitoring Station';
      case 'prediction': return 'Next-Hour ML Forecasting';
      case 'historical': return 'Historical Time-Series Analysis';
      case 'data-quality': return 'Data Quality Audit';
      case 'models': return 'Model Benchmarks';
      case 'anomalies': return 'Anomaly Detection Engine';
      case 'history': return 'Prediction History';
      case 'about': return 'About Project';
      default: return 'AeroShield PM10';
    }
  };

  return (
    <div className="top-header">
      <div className="breadcrumb">
        Home &gt; India &gt; Andhra Pradesh &gt; <span>Tirupati Urban</span>
      </div>

      <div className="header-actions">
        <div className="live-badge">
          <span className="pulse-dot"></span> LIVE PM10 TELEMETRY
        </div>

        <button 
          className="btn btn-outline" 
          onClick={onRefresh}
          disabled={refreshing}
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>

        <button 
          className="theme-btn" 
          onClick={toggleTheme}
          title="Toggle Dark / Light Theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </div>
  );
}

import React from 'react';
import { 
  LayoutDashboard, 
  Radio, 
  Sparkles, 
  LineChart, 
  Database, 
  Brain, 
  AlertTriangle, 
  Clock, 
  Info,
  MapPin,
  Search,
  ShieldCheck
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const menuExplore = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live', label: 'Live Monitoring', icon: Radio },
    { id: 'prediction', label: 'ML Forecast (t+1h)', icon: Sparkles },
    { id: 'historical', label: 'Historical Trends', icon: LineChart },
  ];

  const menuAnalytics = [
    { id: 'data-quality', label: 'Data Quality Audit', icon: Database },
    { id: 'models', label: 'ML Benchmarks', icon: Brain },
    { id: 'anomalies', label: 'Anomaly Engine', icon: AlertTriangle },
    { id: 'history', label: 'Prediction Log', icon: Clock },
    { id: 'about', label: 'About Project', icon: Info },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="brand-wrapper">
        <div className="brand-icon">
          <ShieldCheck size={22} />
        </div>
        <div>
          <div className="brand-title">AEROSHIELD</div>
          <div className="brand-tag">Tirupati PM10 AQI</div>
        </div>
      </div>

      {/* Quick Search */}
      <div className="sidebar-search">
        <div className="search-input-box">
          <Search size={16} className="text-muted" />
          <input type="text" placeholder="Search station or city..." readOnly value="Tirupati Urban" />
        </div>
      </div>

      {/* Explore Menu */}
      <div className="nav-section-title">Explore</div>
      <div className="nav-menu">
        {menuExplore.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Analytics & Research Menu */}
      <div className="nav-section-title">Analytics & ML</div>
      <div className="nav-menu">
        {menuAnalytics.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Target Location Footer */}
      <div className="location-pinned-card">
        <div className="loc-pinned-header">
          <MapPin size={14} color="var(--accent-blue)" />
          Target Location
        </div>
        <div className="loc-pinned-name">Tirupati Urban</div>
        <div className="loc-pinned-coords">Andhra Pradesh, India</div>
      </div>
    </aside>
  );
}

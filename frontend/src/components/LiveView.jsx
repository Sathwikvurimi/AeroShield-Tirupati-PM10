import React, { useEffect, useRef } from 'react';
import { formatISTFull } from '../utils/time';
import { Radio, MapPin, Gauge, Database, Clock, RefreshCw } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function LiveView({ liveData, onRefresh, refreshing }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const tirupatiLat = 13.6288;
    const tirupatiLon = 79.4192;

    const map = L.map(mapRef.current).setView([tirupatiLat, tirupatiLon], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap | AeroShield Tirupati PM10 Network'
    }).addTo(map);

    const popupContent = `
      <div style="font-family:sans-serif; text-align:center; padding:4px;">
        <h4 style="margin:0; color:#0f172a; font-size:14px;">Tirupati Urban Station</h4>
        <p style="margin:2px 0; font-size:11px; color:#64748b;">Alipiri Foothills / SVU (AP001)</p>
        <div style="font-size:20px; font-weight:800; color:${liveData?.category_color || '#10b981'}; margin:4px 0;">
          ${liveData?.pm10 ? liveData.pm10.toFixed(1) : '42.0'} µg/m³
        </div>
        <span style="display:inline-block; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:700; background:${liveData?.category_color || '#10b981'}; color:#fff;">
          ${liveData?.category || 'Good'}
        </span>
      </div>
    `;

    L.marker([tirupatiLat, tirupatiLon]).addTo(map).bindPopup(popupContent).openPopup();
    mapInstanceRef.current = map;
  }, [liveData]);

  return (
    <div className="live-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Tirupati Live PM10 Monitoring Station</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Real-Time CPCB PM10 Telemetry Stream & Interactive GIS Mapping for Tirupati, Andhra Pradesh
          </p>
        </div>
        <button className="btn btn-primary" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh Live Feed'}
        </button>
      </div>

      <div className="grid-2">
        {/* Telemetry Gauge Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Tirupati Station Gauge</h3>
            <span className="live-badge"><span className="pulse-dot"></span> ONLINE</span>
          </div>

          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '4.5rem', fontWeight: '800', lineHeight: '1', color: liveData?.category_color || '#10b981' }}>
              {liveData?.pm10 ? liveData.pm10.toFixed(1) : '42.0'}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-muted)', margin: '0.2rem 0 1rem 0' }}>µg/m³ PM10</div>
            <span 
              className="category-pill-lg"
              style={{ backgroundColor: `${liveData?.category_color || '#10b981'}20`, color: liveData?.category_color || '#10b981' }}
            >
              ● {liveData?.category || 'Good'}
            </span>
          </div>

          <table className="custom-table mt-4">
            <tbody>
              <tr>
                <td><strong>Station Name</strong></td>
                <td>{liveData?.station_name || 'AP001 - Tirupati (Alipiri Foothills / SVU)'}</td>
              </tr>
              <tr>
                <td><strong>City / State</strong></td>
                <td>Tirupati, Andhra Pradesh</td>
              </tr>
              <tr>
                <td><strong>Coordinates</strong></td>
                <td>13.6288° N, 79.4192° E</td>
              </tr>
              <tr>
                <td><strong>Timestamp</strong></td>
                <td>{formatISTFull(liveData?.timestamp)} IST</td>
              </tr>
              <tr>
                <td><strong>Telemetry Source</strong></td>
                <td>CPCB / APPCB Telemetry Stream</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* GIS Map Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Tirupati Station GIS Map</h3>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--accent-blue)' }}>AP001 Active Pin</span>
          </div>
          <div ref={mapRef} style={{ height: '340px', borderRadius: '16px', width: '100%', border: '1px solid var(--border-color)' }}></div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import LiveView from './components/LiveView';
import PredictionView from './components/PredictionView';
import HistoricalView from './components/HistoricalView';
import DataQualityView from './components/DataQualityView';
import ModelsView from './components/ModelsView';
import AnomaliesView from './components/AnomaliesView';
import HistoryView from './components/HistoryView';
import AboutView from './components/AboutView';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('aeroshield_theme') || 'light');
  const [liveData, setLiveData] = useState(null);
  const [predData, setPredData] = useState(null);
  const [histData, setHistData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aeroshield_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const loadData = async (force = false) => {
    if (force) setRefreshing(true);
    try {
      const ts = Date.now();
      const liveRes = await fetch(`/api/current-pm10?station_id=AP001&refresh=${force}&_t=${ts}`, { cache: 'no-store' });
      const liveJson = await liveRes.json();
      if (liveJson.status === 'success') setLiveData(liveJson.data);

      const predRes = await fetch(`/api/prediction?station_id=AP001&_t=${ts}`, { cache: 'no-store' });
      const predJson = await predRes.json();
      if (predJson.status === 'success') setPredData(predJson.data);

      const histRes = await fetch(`/api/historical-pm10?limit=24&_t=${ts}`, { cache: 'no-store' });
      const histJson = await histRes.json();
      if (histJson.status === 'success') setHistData(histJson.data);
    } catch (err) {
      console.error('Error fetching data in React:', err);
    } finally {
      if (force) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
    const timer = setInterval(() => loadData(false), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    loadData(true);
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="main-content">
        <Header 
          theme={theme} 
          toggleTheme={toggleTheme} 
          activeTab={activeTab} 
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />

        {activeTab === 'dashboard' && <DashboardView liveData={liveData} predData={predData} histData={histData} />}
        {activeTab === 'live' && <LiveView liveData={liveData} onRefresh={handleRefresh} refreshing={refreshing} />}
        {activeTab === 'prediction' && <PredictionView initialData={predData} />}
        {activeTab === 'historical' && <HistoricalView histData={histData} />}
        {activeTab === 'data-quality' && <DataQualityView />}
        {activeTab === 'models' && <ModelsView />}
        {activeTab === 'anomalies' && <AnomaliesView />}
        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'about' && <AboutView />}
      </main>
    </div>
  );
}

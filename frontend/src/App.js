import React, { useState } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import Login from './components/Login';
import Layout from './components/Layout';
import ConnectGoogle from './components/ConnectGoogle';
import Dashboard from './views/Dashboard';
import Students from './views/Students';
import POS from './views/POS';
import Lessons from './views/Lessons';
import Hostings from './views/Hostings';
import CalendarView from './views/CalendarView';
import Projections from './views/Projections';
import Enrollments from './views/Enrollments';

const Loader = () => (
  <div style={{
    minHeight: 'calc(100vh - 160px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-dim)', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase',
  }}>
    Loading from Google Sheets...
  </div>
);

const Shell = () => {
  const [tab, setTab] = useState('dashboard');
  const { gcalConnected, loadingData, error } = useData();

  let content;
  if (!gcalConnected) {
    content = <ConnectGoogle />;
  } else if (loadingData) {
    content = <Loader />;
  } else if (error && error !== 'not_connected') {
    content = (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>
        Error: {error}
      </div>
    );
  } else {
    switch (tab) {
      case 'dashboard': content = <Dashboard onNavigate={setTab} />; break;
      case 'students': content = <Students />; break;
      case 'pos': content = <POS />; break;
      case 'enrollments': content = <Enrollments />; break;
      case 'lessons': content = <Lessons />; break;
      case 'hostings': content = <Hostings />; break;
      case 'calendar': content = <CalendarView />; break;
      case 'projections': content = <Projections />; break;
      default: content = <Dashboard onNavigate={setTab} />;
    }
  }

  return (
    <Layout active={tab} onTabChange={setTab}>
      {content}
    </Layout>
  );
};

const AppInner = () => {
  const { authed, loading } = useAuth();
  if (loading) return null;
  if (!authed) return <Login />;
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

export default App;

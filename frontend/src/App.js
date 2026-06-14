import React, { useState } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import Students from './views/Students';
import POS from './views/POS';
import Lessons from './views/Lessons';
import Hostings from './views/Hostings';
import CalendarView from './views/CalendarView';
import Projections from './views/Projections';

const AppInner = () => {
  const { authed, loading } = useAuth();
  const [tab, setTab] = useState('dashboard');

  if (loading) return null;
  if (!authed) return <Login />;

  const renderView = () => {
    switch (tab) {
      case 'dashboard': return <Dashboard onNavigate={setTab} />;
      case 'students': return <Students />;
      case 'pos': return <POS />;
      case 'lessons': return <Lessons />;
      case 'hostings': return <Hostings />;
      case 'calendar': return <CalendarView />;
      case 'projections': return <Projections />;
      default: return <Dashboard />;
    }
  };

  return (
    <DataProvider>
      <Layout active={tab} onTabChange={setTab}>
        {renderView()}
      </Layout>
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

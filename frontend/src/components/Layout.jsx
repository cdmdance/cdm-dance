import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { RefreshCw, LogOut, Cloud, CloudOff } from 'lucide-react';

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'students', label: 'Students' },
  { key: 'lessons', label: 'Lessons' },
  { key: 'hostings', label: 'Hostings' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'projections', label: 'Income' },
];

const Layout = ({ active, onTabChange, children }) => {
  const { logout } = useAuth();
  const { syncGoogleCalendar, gcalStatus, lastSync, toast, disconnectGoogle, loadingData } = useData();
  const connected = gcalStatus?.connected;

  const syncLabel = (() => {
    if (!connected) return 'Not connected';
    if (loadingData) return 'Syncing...';
    if (!lastSync) return 'Connected';
    const d = new Date(lastSync);
    return 'Synced ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  })();

  return (
    <div className="app-shell">
      <header className="cdm-header">
        <div className="cdm-logo">
          <div className="cdm-logo-mark">CDM</div>
          <div className="cdm-logo-title">Dance CRM</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-dim)' }}
            title={connected ? `Connected as ${gcalStatus.email || ''}` : 'Not connected to Google'}
          >
            {connected ? <Cloud size={14} color="var(--gold)" /> : <CloudOff size={14} color="var(--muted)" />}
            <span>{syncLabel}</span>
          </div>
          {connected && (
            <>
              <button className="btn-ghost" onClick={syncGoogleCalendar}>
                <RefreshCw size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />
                Sync
              </button>
              <button className="btn-ghost" onClick={disconnectGoogle} title="Disconnect Google">
                <CloudOff size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />
                Disconnect
              </button>
            </>
          )}
          <button className="btn-icon" onClick={logout} title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <nav className="cdm-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`cdm-tab ${active === tab.key ? 'active' : ''}`}
            onClick={() => onTabChange(tab.key)}
            disabled={!connected}
            style={!connected ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="page">
        {children}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

export default Layout;

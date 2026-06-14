import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { RefreshCw, LogOut } from 'lucide-react';

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'students', label: 'Students' },
  { key: 'pos', label: 'POS' },
  { key: 'lessons', label: 'Lessons' },
  { key: 'hostings', label: 'Hostings' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'projections', label: 'Projections' },
];

const Layout = ({ active, onTabChange, children }) => {
  const { logout } = useAuth();
  const { syncGoogleCalendar, gcalConnected, lastSync, toast } = useData();

  const syncLabel = (() => {
    if (!lastSync) return 'Not synced';
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-dim)' }}>
            <span className="sync-dot" style={{ background: gcalConnected ? 'var(--gold)' : 'var(--muted)' }} />
            <span>{gcalConnected ? syncLabel : 'GCal disconnected'}</span>
          </div>
          <button className="btn-ghost" onClick={syncGoogleCalendar}>
            <RefreshCw size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />
            Sync
          </button>
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

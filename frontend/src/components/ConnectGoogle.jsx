import React from 'react';
import { useData } from '../context/DataContext';
import { Cloud, AlertTriangle, ExternalLink } from 'lucide-react';

const ConnectGoogle = () => {
  const { gcalStatus, connectGoogle } = useData();

  return (
    <div style={{
      minHeight: 'calc(100vh - 160px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
    }}>
      <div className="cdm-card" style={{ maxWidth: 540, textAlign: 'center', padding: 40 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(200,165,91,0.15), rgba(200,165,91,0.04))',
          border: '1px solid var(--gold-dim)',
          margin: '0 auto 22px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Cloud size={32} color="var(--gold-2)" />
        </div>

        <h2 style={{ fontSize: 26, marginBottom: 10 }}>Connect Google Account</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 22, lineHeight: 1.6 }}>
          Connect your Google account to sync the CRM with your Google Sheet and Google Calendar.
          <br />Use <b style={{ color: 'var(--gold-2)' }}>cdmdanceservices@gmail.com</b>.
        </p>

        {!gcalStatus.configured && (
          <div style={{
            background: 'rgba(199,92,92,0.08)',
            border: '1px solid rgba(199,92,92,0.3)',
            borderRadius: 6,
            padding: 14,
            marginBottom: 18,
            display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left',
          }}>
            <AlertTriangle size={16} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              Google OAuth credentials are not yet configured on the backend. The administrator needs to set <code style={{ color: 'var(--gold-2)' }}>GOOGLE_CLIENT_ID</code> and <code style={{ color: 'var(--gold-2)' }}>GOOGLE_CLIENT_SECRET</code> in the backend .env file.
            </div>
          </div>
        )}

        <button
          className="btn-gold"
          onClick={connectGoogle}
          disabled={!gcalStatus.configured}
          style={{ width: '100%', padding: 14, opacity: gcalStatus.configured ? 1 : 0.5, cursor: gcalStatus.configured ? 'pointer' : 'not-allowed' }}
        >
          <ExternalLink size={14} style={{ marginRight: 8, verticalAlign: '-2px' }} />
          Sign in with Google
        </button>

        <p style={{ marginTop: 22, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
          A new window will open. After signing in, this app will gain read/write access<br />
          to your Google Sheet and Calendar. You can disconnect anytime.
        </p>
      </div>
    </div>
  );
};

export default ConnectGoogle;

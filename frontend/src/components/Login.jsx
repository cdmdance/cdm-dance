import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const res = login(password);
    if (!res.success) setError(res.error);
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <div style={{
            border: '1px solid var(--gold)',
            color: 'var(--gold)',
            fontFamily: 'Playfair Display, serif',
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: 32,
            padding: '10px 22px',
            letterSpacing: '0.1em',
            borderRadius: 6,
          }}>
            CDM
          </div>
        </div>
        <h1>Dance CRM</h1>
        <p className="tag">Staff Access</p>

        <form onSubmit={handleSubmit}>
          <div className="cdm-field" style={{ textAlign: 'left' }}>
            <label className="cdm-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="password"
                className="cdm-input"
                style={{ paddingLeft: 36 }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter staff password"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(199,92,92,0.1)',
              border: '1px solid rgba(199,92,92,0.3)',
              color: 'var(--danger)',
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 12,
              marginBottom: 14,
              textAlign: 'left',
            }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-gold" style={{ width: '100%', padding: '13px' }}>
            Sign In
          </button>
        </form>

        <p style={{ marginTop: 22, fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em' }}>
          Default password: cdm2025
        </p>
      </div>
    </div>
  );
};

export default Login;

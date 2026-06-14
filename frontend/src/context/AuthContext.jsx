import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { getToken, setToken, clearToken } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const t = getToken();
      if (!t) { setLoading(false); return; }
      try {
        await api.get('/auth/me');
        setAuthed(true);
      } catch (e) {
        clearToken();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const login = async (password) => {
    try {
      const res = await api.post('/auth/login', { password });
      setToken(res.data.token);
      setAuthed(true);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.response?.data?.detail || 'Login failed' };
    }
  };

  const logout = () => {
    clearToken();
    setAuthed(false);
  };

  return (
    <AuthContext.Provider value={{ authed, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

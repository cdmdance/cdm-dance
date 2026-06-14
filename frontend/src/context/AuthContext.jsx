import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

const DEFAULT_PASSWORD = 'cdm2025';
const AUTH_KEY = 'cdm_crm_auth';

export const AuthProvider = ({ children }) => {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const v = localStorage.getItem(AUTH_KEY);
    if (v === 'ok') setAuthed(true);
    setLoading(false);
  }, []);

  const login = (password) => {
    if (password === DEFAULT_PASSWORD) {
      localStorage.setItem(AUTH_KEY, 'ok');
      setAuthed(true);
      return { success: true };
    }
    return { success: false, error: 'Incorrect password' };
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
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

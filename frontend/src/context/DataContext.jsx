import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import api from '../lib/api';
import { PACKAGES, STYLES } from '../mock/mock';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [students, setStudents] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [hostings, setHostings] = useState([]);
  const [gcalEvents, setGcalEvents] = useState([]);
  const [gcalStatus, setGcalStatus] = useState({ configured: false, connected: false, email: null });
  const [lastSync, setLastSync] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/oauth/google/status');
      setGcalStatus(res.data);
      return res.data;
    } catch (e) {
      return { configured: false, connected: false };
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    try {
      const [dataRes, eventsRes] = await Promise.all([
        api.get('/data/all'),
        api.get('/calendar/events').catch(() => ({ data: [] })),
      ]);
      const d = dataRes.data || {};
      setStudents(normalizeStudents(d.students || []));
      setLessons(normalizeLessons(d.lessons || []));
      setHostings(normalizeHostings(d.hostings || []));
      setGcalEvents((eventsRes.data || []).map(e => ({
        id: e.id, summary: e.summary, date: e.date, time: e.time,
        location: e.location, source: 'gcal',
      })));
      setLastSync(new Date().toISOString());
    } catch (e) {
      if (e.response?.status === 409) {
        // Not connected to Google yet
        setError('not_connected');
      } else {
        setError(e.response?.data?.detail || 'Failed to load data');
      }
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const s = await fetchStatus();
      if (s.connected) {
        await fetchData();
      }
    })();
  }, [fetchStatus, fetchData]);

  // Listen for OAuth popup completion
  useEffect(() => {
    const handler = async (event) => {
      if (event.data === 'gcal-connected') {
        await fetchStatus();
        await fetchData();
        showToast('Google connected!');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [fetchStatus, fetchData]);

  const connectGoogle = () => {
    const url = `${process.env.REACT_APP_BACKEND_URL}/api/oauth/google/login`;
    window.open(url, 'gcal_oauth', 'width=520,height=680');
  };

  const disconnectGoogle = async () => {
    await api.post('/oauth/google/disconnect');
    await fetchStatus();
    setStudents([]); setLessons([]); setHostings([]); setGcalEvents([]);
    showToast('Disconnected from Google');
  };

  const addLesson = async (lesson) => {
    try {
      const res = await api.post('/lessons', lesson);
      setLessons(prev => [normalizeLesson(res.data), ...prev]);
      showToast(gcalStatus.connected ? 'Lesson added & synced to Google Calendar' : 'Lesson added');
      return res.data;
    } catch (e) {
      showToast('Failed to add lesson');
      throw e;
    }
  };

  const updateLesson = async (id, patch) => {
    const existing = lessons.find(l => l.id === id);
    if (!existing) return;
    const res = await api.put(`/lessons/${id}`, { ...existing, ...patch });
    setLessons(prev => prev.map(l => l.id === id ? normalizeLesson(res.data) : l));
    showToast('Lesson updated');
  };

  const deleteLesson = async (id) => {
    await api.delete(`/lessons/${id}`);
    setLessons(prev => prev.filter(l => l.id !== id));
    showToast('Lesson removed');
  };

  const addHosting = async (hosting) => {
    const res = await api.post('/hostings', hosting);
    setHostings(prev => [normalizeHosting(res.data), ...prev]);
    showToast(gcalStatus.connected ? 'Hosting added & synced to Google Calendar' : 'Hosting added');
    return res.data;
  };

  const addStudent = async (student) => {
    const res = await api.post('/students', student);
    setStudents(prev => [...prev, normalizeStudent(res.data)]);
    showToast('Student added');
  };

  const updateStudent = async (id, patch) => {
    const existing = students.find(s => s.id === id);
    if (!existing) return;
    const res = await api.put(`/students/${id}`, { ...existing, ...patch });
    setStudents(prev => prev.map(s => s.id === id ? normalizeStudent(res.data) : s));
  };

  const completeSale = async ({ studentId, packageId, paid, method, style, notes }) => {
    const pkg = PACKAGES.find(p => p.id === packageId);
    const stu = students.find(s => s.id === studentId);
    if (!pkg || !stu) return;
    const newBalance = (stu.balance || 0) + (pkg.price - Number(paid || 0));
    const newLessons = (stu.lessonsRemaining || 0) + pkg.lessons;
    await updateStudent(studentId, {
      lessonsRemaining: newLessons,
      balance: newBalance,
      package: pkg.name,
      status: 'Active',
      notes: `${stu.notes || ''}\n[${new Date().toISOString().slice(0,10)}] Sold ${pkg.name} via ${method}. Paid $${paid}. ${notes || ''}`.trim(),
    });
    showToast(`Sale completed: ${pkg.name}`);
  };

  const syncGoogleCalendar = async () => {
    try {
      await fetchData();
      showToast('Synced with Google Calendar');
    } catch (e) {
      showToast('Sync failed');
    }
  };

  const allCalendarEvents = useMemo(() => {
    const evts = [];
    lessons.forEach(l => {
      evts.push({
        id: l.id, date: l.date, time: l.time,
        title: `${l.studentName || 'Student'} - ${l.style || 'Lesson'}`,
        type: 'lesson', status: l.status, location: l.location, meta: l,
      });
    });
    hostings.forEach(h => {
      evts.push({
        id: h.id, date: h.date, time: '20:00',
        title: `Hosting: ${h.location}`,
        type: 'hosting', location: h.location, meta: h,
      });
    });
    // Filter out gcal events that are already linked to a lesson/hosting
    const linkedIds = new Set([...lessons, ...hostings].map(x => x.gcalEventId).filter(Boolean));
    gcalEvents.forEach(g => {
      if (linkedIds.has(g.id)) return;
      evts.push({
        id: g.id, date: g.date, time: g.time,
        title: g.summary, type: 'gcal', meta: g,
      });
    });
    return evts;
  }, [lessons, hostings, gcalEvents]);

  return (
    <DataContext.Provider value={{
      students, lessons, hostings, gcalEvents,
      packages: PACKAGES, styles: STYLES,
      gcalStatus, gcalConnected: gcalStatus.connected,
      lastSync, loadingData, error,
      addLesson, updateLesson, deleteLesson,
      addHosting, addStudent, updateStudent,
      completeSale, syncGoogleCalendar,
      connectGoogle, disconnectGoogle, refreshData: fetchData,
      allCalendarEvents, toast, showToast,
    }}>
      {children}
    </DataContext.Provider>
  );
};

// --- Helpers: convert sheet string values to typed ----
const toNum = (v) => {
  if (v === '' || v == null) return 0;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
};

const normalizeStudent = (s) => ({
  ...s,
  lessonsRemaining: toNum(s.lessonsRemaining),
  lessonsCompleted: toNum(s.lessonsCompleted),
  balance: toNum(s.balance),
});
const normalizeStudents = (arr) => arr.map(normalizeStudent);

const normalizeLesson = (l) => ({
  ...l,
  price: toNum(l.price),
});
const normalizeLessons = (arr) => arr.map(normalizeLesson);

const normalizeHosting = (h) => ({
  ...h,
  income: toNum(h.income),
});
const normalizeHostings = (arr) => arr.map(normalizeHosting);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};

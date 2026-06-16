import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import api from '../lib/api';
import { STYLES } from '../mock/mock';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [students, setStudents] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [hostings, setHostings] = useState([]);
  const [packages, setPackages] = useState([]);
  const [payments, setPayments] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
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
      const [dataRes, eventsRes, pkgRes, payRes, incomeRes, enrRes] = await Promise.all([
        api.get('/data/all'),
        api.get('/calendar/events', { params: { calendar: 'all', days_back: 45, days_forward: 180 } }).catch(() => ({ data: [] })),
        api.get('/packages').catch(() => ({ data: [] })),
        api.get('/payments').catch(() => ({ data: [] })),
        api.get('/income/analysis', { params: { days_back: 45, days_forward: 180, calendar: 'primary' } }).catch(() => ({ data: null })),
        api.get('/enrollments').catch(() => ({ data: [] })),
      ]);
      const d = dataRes.data || {};
      setStudents(normalizeStudents(d.students || []));
      setLessons(normalizeLessons(d.lessons || []));
      setHostings(normalizeHostings(d.hostings || []));
      setPackages(normalizePackages(pkgRes.data || []));
      setPayments(normalizePayments(payRes.data || []));
      setEnrollments(normalizeEnrollments(enrRes.data || []));
      // Merge raw events + classified events from income analysis
      const classifiedById = {};
      if (incomeRes.data && incomeRes.data.events) {
        for (const ev of incomeRes.data.events) {
          if (ev.id) classifiedById[ev.id] = ev;
        }
      }
      setGcalEvents((eventsRes.data || []).map(e => {
        const enriched = classifiedById[e.id];
        return {
          id: e.id,
          summary: e.summary,
          date: e.date,
          time: e.time,
          location: e.location,
          calendar: e.calendar,
          type: enriched?.type || 'gcal',
          student: enriched?.student || '',
          names: enriched?.names || [],
          income: enriched?.income || 0,
        };
      }));
      setLastSync(new Date().toISOString());
    } catch (e) {
      if (e.response?.status === 409) {
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
      if (s.connected) await fetchData();
    })();
  }, [fetchStatus, fetchData]);

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
    setStudents([]); setLessons([]); setHostings([]); setGcalEvents([]); setPackages([]); setPayments([]);
    showToast('Disconnected from Google');
  };

  // Lessons
  const addLesson = async (lesson) => {
    const res = await api.post('/lessons', lesson);
    setLessons(prev => [normalizeLesson(res.data), ...prev]);
    showToast(gcalStatus.connected ? 'Lesson added & synced to Google Calendar' : 'Lesson added');
    return res.data;
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

  // Hostings
  const addHosting = async (hosting) => {
    const res = await api.post('/hostings', hosting);
    setHostings(prev => [normalizeHosting(res.data), ...prev]);
    showToast(gcalStatus.connected ? 'Hosting added & synced to Google Calendar' : 'Hosting added');
    return res.data;
  };

  // Students
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

  // Packages
  const addPackage = async (pkg) => {
    const res = await api.post('/packages', pkg);
    setPackages(prev => [...prev, normalizePackage(res.data)]);
    showToast('Package created');
    return res.data;
  };
  const updatePackage = async (id, patch) => {
    const existing = packages.find(p => p.id === id);
    if (!existing) return;
    const res = await api.put(`/packages/${id}`, { ...existing, ...patch });
    setPackages(prev => prev.map(p => p.id === id ? normalizePackage(res.data) : p));
    showToast('Package updated');
  };
  const deletePackage = async (id) => {
    await api.delete(`/packages/${id}`);
    setPackages(prev => prev.filter(p => p.id !== id));
    showToast('Package removed');
  };

  // Payments (POS sales)
  const recordPayment = async (payment) => {
    const res = await api.post('/payments', payment);
    setPayments(prev => [normalizePayment(res.data.payment), ...prev]);
    // Update student totals locally
    if (res.data.student_updated && payment.studentId) {
      setStudents(prev => prev.map(s => s.id === payment.studentId
        ? { ...s, lessonsTotal: res.data.student_updated.lessonsTotal, totalPaid: res.data.student_updated.totalPaid }
        : s));
    }
    showToast('Sale recorded');
    return res.data.payment;
  };
  const deletePayment = async (id) => {
    await api.delete(`/payments/${id}`);
    setPayments(prev => prev.filter(p => p.id !== id));
    await fetchData();
    showToast('Payment removed');
  };

  // Enrollments
  const createEnrollment = async (enrollment) => {
    const res = await api.post('/enrollments', enrollment);
    setEnrollments(prev => [normalizeEnrollment(res.data), ...prev]);
    showToast('Enrollment created (Pending signature)');
    return res.data;
  };
  const signEnrollment = async (id, signedBy, sendEmail = true) => {
    const res = await api.post(`/enrollments/${id}/sign`, { signedBy, sendEmail });
    setEnrollments(prev => prev.map(e => e.id === id ? normalizeEnrollment(res.data.enrollment) : e));
    await fetchData();
    if (res.data.email_status === 'sent') showToast('Signed & receipt emailed to student');
    else if (res.data.email_status === 'not_configured') showToast('Signed - email not configured (PDF available to download)');
    else if (res.data.email_status === 'no_email_on_file') showToast('Signed - no email on file (PDF available to download)');
    else if (res.data.email_status === 'failed') showToast('Signed - email failed: ' + (res.data.email_error || ''));
    else showToast('Enrollment signed');
    return res.data;
  };
  const cancelEnrollment = async (id) => {
    await api.delete(`/enrollments/${id}`);
    setEnrollments(prev => prev.map(e => e.id === id ? { ...e, status: 'Cancelled' } : e));
    showToast('Enrollment cancelled');
  };
  const downloadEnrollmentPDF = async (id, studentName) => {
    const res = await api.get(`/enrollments/${id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `CDM-Enrollment-${(studentName || 'Student').replace(/\s+/g, '-')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
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
    const linkedIds = new Set([...lessons, ...hostings].map(x => x.gcalEventId).filter(Boolean));
    gcalEvents.forEach(g => {
      if (linkedIds.has(g.id)) return;
      // Use classified type from income analysis if available
      const type = g.type === 'lesson' || g.type === 'hosting' ? g.type : 'gcal';
      evts.push({
        id: g.id, date: g.date, time: g.time,
        title: g.summary,
        type,
        location: g.location,
        student: g.student,
        names: g.names,
        income: g.income,
        meta: g,
      });
    });
    return evts;
  }, [lessons, hostings, gcalEvents]);

  return (
    <DataContext.Provider value={{
      students, lessons, hostings, packages, payments, enrollments, gcalEvents,
      styles: STYLES,
      gcalStatus, gcalConnected: gcalStatus.connected,
      lastSync, loadingData, error,
      addLesson, updateLesson, deleteLesson,
      addHosting, addStudent, updateStudent,
      addPackage, updatePackage, deletePackage,
      recordPayment, deletePayment,
      createEnrollment, signEnrollment, cancelEnrollment, downloadEnrollmentPDF,
      syncGoogleCalendar,
      connectGoogle, disconnectGoogle, refreshData: fetchData,
      allCalendarEvents, toast, showToast,
    }}>
      {children}
    </DataContext.Provider>
  );
};

const toNum = (v) => {
  if (v === '' || v == null) return 0;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
};
const toBool = (v) => {
  if (typeof v === 'boolean') return v;
  const s = String(v || '').toLowerCase();
  return s === 'true' || s === 'yes' || s === '1';
};

// Convert Excel/Sheets serial date number (e.g. 46176) to ISO "YYYY-MM-DD"
// Excel epoch: 1899-12-30 (with the leap year bug compatibility)
const SHEETS_EPOCH_MS = Date.UTC(1899, 11, 30);
const serialToISO = (n) => {
  const d = new Date(SHEETS_EPOCH_MS + n * 86400000);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const toDate = (v) => {
  if (!v) return '';
  const s = String(v).trim();
  if (!s) return '';
  // Already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // M/D/YYYY or MM/DD/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  }
  // Pure number => Sheets date serial
  const num = Number(s);
  if (!isNaN(num) && num > 1000 && num < 100000) {
    return serialToISO(num);
  }
  return s;
};

const normalizeStudent = (s) => ({
  ...s,
  lastSeen: toDate(s.lastSeen),
  nextScheduled: toDate(s.nextScheduled),
  lessons6mo: toNum(s.lessons6mo),
  hostings6mo: toNum(s.hostings6mo),
  lessonsTotal: toNum(s.lessonsTotal),
  totalPaid: toNum(s.totalPaid),
});
const normalizeStudents = (arr) => arr.map(normalizeStudent);

const normalizeLesson = (l) => ({ ...l, price: toNum(l.price) });
const normalizeLessons = (arr) => arr.map(normalizeLesson);

const normalizeHosting = (h) => ({ ...h, income: toNum(h.income) });
const normalizeHostings = (arr) => arr.map(normalizeHosting);

const normalizePackage = (p) => ({
  ...p,
  lessons: toNum(p.lessons),
  price: toNum(p.price),
  active: toBool(p.active),
});
const normalizePackages = (arr) => arr.map(normalizePackage);

const normalizePayment = (p) => ({
  ...p,
  amount: toNum(p.amount),
  lessons: toNum(p.lessons),
});
const normalizePayments = (arr) => arr.map(normalizePayment);

const normalizeEnrollment = (e) => ({
  ...e,
  date: toDate(e.date),
  eventDate: toDate(e.eventDate),
  expirationDate: toDate(e.expirationDate),
  lessonsCount: toNum(e.lessonsCount),
  pricePerLesson: toNum(e.pricePerLesson),
  totalValue: toNum(e.totalValue),
  totalCost: toNum(e.totalCost),
  amountPaid: toNum(e.amountPaid),
});
const normalizeEnrollments = (arr) => arr.map(normalizeEnrollment);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};

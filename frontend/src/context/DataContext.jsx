import React, { createContext, useContext, useState, useMemo } from 'react';
import { STUDENTS, LESSONS, HOSTINGS, GCAL_EXTERNAL, PACKAGES, STYLES } from '../mock/mock';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [students, setStudents] = useState(STUDENTS);
  const [lessons, setLessons] = useState(LESSONS);
  const [hostings, setHostings] = useState(HOSTINGS);
  const [gcalExternal, setGcalExternal] = useState(GCAL_EXTERNAL);
  const [gcalConnected, setGcalConnected] = useState(true); // mocked as connected
  const [lastSync, setLastSync] = useState(new Date().toISOString());
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const addLesson = (lesson) => {
    const id = 'l' + Date.now();
    const stu = students.find(s => s.id === lesson.studentId);
    const newLesson = {
      ...lesson,
      id,
      studentName: stu ? stu.name : lesson.studentName,
      gcalEventId: gcalConnected ? 'gc_evt_new_' + id : null,
    };
    setLessons(prev => [newLesson, ...prev]);
    showToast(gcalConnected ? 'Lesson added & synced to Google Calendar' : 'Lesson added');
    return newLesson;
  };

  const updateLesson = (id, patch) => {
    setLessons(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
    showToast('Lesson updated');
  };

  const deleteLesson = (id) => {
    setLessons(prev => prev.filter(l => l.id !== id));
    showToast('Lesson removed');
  };

  const addHosting = (hosting) => {
    const id = 'h' + Date.now();
    const newHosting = { ...hosting, id, gcalEventId: gcalConnected ? 'gc_evt_h_' + id : null };
    setHostings(prev => [newHosting, ...prev]);
    showToast(gcalConnected ? 'Hosting added & synced to Google Calendar' : 'Hosting added');
    return newHosting;
  };

  const addStudent = (student) => {
    const id = 's' + Date.now();
    setStudents(prev => [...prev, { ...student, id, lessonsCompleted: 0 }]);
    showToast('Student added');
  };

  const updateStudent = (id, patch) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
    showToast('Student updated');
  };

  const completeSale = ({ studentId, packageId, paid, method, style, notes }) => {
    const pkg = PACKAGES.find(p => p.id === packageId);
    if (!pkg) return;
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const newBalance = (s.balance || 0) + (pkg.price - paid);
      return {
        ...s,
        lessonsRemaining: (s.lessonsRemaining || 0) + pkg.lessons,
        balance: newBalance,
        package: pkg.name,
        status: 'Active',
      };
    }));
    showToast(`Sale completed: ${pkg.name}`);
  };

  const syncGoogleCalendar = () => {
    setLastSync(new Date().toISOString());
    showToast('Google Calendar synced');
  };

  // Derived calendar events (lessons + hostings + external gcal)
  const allCalendarEvents = useMemo(() => {
    const evts = [];
    lessons.forEach(l => {
      evts.push({
        id: l.id,
        date: l.date,
        time: l.time,
        title: `${l.studentName} - ${l.style}`,
        type: 'lesson',
        status: l.status,
        location: l.location,
        meta: l,
      });
    });
    hostings.forEach(h => {
      evts.push({
        id: h.id,
        date: h.date,
        time: '20:00',
        title: `Hosting: ${h.location}`,
        type: 'hosting',
        location: h.location,
        meta: h,
      });
    });
    gcalExternal.forEach(g => {
      evts.push({
        id: g.id,
        date: g.date,
        time: g.time,
        title: g.summary,
        type: 'gcal',
        meta: g,
      });
    });
    return evts;
  }, [lessons, hostings, gcalExternal]);

  return (
    <DataContext.Provider value={{
      students, lessons, hostings, gcalExternal,
      packages: PACKAGES, styles: STYLES,
      gcalConnected, setGcalConnected, lastSync,
      addLesson, updateLesson, deleteLesson,
      addHosting, addStudent, updateStudent,
      completeSale, syncGoogleCalendar,
      allCalendarEvents,
      toast,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};

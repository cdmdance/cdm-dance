import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { ChevronLeft, ChevronRight, RefreshCw, X, MapPin, Clock, User } from 'lucide-react';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const CalendarView = () => {
  const { allCalendarEvents, gcalConnected, syncGoogleCalendar, lastSync } = useData();
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [view, setView] = useState('month'); // 'month' or 'week'

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const daysGrid = useMemo(() => {
    const first = new Date(year, month, 1);
    const startWeekDay = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const grid = [];

    // Previous month tail
    for (let i = startWeekDay - 1; i >= 0; i--) {
      const d = prevDays - i;
      const dt = new Date(year, month - 1, d);
      grid.push({ date: dt, otherMonth: true });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push({ date: new Date(year, month, d), otherMonth: false });
    }
    // Next month head (fill to 42 cells / 6 weeks)
    let i = 1;
    while (grid.length % 7 !== 0 || grid.length < 35) {
      grid.push({ date: new Date(year, month + 1, i), otherMonth: true });
      i++;
      if (grid.length >= 42) break;
    }
    return grid;
  }, [year, month]);

  const eventsByDate = useMemo(() => {
    const map = {};
    allCalendarEvents.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    Object.keys(map).forEach(k => map[k].sort((a, b) => (a.time || '').localeCompare(b.time || '')));
    return map;
  }, [allCalendarEvents]);

  const isoOf = (d) => d.toISOString().slice(0, 10);
  const todayISO = new Date().toISOString().slice(0, 10);

  const prevMonth = () => setCursor(new Date(year, month - 1, 1));
  const nextMonth = () => setCursor(new Date(year, month + 1, 1));
  const goToday = () => setCursor(new Date());

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];

  return (
    <div>
      <h2 className="section-title">
        Calendar
        <span className="sub">Lessons - Hostings - Google Calendar</span>
      </h2>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-icon" onClick={prevMonth}><ChevronLeft size={16} /></button>
          <h3 style={{ fontSize: 22, minWidth: 220, textAlign: 'center' }}>{MONTH_NAMES[month]} {year}</h3>
          <button className="btn-icon" onClick={nextMonth}><ChevronRight size={16} /></button>
          <button className="btn-ghost" onClick={goToday}>Today</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Legend />
          <button className="btn-ghost" onClick={syncGoogleCalendar} disabled={!gcalConnected}>
            <RefreshCw size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />
            Sync Now
          </button>
        </div>
      </div>

      <div className="cal-grid">
        {DAY_NAMES.map(d => <div key={d} className="cal-head">{d}</div>)}
        {daysGrid.map((cell) => {
          const iso = isoOf(cell.date);
          const evts = eventsByDate[iso] || [];
          const isToday = iso === todayISO;
          return (
            <div
              key={`${iso}-${cell.otherMonth ? 'o' : 'm'}`}
              className={`cal-day ${cell.otherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => setSelectedDate(iso)}
            >
              <div className="cal-day-num">{cell.date.getDate()}</div>
              {evts.slice(0, 3).map(e => (
                <div key={e.id} className={`cal-event ${e.type}`} title={e.title}>
                  {e.time && <span style={{ opacity: 0.7, marginRight: 4 }}>{e.time}</span>}
                  {e.title}
                </div>
              ))}
              {evts.length > 3 && (
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4, paddingLeft: 6 }}>
                  +{evts.length - 3} more
                </div>
              )}
            </div>
          );
        })}
      </div>

      {gcalConnected && (
        <div style={{ marginTop: 16, padding: 14, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="sync-dot" />
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              Connected to Google Calendar (cdmdanceservices@gmail.com)
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em' }}>
            Last sync: {lastSync ? new Date(lastSync).toLocaleString() : '-'}
          </span>
        </div>
      )}

      {selectedDate && (
        <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="cdm-card-header">
              <h3>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
              <button className="btn-icon" onClick={() => setSelectedDate(null)}><X size={14} /></button>
            </div>
            <div style={{ padding: 22 }}>
              {selectedEvents.length === 0 && (
                <div style={{ padding: 22, textAlign: 'center', color: 'var(--text-dim)' }}>
                  No events on this day
                </div>
              )}
              {selectedEvents.map(e => (
                <div key={e.id} style={{
                  padding: 14,
                  background: 'var(--bg-soft)',
                  border: '1px solid var(--line)',
                  borderLeft: `3px solid ${e.type === 'lesson' ? 'var(--gold)' : e.type === 'hosting' ? '#7ab8cf' : '#9b8edb'}`,
                  borderRadius: 6,
                  marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ color: 'var(--text)', fontSize: 14 }}>{e.title}</div>
                    <span className={`pill ${e.type === 'lesson' ? 'pill-gold' : e.type === 'hosting' ? 'pill-green' : 'pill-dim'}`}>
                      {e.type === 'gcal' ? 'GCal' : e.type}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                    {e.time && <span><Clock size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />{e.time}</span>}
                    {e.location && <span><MapPin size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />{e.location}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Legend = () => (
  <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
    <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'rgba(200,165,91,0.5)', verticalAlign: 'middle', marginRight: 5 }} />Lessons</span>
    <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'rgba(122,184,207,0.5)', verticalAlign: 'middle', marginRight: 5 }} />Hostings</span>
    <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'rgba(155,142,219,0.5)', verticalAlign: 'middle', marginRight: 5 }} />Google Cal</span>
  </div>
);

export default CalendarView;

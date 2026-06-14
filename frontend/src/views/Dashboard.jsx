import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Users, CalendarDays, DollarSign, TrendingUp, MapPin, Clock, UserCheck, Home as HomeIcon } from 'lucide-react';

const Dashboard = ({ onNavigate }) => {
  const { students, lessons, hostings } = useData();

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    const teachCount = students.filter(s => s.relationship === 'Teach' || s.relationship === 'Both').length;
    const hostCount = students.filter(s => s.relationship === 'Host' || s.relationship === 'Both').length;
    const withNext = students.filter(s => s.nextScheduled && s.nextScheduled >= today).length;

    const upcomingLessons = lessons.filter(l => l.date >= today && (l.status === 'Scheduled' || l.status === 'Rescheduled'));
    const upcomingHostings = hostings.filter(h => h.date >= today);

    const projectedLessons = upcomingLessons.reduce((sum, l) => sum + (Number(l.price) || 0), 0);
    const projectedHostings = upcomingHostings.reduce((sum, h) => sum + (Number(h.income) || 0), 0);

    return {
      totalContacts: students.length,
      teachCount, hostCount, withNext,
      upcomingLessons: upcomingLessons.length,
      upcomingHostings: upcomingHostings.length,
      projectedLessons, projectedHostings,
      projected: projectedLessons + projectedHostings,
    };
  }, [students, lessons, hostings]);

  const upcomingFromSheets = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const evts = [];
    lessons.filter(l => l.date >= today && l.status !== 'Cancelled').forEach(l => {
      evts.push({ id: l.id, type: 'lesson', date: l.date, time: l.time, label: l.studentName || 'Lesson', subtitle: l.style, location: l.location });
    });
    hostings.filter(h => h.date >= today).forEach(h => {
      evts.push({ id: h.id, type: 'hosting', date: h.date, time: '20:00', label: 'Hosting', subtitle: h.names, location: h.location });
    });
    return evts.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).slice(0, 8);
  }, [lessons, hostings]);

  const upcomingByContacts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return students
      .filter(s => s.nextScheduled && s.nextScheduled >= today)
      .sort((a, b) => (a.nextScheduled || '').localeCompare(b.nextScheduled || ''))
      .slice(0, 6);
  }, [students]);

  const fmt = (n) => `$${Number(n).toLocaleString()}`;
  const fmtDate = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '-';

  return (
    <div>
      <h2 className="section-title">
        Dashboard
        <span className="sub">Overview</span>
      </h2>

      <div className="grid-stats" style={{ marginBottom: 22 }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Total Contacts</div>
              <div className="stat-value">{stats.totalContacts}</div>
              <div className="stat-sub">{stats.withNext} with upcoming dates</div>
            </div>
            <Users size={20} color="var(--gold-dim)" />
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Students (Teach)</div>
              <div className="stat-value">{stats.teachCount}</div>
              <div className="stat-sub">Including "Both"</div>
            </div>
            <UserCheck size={20} color="var(--gold-dim)" />
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Hosts</div>
              <div className="stat-value">{stats.hostCount}</div>
              <div className="stat-sub">Including "Both"</div>
            </div>
            <HomeIcon size={20} color="var(--gold-dim)" />
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Projected Income</div>
              <div className="stat-value">{fmt(stats.projected)}</div>
              <div className="stat-sub">From booked lessons + hostings</div>
            </div>
            <TrendingUp size={20} color="var(--gold-dim)" />
          </div>
        </div>
      </div>

      <div className="grid-2col" style={{ marginBottom: 22 }}>
        <div className="cdm-card" style={{ padding: 0 }}>
          <div className="cdm-card-header">
            <h3>Upcoming (Lessons &amp; Hostings)</h3>
            <button className="btn-ghost" onClick={() => onNavigate && onNavigate('calendar')}>Calendar</button>
          </div>
          <div style={{ padding: '8px 0' }}>
            {upcomingFromSheets.length === 0 && (
              <div style={{ padding: 22, color: 'var(--text-dim)', textAlign: 'center' }}>No upcoming items logged yet</div>
            )}
            {upcomingFromSheets.map(l => (
              <div key={l.type + l.id} style={{
                padding: '14px 22px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(42,42,50,0.5)',
              }}>
                <div>
                  <div style={{ color: 'var(--text)', fontSize: 14, marginBottom: 4 }}>{l.label}</div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                    <span><Clock size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />{fmtDate(l.date)} {l.time && '· ' + l.time}</span>
                    {l.location && <span><MapPin size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />{l.location}</span>}
                  </div>
                </div>
                <span className={`pill ${l.type === 'lesson' ? 'pill-gold' : 'pill-green'}`}>{l.subtitle || l.type}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="cdm-card" style={{ padding: 0 }}>
          <div className="cdm-card-header">
            <h3>Income Breakdown</h3>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Projected</span>
          </div>
          <div style={{ padding: 22 }}>
            <div className="summary-row">
              <span>From Booked Lessons</span>
              <span className="text-gold">{fmt(stats.projectedLessons)}</span>
            </div>
            <div className="summary-row">
              <span>From Booked Hostings</span>
              <span className="text-gold">{fmt(stats.projectedHostings)}</span>
            </div>
            <div className="summary-row total">
              <span>Total Projected</span>
              <span>{fmt(stats.projected)}</span>
            </div>
            <button className="btn-ghost" style={{ width: '100%', marginTop: 16 }} onClick={() => onNavigate && onNavigate('projections')}>
              View Detailed Projections
            </button>
          </div>
        </div>
      </div>

      <div className="cdm-card" style={{ padding: 0 }}>
        <div className="cdm-card-header">
          <h3>Contacts with Upcoming Dates</h3>
          <button className="btn-ghost" onClick={() => onNavigate && onNavigate('students')}>View all</button>
        </div>
        {upcomingByContacts.length === 0 ? (
          <div style={{ padding: 22, color: 'var(--text-dim)', textAlign: 'center' }}>
            No contacts have a "Next Scheduled" date set.
          </div>
        ) : (
          <table className="cdm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Relationship</th>
                <th>Next Scheduled</th>
                <th>Last Seen</th>
                <th>Lessons (6mo)</th>
                <th>Hostings (6mo)</th>
              </tr>
            </thead>
            <tbody>
              {upcomingByContacts.map(s => (
                <tr key={s.id}>
                  <td style={{ color: 'var(--text)' }}>{s.name}</td>
                  <td>{s.relationship}</td>
                  <td className="text-gold">{fmtDate(s.nextScheduled)}</td>
                  <td className="text-dim">{fmtDate(s.lastSeen)}</td>
                  <td className="text-gold">{s.lessons6mo || 0}</td>
                  <td className="text-gold">{s.hostings6mo || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Users, CalendarDays, DollarSign, TrendingUp, MapPin, Clock } from 'lucide-react';

const Dashboard = ({ onNavigate }) => {
  const { students, lessons, hostings } = useData();

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const active = students.filter(s => s.status === 'Active').length;
    const upcoming = lessons.filter(l => l.date >= today && l.status === 'Scheduled');
    const next7 = upcoming.filter(l => {
      const d = new Date(l.date);
      const limit = new Date();
      limit.setDate(limit.getDate() + 7);
      return d <= limit;
    });

    const projectedLessons = upcoming.reduce((sum, l) => sum + (l.price || 0), 0);
    const projectedHostings = hostings
      .filter(h => h.date >= today)
      .reduce((sum, h) => sum + (h.income || 0), 0);
    const totalBalance = students.reduce((sum, s) => sum + (s.balance || 0), 0);

    return {
      active, upcomingCount: upcoming.length, next7Count: next7.length,
      projected: projectedLessons + projectedHostings,
      projectedLessons, projectedHostings, totalBalance,
    };
  }, [students, lessons, hostings]);

  const upcomingList = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return lessons
      .filter(l => l.date >= today && l.status === 'Scheduled')
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, 6);
  }, [lessons]);

  const fmt = (n) => `$${Number(n).toLocaleString()}`;
  const fmtDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

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
              <div className="stat-label">Active Students</div>
              <div className="stat-value">{stats.active}</div>
              <div className="stat-sub">of {students.length} total</div>
            </div>
            <Users size={20} color="var(--gold-dim)" />
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Upcoming Lessons</div>
              <div className="stat-value">{stats.upcomingCount}</div>
              <div className="stat-sub">{stats.next7Count} in next 7 days</div>
            </div>
            <CalendarDays size={20} color="var(--gold-dim)" />
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Projected Income</div>
              <div className="stat-value">{fmt(stats.projected)}</div>
              <div className="stat-sub">Lessons + Hostings (booked)</div>
            </div>
            <TrendingUp size={20} color="var(--gold-dim)" />
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Outstanding Balances</div>
              <div className="stat-value">{fmt(stats.totalBalance)}</div>
              <div className="stat-sub">{students.filter(s => (s.balance || 0) > 0).length} students owe</div>
            </div>
            <DollarSign size={20} color="var(--gold-dim)" />
          </div>
        </div>
      </div>

      <div className="grid-2col" style={{ marginBottom: 22 }}>
        <div className="cdm-card" style={{ padding: 0 }}>
          <div className="cdm-card-header">
            <h3>Upcoming Lessons</h3>
            <button className="btn-ghost" onClick={() => onNavigate && onNavigate('lessons')}>View all</button>
          </div>
          <div style={{ padding: '8px 0' }}>
            {upcomingList.length === 0 && (
              <div style={{ padding: 22, color: 'var(--text-dim)', textAlign: 'center' }}>No upcoming lessons</div>
            )}
            {upcomingList.map(l => (
              <div key={l.id} style={{
                padding: '14px 22px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(42,42,50,0.5)',
              }}>
                <div>
                  <div style={{ color: 'var(--text)', fontSize: 14, marginBottom: 4 }}>
                    {l.studentName}
                  </div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-dim)' }}>
                    <span><Clock size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />{fmtDate(l.date)} - {l.time}</span>
                    <span><MapPin size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />{l.location}</span>
                  </div>
                </div>
                <span className="pill pill-gold">{l.style}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="cdm-card" style={{ padding: 0 }}>
          <div className="cdm-card-header">
            <h3>Income Breakdown</h3>
            <span className="sub" style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Projected</span>
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
          <h3>Student Overview</h3>
          <button className="btn-ghost" onClick={() => onNavigate && onNavigate('students')}>View all students</button>
        </div>
        <table className="cdm-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Level</th>
              <th>Style</th>
              <th>Lessons Left</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {students.slice(0, 6).map(s => (
              <tr key={s.id}>
                <td style={{ color: 'var(--text)' }}>{s.name}</td>
                <td>{s.level}</td>
                <td>{s.primaryStyle}</td>
                <td className="text-gold">{s.lessonsRemaining}</td>
                <td className={s.balance > 0 ? 'text-danger' : 'text-dim'}>{fmt(s.balance)}</td>
                <td>
                  <span className={`pill ${s.status === 'Active' ? 'pill-green' : 'pill-dim'}`}>
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;

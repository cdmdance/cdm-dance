import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import api from '../lib/api';
import { Users, CalendarDays, TrendingUp, MapPin, Clock, UserCheck, Home as HomeIcon, History, ArrowUpRight } from 'lucide-react';

const fmt = (n) => `$${Math.round(Number(n) || 0).toLocaleString()}`;
const fmtDate = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '-';

const Dashboard = ({ onNavigate }) => {
  const { students } = useData();
  const [income, setIncome] = useState(null);
  const [incomeLoading, setIncomeLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get('/income/analysis', { params: { days_back: 180, days_forward: 180, calendar: 'primary' } })
      .then(res => { if (active) setIncome(res.data); })
      .catch(() => {})
      .finally(() => { if (active) setIncomeLoading(false); });
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const teachCount = students.filter(s => s.relationship === 'Teach' || s.relationship === 'Both').length;
    const hostCount = students.filter(s => s.relationship === 'Host' || s.relationship === 'Both').length;
    const withNext = students.filter(s => s.nextScheduled && s.nextScheduled >= today).length;
    return {
      totalContacts: students.length,
      teachCount, hostCount, withNext,
    };
  }, [students]);

  const upcomingFromCalendar = useMemo(() => {
    if (!income) return [];
    return income.events
      .filter(e => e.date >= income.today && (e.type === 'lesson' || e.type === 'hosting'))
      .slice(0, 8);
  }, [income]);

  const upcomingByContacts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return students
      .filter(s => s.nextScheduled && s.nextScheduled >= today)
      .sort((a, b) => (a.nextScheduled || '').localeCompare(b.nextScheduled || ''))
      .slice(0, 6);
  }, [students]);

  return (
    <div>
      <h2 className="section-title">
        Dashboard
        <span className="sub">Overview</span>
      </h2>

      {/* Top stats row */}
      <div className="grid-stats" style={{ marginBottom: 22 }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Earned (past 6mo)</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>
                {incomeLoading ? '...' : fmt(income?.earned?.total || 0)}
              </div>
              <div className="stat-sub">
                {income ? `${income.earned.hostings_count} hostings + ${income.earned.lessons_count} lessons` : 'Loading...'}
              </div>
            </div>
            <History size={20} color="var(--gold-dim)" />
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Projected (next 6mo)</div>
              <div className="stat-value">
                {incomeLoading ? '...' : fmt(income?.projected?.total || 0)}
              </div>
              <div className="stat-sub">
                {income ? `${income.projected.hostings_count} hostings + ${income.projected.lessons_count} lessons` : 'Loading...'}
              </div>
            </div>
            <ArrowUpRight size={20} color="var(--gold-dim)" />
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Total Contacts</div>
              <div className="stat-value">{stats.totalContacts}</div>
              <div className="stat-sub">{stats.teachCount} students - {stats.hostCount} hosts</div>
            </div>
            <Users size={20} color="var(--gold-dim)" />
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">12-Month Total</div>
              <div className="stat-value">
                {incomeLoading ? '...' : fmt((income?.earned?.total || 0) + (income?.projected?.total || 0))}
              </div>
              <div className="stat-sub">Earned + projected</div>
            </div>
            <TrendingUp size={20} color="var(--gold-dim)" />
          </div>
        </div>
      </div>

      <div className="grid-2col" style={{ marginBottom: 22 }}>
        <div className="cdm-card" style={{ padding: 0 }}>
          <div className="cdm-card-header">
            <h3>Upcoming Events (from Google Calendar)</h3>
            <button className="btn-ghost" onClick={() => onNavigate && onNavigate('calendar')}>Calendar</button>
          </div>
          <div style={{ padding: '8px 0' }}>
            {upcomingFromCalendar.length === 0 && (
              <div style={{ padding: 22, color: 'var(--text-dim)', textAlign: 'center' }}>
                {incomeLoading ? 'Loading...' : 'No upcoming income events'}
              </div>
            )}
            {upcomingFromCalendar.map((e, i) => (
              <div key={e.id || `${e.date}-${e.time}-${i}`} style={{
                padding: '14px 22px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(42,42,50,0.5)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--text)', fontSize: 14, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.summary}
                  </div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                    <span><Clock size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />{fmtDate(e.date)} {e.time && '- ' + e.time}</span>
                    {e.location && <span><MapPin size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />{e.location}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`pill ${e.type === 'hosting' ? 'pill-green' : 'pill-gold'}`}>{e.type}</span>
                  <span className="text-gold" style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, minWidth: 60, textAlign: 'right' }}>{fmt(e.income)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="cdm-card" style={{ padding: 0 }}>
          <div className="cdm-card-header">
            <h3>This Year At a Glance</h3>
            <button className="btn-ghost" onClick={() => onNavigate && onNavigate('projections')}>Details</button>
          </div>
          <div style={{ padding: 22 }}>
            {income ? (
              <>
                <div className="summary-row"><span>Past 6 mo - Hostings</span><span className="text-gold">{fmt(income.earned.hostings)}</span></div>
                <div className="summary-row"><span>Past 6 mo - Lessons</span><span className="text-gold">{fmt(income.earned.lessons)}</span></div>
                <div className="summary-row"><span>Next 6 mo - Hostings</span><span className="text-gold">{fmt(income.projected.hostings)}</span></div>
                <div className="summary-row"><span>Next 6 mo - Lessons</span><span className="text-gold">{fmt(income.projected.lessons)}</span></div>
                <div className="summary-row total">
                  <span>12-Month Total</span>
                  <span>{fmt(income.earned.total + income.projected.total)}</span>
                </div>
                <div style={{ marginTop: 14, fontSize: 11, color: 'var(--muted)', textAlign: 'center', letterSpacing: '0.05em' }}>
                  Rates: ${income.rates.hosting_per_person}/host - ${income.rates.lesson_default}/lesson
                </div>
              </>
            ) : <div style={{ color: 'var(--text-dim)', textAlign: 'center' }}>Loading...</div>}
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
            No contacts have a &quot;Next Scheduled&quot; date set.
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

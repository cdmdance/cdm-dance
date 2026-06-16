import React, { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { TrendingUp, DollarSign, CalendarClock, Music, ArrowUpRight, History } from 'lucide-react';

const fmt = (n) => `$${Math.round(Number(n) || 0).toLocaleString()}`;
const fmtDate = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

const tooltipStyle = {
  background: '#15151a',
  border: '1px solid #2a2a32',
  borderRadius: 6,
  color: '#ece6d5',
  fontSize: 12,
};

// Helpers extracted out of component to keep useMemo bodies free of mutation
const sortByKeyDesc = (items, key) => {
  const copy = items.slice();
  copy.sort((a, b) => b[key] - a[key]);
  return copy;
};
const buildRanking = (obj, key) => {
  const items = Object.entries(obj || {}).map(([name, v]) => ({ name, ...v }));
  return sortByKeyDesc(items, key).slice(0, 10);
};
const computeCumulative = (monthlyChart) => {
  let cum = 0;
  const out = [];
  for (let i = 0; i < monthlyChart.length; i = i + 1) {
    const m = monthlyChart[i];
    cum = cum + m.Earned + m.Projected;
    out.push({ label: m.label, Total: cum });
  }
  return out;
};

const StatCard = ({ label, value, sub, icon, accent }) => (
  <div className="stat-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={accent ? { color: accent } : {}}>{value}</div>
        <div className="stat-sub">{sub}</div>
      </div>
      {icon}
    </div>
  </div>
);

const Projections = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEvents, setShowEvents] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/income/analysis', { params: { days_back: 180, days_forward: 180, calendar: 'primary' } })
      .then(res => { if (active) { setData(res.data); setError(null); } })
      .catch(e => { if (active) setError(e.response?.data?.detail || 'Failed to load income data'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  // Build a unified monthly bar chart: earned + projected side-by-side per month
  const monthlyChart = useMemo(() => {
    if (!data) return [];
    const months = new Set([...Object.keys(data.earned.by_month), ...Object.keys(data.projected.by_month)]);
    const arr = Array.from(months).sort().map(m => ({
      month: m,
      label: new Date(m + '-01T12:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      Earned: data.earned.by_month[m] || 0,
      Projected: data.projected.by_month[m] || 0,
    }));
    return arr;
  }, [data]);

  const cumulative = useMemo(() => computeCumulative(monthlyChart), [monthlyChart]);

  const topHosts = useMemo(() => buildRanking(data?.by_host, 'hostings_total'), [data]);
  const topStudents = useMemo(() => buildRanking(data?.by_student, 'lessons_total'), [data]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Analyzing calendar...</div>;
  }
  if (error) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>{error}</div>;
  }
  if (!data) return null;

  const { earned, projected, rates } = data;
  const total = earned.total + projected.total;

  return (
    <div>
      <h2 className="section-title">
        Income
        <span className="sub">From your Google Calendar - past 6 mo + next 6 mo</span>
      </h2>

      <div className="grid-stats" style={{ marginBottom: 22 }}>
        <StatCard
          label="Earned (past 6mo)"
          value={fmt(earned.total)}
          sub={`${earned.hostings_count} hostings + ${earned.lessons_count} lessons`}
          icon={<History size={20} color="var(--gold-dim)" />}
          accent="var(--success)"
        />
        <StatCard
          label="Projected (next 6mo)"
          value={fmt(projected.total)}
          sub={`${projected.hostings_count} hostings + ${projected.lessons_count} lessons`}
          icon={<ArrowUpRight size={20} color="var(--gold-dim)" />}
        />
        <StatCard
          label="Total 12-month View"
          value={fmt(total)}
          sub="Earned + projected"
          icon={<TrendingUp size={20} color="var(--gold-dim)" />}
        />
        <StatCard
          label="Hosting Rate / Lesson Rate"
          value={`$${rates.hosting_per_person} / $${rates.lesson_default}`}
          sub="Configurable in backend .env"
          icon={<DollarSign size={20} color="var(--gold-dim)" />}
        />
      </div>

      <div className="grid-2col" style={{ marginBottom: 22 }}>
        <div className="cdm-card">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Earned Breakdown</h3>
          <div className="summary-row">
            <span>From Hostings</span>
            <span className="text-gold">{fmt(earned.hostings)}</span>
          </div>
          <div className="summary-row">
            <span>From Lessons</span>
            <span className="text-gold">{fmt(earned.lessons)}</span>
          </div>
          <div className="summary-row total">
            <span>Total Earned</span>
            <span style={{ color: 'var(--success)' }}>{fmt(earned.total)}</span>
          </div>
        </div>

        <div className="cdm-card">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Projected Breakdown</h3>
          <div className="summary-row">
            <span>From Hostings</span>
            <span className="text-gold">{fmt(projected.hostings)}</span>
          </div>
          <div className="summary-row">
            <span>From Lessons</span>
            <span className="text-gold">{fmt(projected.lessons)}</span>
          </div>
          <div className="summary-row total">
            <span>Total Projected</span>
            <span>{fmt(projected.total)}</span>
          </div>
        </div>
      </div>

      <div className="cdm-card" style={{ padding: 0, marginBottom: 22 }}>
        <div className="cdm-card-header">
          <h3>Monthly Income — Earned vs Projected</h3>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            $ / month
          </span>
        </div>
        <div style={{ padding: 22, height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a32" />
              <XAxis dataKey="label" stroke="#a59f8e" style={{ fontSize: 11 }} />
              <YAxis stroke="#a59f8e" style={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} cursor={{ fill: 'rgba(200,165,91,0.05)' }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Bar dataKey="Earned" fill="#6bbf7a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Projected" fill="#c8a55b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="cdm-card" style={{ padding: 0, marginBottom: 22 }}>
        <div className="cdm-card-header"><h3>Cumulative 12-month Total</h3></div>
        <div style={{ padding: 22, height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumulative}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a32" />
              <XAxis dataKey="label" stroke="#a59f8e" style={{ fontSize: 11 }} />
              <YAxis stroke="#a59f8e" style={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
              <Line type="monotone" dataKey="Total" stroke="#d9bf75" strokeWidth={2} dot={{ fill: '#d9bf75', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2col" style={{ marginBottom: 22 }}>
        <div className="cdm-card" style={{ padding: 0 }}>
          <div className="cdm-card-header"><h3>Top Hosts (12 months)</h3></div>
          <table className="cdm-table">
            <thead><tr><th>Name</th><th style={{ textAlign: 'right' }}>Events</th><th style={{ textAlign: 'right' }}>Income</th></tr></thead>
            <tbody>
              {topHosts.map(h => (
                <tr key={h.name}>
                  <td style={{ color: 'var(--text)' }}>{h.name}</td>
                  <td style={{ textAlign: 'right' }}>{h.hostings_count}</td>
                  <td style={{ textAlign: 'right' }} className="text-gold">{fmt(h.hostings_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="cdm-card" style={{ padding: 0 }}>
          <div className="cdm-card-header"><h3>Top Students (12 months)</h3></div>
          <table className="cdm-table">
            <thead><tr><th>Name</th><th style={{ textAlign: 'right' }}>Lessons</th><th style={{ textAlign: 'right' }}>Income</th></tr></thead>
            <tbody>
              {topStudents.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>No lessons detected</td></tr>
              )}
              {topStudents.map(s => (
                <tr key={s.name}>
                  <td style={{ color: 'var(--text)' }}>{s.name}</td>
                  <td style={{ textAlign: 'right' }}>{s.lessons_count}</td>
                  <td style={{ textAlign: 'right' }} className="text-gold">{fmt(s.lessons_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cdm-card" style={{ padding: 0 }}>
        <div className="cdm-card-header">
          <h3>Parsed Events ({data.events.length})</h3>
          <button className="btn-ghost" onClick={() => setShowEvents(!showEvents)}>
            {showEvents ? 'Hide' : 'Show'} all events
          </button>
        </div>
        {showEvents && (
          <table className="cdm-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Event Title</th>
                <th>Type</th>
                <th>Names / Student</th>
                <th style={{ textAlign: 'right' }}>Income</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((e, i) => (
                <tr key={`${e.date}-${e.time}-${e.summary}-${i}`}>
                  <td>{fmtDate(e.date)}</td>
                  <td className="text-dim">{e.time}</td>
                  <td style={{ color: 'var(--text)' }}>{e.summary}</td>
                  <td>
                    <span className={`pill ${e.type === 'hosting' ? 'pill-green' : e.type === 'lesson' ? 'pill-gold' : 'pill-dim'}`}>
                      {e.type}
                    </span>
                  </td>
                  <td className="text-dim">{(e.names && e.names.length) ? e.names.join(', ') : e.student}</td>
                  <td style={{ textAlign: 'right' }} className={e.income > 0 ? 'text-gold' : 'text-muted'}>
                    {e.income > 0 ? fmt(e.income) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Projections;

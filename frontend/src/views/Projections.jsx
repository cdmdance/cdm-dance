import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, CalendarClock, Music } from 'lucide-react';

const Projections = () => {
  const { lessons, hostings } = useData();
  const [grouping, setGrouping] = useState('week'); // 'week' | 'month'

  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  const upcomingLessons = useMemo(
    () => lessons.filter(l => l.date >= todayISO && (l.status === 'Scheduled' || l.status === 'Rescheduled')),
    [lessons, todayISO]
  );
  const upcomingHostings = useMemo(
    () => hostings.filter(h => h.date >= todayISO),
    [hostings, todayISO]
  );

  const totalLessons = upcomingLessons.reduce((s, l) => s + (l.price || 0), 0);
  const totalHostings = upcomingHostings.reduce((s, h) => s + (h.income || 0), 0);
  const grandTotal = totalLessons + totalHostings;
  const lessonCount = upcomingLessons.length;
  const hostingCount = upcomingHostings.length;

  // Weekly buckets - next 12 weeks
  const weeklyData = useMemo(() => {
    const buckets = {};
    const startOfWeek = (d) => {
      const date = new Date(d);
      const day = date.getDay();
      date.setDate(date.getDate() - day);
      return date.toISOString().slice(0, 10);
    };
    for (let i = 0; i < 12; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i * 7);
      const key = startOfWeek(d);
      buckets[key] = { week: key, Lessons: 0, Hostings: 0 };
    }
    upcomingLessons.forEach(l => {
      const k = startOfWeek(new Date(l.date + 'T12:00:00'));
      if (buckets[k]) buckets[k].Lessons += (l.price || 0);
    });
    upcomingHostings.forEach(h => {
      const k = startOfWeek(new Date(h.date + 'T12:00:00'));
      if (buckets[k]) buckets[k].Hostings += (h.income || 0);
    });
    return Object.values(buckets).map(b => ({
      ...b,
      label: new Date(b.week + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Total: b.Lessons + b.Hostings,
    }));
  }, [upcomingLessons, upcomingHostings]);

  // Monthly buckets - next 6 months
  const monthlyData = useMemo(() => {
    const buckets = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[k] = { month: k, label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), Lessons: 0, Hostings: 0 };
    }
    upcomingLessons.forEach(l => {
      const k = l.date.slice(0, 7);
      if (buckets[k]) buckets[k].Lessons += (l.price || 0);
    });
    upcomingHostings.forEach(h => {
      const k = h.date.slice(0, 7);
      if (buckets[k]) buckets[k].Hostings += (h.income || 0);
    });
    return Object.values(buckets).map(b => ({ ...b, Total: b.Lessons + b.Hostings }));
  }, [upcomingLessons, upcomingHostings]);

  const chartData = grouping === 'week' ? weeklyData : monthlyData;

  // Breakdown by style
  const styleBreakdown = useMemo(() => {
    const m = {};
    upcomingLessons.forEach(l => {
      m[l.style] = (m[l.style] || 0) + (l.price || 0);
    });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [upcomingLessons]);

  const PIE_COLORS = ['#c8a55b', '#d9bf75', '#8e7a40', '#7ab8cf', '#9b8edb', '#6bbf7a', '#c75c5c', '#a59f8e'];

  const fmt = (n) => `$${Number(n).toLocaleString()}`;

  const tooltipStyle = {
    background: '#15151a',
    border: '1px solid #2a2a32',
    borderRadius: 6,
    color: '#ece6d5',
    fontSize: 12,
  };

  return (
    <div>
      <h2 className="section-title">
        Projected Income
        <span className="sub">From booked lessons & hostings</span>
      </h2>

      <div className="grid-stats" style={{ marginBottom: 22 }}>
        <StatCard label="Total Projected" value={fmt(grandTotal)} sub="All upcoming bookings" icon={<TrendingUp size={20} color="var(--gold-dim)" />} />
        <StatCard label="From Lessons" value={fmt(totalLessons)} sub={`${lessonCount} scheduled`} icon={<Music size={20} color="var(--gold-dim)" />} />
        <StatCard label="From Hostings" value={fmt(totalHostings)} sub={`${hostingCount} events`} icon={<CalendarClock size={20} color="var(--gold-dim)" />} />
        <StatCard label="Avg per Lesson" value={fmt(lessonCount ? Math.round(totalLessons / lessonCount) : 0)} sub="Booked rate" icon={<DollarSign size={20} color="var(--gold-dim)" />} />
      </div>

      <div className="cdm-card" style={{ padding: 0, marginBottom: 22 }}>
        <div className="cdm-card-header">
          <h3>Income Forecast</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn-ghost"
              style={grouping === 'week' ? { borderColor: 'var(--gold)', color: 'var(--gold-2)' } : {}}
              onClick={() => setGrouping('week')}
            >Weekly</button>
            <button
              className="btn-ghost"
              style={grouping === 'month' ? { borderColor: 'var(--gold)', color: 'var(--gold-2)' } : {}}
              onClick={() => setGrouping('month')}
            >Monthly</button>
          </div>
        </div>
        <div style={{ padding: 22, height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a32" />
              <XAxis dataKey="label" stroke="#a59f8e" style={{ fontSize: 11 }} />
              <YAxis stroke="#a59f8e" style={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} cursor={{ fill: 'rgba(200,165,91,0.05)' }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Bar dataKey="Lessons" stackId="a" fill="#c8a55b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Hostings" stackId="a" fill="#7ab8cf" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2col">
        <div className="cdm-card" style={{ padding: 0 }}>
          <div className="cdm-card-header"><h3>Cumulative Income Trend</h3></div>
          <div style={{ padding: 22, height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={(() => {
                let cum = 0;
                return chartData.map(d => ({ label: d.label, Cumulative: (cum += d.Total) }));
              })()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a32" />
                <XAxis dataKey="label" stroke="#a59f8e" style={{ fontSize: 11 }} />
                <YAxis stroke="#a59f8e" style={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
                <Line type="monotone" dataKey="Cumulative" stroke="#d9bf75" strokeWidth={2} dot={{ fill: '#d9bf75', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="cdm-card" style={{ padding: 0 }}>
          <div className="cdm-card-header"><h3>Lessons by Style</h3></div>
          <div style={{ padding: 22, height: 280, display: 'flex' }}>
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie data={styleBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                  {styleBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ width: '40%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
              {styleBreakdown.slice(0, 6).map((s, i) => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span style={{ flex: 1, color: 'var(--text-dim)' }}>{s.name}</span>
                  <span className="text-gold">{fmt(s.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, sub, icon }) => (
  <div className="stat-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        <div className="stat-sub">{sub}</div>
      </div>
      {icon}
    </div>
  </div>
);

export default Projections;

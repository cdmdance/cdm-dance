import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Trash2, Calendar as CalIcon } from 'lucide-react';

const Lessons = () => {
  const { lessons, students, styles, addLesson, deleteLesson, gcalConnected } = useData();
  const [form, setForm] = useState({
    studentId: '', date: new Date().toISOString().slice(0, 10), time: '18:00',
    location: '', style: styles[0] || '', status: 'Scheduled', notes: '', price: 75,
  });
  const [filter, setFilter] = useState('all');

  const handleAdd = () => {
    if (!form.studentId || !form.date) return;
    addLesson(form);
    setForm({ ...form, notes: '' });
  };

  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let list = [...lessons];
    if (filter === 'upcoming') list = list.filter(l => l.date >= today);
    if (filter === 'past') list = list.filter(l => l.date < today);
    if (filter === 'completed') list = list.filter(l => l.status === 'Completed');
    return list.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [lessons, filter]);

  const fmtDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const pillFor = (status) => {
    if (status === 'Completed') return 'pill-green';
    if (status === 'Cancelled') return 'pill-red';
    if (status === 'Scheduled') return 'pill-gold';
    return 'pill-dim';
  };

  return (
    <div>
      <h2 className="section-title">
        Lessons
        <span className="sub">{filtered.length} records</span>
      </h2>

      <div className="cdm-card" style={{ marginBottom: 22 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Log a Lesson</h3>
        <div className="grid-3col">
          <div className="cdm-field">
            <label className="cdm-label">Student</label>
            <select className="cdm-select" value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}>
              <option value="">Select student...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="cdm-field">
            <label className="cdm-label">Date</label>
            <input type="date" className="cdm-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="cdm-field">
            <label className="cdm-label">Time</label>
            <input type="time" className="cdm-input" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
          </div>
          <div className="cdm-field">
            <label className="cdm-label">Location</label>
            <input type="text" className="cdm-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Studio or address" />
          </div>
          <div className="cdm-field">
            <label className="cdm-label">Dance Style</label>
            <select className="cdm-select" value={form.style} onChange={e => setForm({ ...form, style: e.target.value })}>
              {styles.map(st => <option key={st}>{st}</option>)}
            </select>
          </div>
          <div className="cdm-field">
            <label className="cdm-label">Status</label>
            <select className="cdm-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option>Scheduled</option><option>Completed</option><option>Cancelled</option><option>Rescheduled</option>
            </select>
          </div>
          <div className="cdm-field">
            <label className="cdm-label">Price ($)</label>
            <input type="number" className="cdm-input" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
          </div>
          <div className="cdm-field" style={{ gridColumn: 'span 2' }}>
            <label className="cdm-label">Notes</label>
            <input type="text" className="cdm-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
          <button className="btn-gold" onClick={handleAdd}>
            <Plus size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />Add Lesson
          </button>
          {gcalConnected && (
            <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
              <CalIcon size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />
              Will sync to Google Calendar
            </span>
          )}
        </div>
      </div>

      <div className="cdm-card" style={{ padding: 0 }}>
        <div className="cdm-card-header">
          <h3>Lesson Log</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'upcoming', 'past', 'completed'].map(f => (
              <button
                key={f}
                className={`btn-ghost`}
                style={f === filter ? { borderColor: 'var(--gold)', color: 'var(--gold-2)' } : {}}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <table className="cdm-table">
          <thead>
            <tr>
              <th>Date</th><th>Time</th><th>Student</th><th>Style</th><th>Location</th><th>Price</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id}>
                <td>{fmtDate(l.date)}</td>
                <td className="text-dim">{l.time}</td>
                <td style={{ color: 'var(--text)' }}>{l.studentName}</td>
                <td>{l.style}</td>
                <td className="text-dim">{l.location}</td>
                <td className="text-gold">${l.price}</td>
                <td><span className={`pill ${pillFor(l.status)}`}>{l.status}</span></td>
                <td>
                  <button className="btn-icon" onClick={() => deleteLesson(l.id)} title="Delete">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Lessons;

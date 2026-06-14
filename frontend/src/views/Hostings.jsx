import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Calendar as CalIcon } from 'lucide-react';

const Hostings = () => {
  const { hostings, addHosting, gcalConnected } = useData();
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    location: '', names: '', income: 0, notes: ''
  });

  const handleAdd = () => {
    if (!form.location || !form.date) return;
    addHosting(form);
    setForm({ ...form, location: '', names: '', income: 0, notes: '' });
  };

  const sorted = useMemo(() =>
    [...hostings].sort((a, b) => b.date.localeCompare(a.date)), [hostings]);

  const totalUpcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return hostings.filter(h => h.date >= today).reduce((s, h) => s + h.income, 0);
  }, [hostings]);

  const fmtDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div>
      <h2 className="section-title">
        Hostings
        <span className="sub">{hostings.length} events - ${totalUpcoming.toLocaleString()} projected</span>
      </h2>

      <div className="cdm-card" style={{ marginBottom: 22 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Add Hosting Event</h3>
        <div className="grid-2col">
          <div className="cdm-field">
            <label className="cdm-label">Date</label>
            <input type="date" className="cdm-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="cdm-field">
            <label className="cdm-label">Location / Venue</label>
            <input type="text" className="cdm-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
          </div>
        </div>
        <div className="cdm-field">
          <label className="cdm-label">Names (comma-separated)</label>
          <input type="text" className="cdm-input" value={form.names} onChange={e => setForm({ ...form, names: e.target.value })} placeholder="e.g. Mandy, Nair, Arleen" />
        </div>
        <div className="grid-2col">
          <div className="cdm-field">
            <label className="cdm-label">Income ($)</label>
            <input type="number" className="cdm-input" value={form.income} onChange={e => setForm({ ...form, income: Number(e.target.value) })} />
          </div>
          <div className="cdm-field">
            <label className="cdm-label">Notes</label>
            <input type="text" className="cdm-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn-gold" onClick={handleAdd}>
            <Plus size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />Add Hosting
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
          <h3>Hosting Log</h3>
        </div>
        <table className="cdm-table">
          <thead>
            <tr><th>Date</th><th>Names</th><th>Location</th><th>Notes</th><th>Income</th></tr>
          </thead>
          <tbody>
            {sorted.map(h => (
              <tr key={h.id}>
                <td>{fmtDate(h.date)}</td>
                <td style={{ color: 'var(--text)' }}>{h.names}</td>
                <td className="text-dim">{h.location}</td>
                <td className="text-dim" style={{ fontStyle: 'italic' }}>{h.notes}</td>
                <td className="text-gold">${h.income}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Hostings;

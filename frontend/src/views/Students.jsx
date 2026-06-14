import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import api from '../lib/api';
import { Plus, X, Mail, Phone, Search, Upload, Trash2, Calendar } from 'lucide-react';

const initialForm = {
  name: '', relationship: 'Both', phone: '', email: '',
  lastSeen: '', nextScheduled: '',
  lessons6mo: 0, hostings6mo: 0, notes: '',
};

const RELATIONSHIPS = ['Both', 'Teach', 'Host'];

const relPill = (rel) => {
  if (rel === 'Both') return 'pill-gold';
  if (rel === 'Teach') return 'pill-green';
  if (rel === 'Host') return 'pill-dim';
  return 'pill-dim';
};

const Students = () => {
  const { students, addStudent, refreshData, showToast } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);

  const initials = (name) => (name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  const handleAdd = async () => {
    if (!form.name) return;
    await addStudent(form);
    setModalOpen(false);
    setForm(initialForm);
  };

  const handleImport = async () => {
    if (!window.confirm('This will WIPE the Students tab and replace it with your 24 real contacts. Continue?')) return;
    setImporting(true);
    try {
      const res = await api.post('/setup/import-students');
      showToast(`Imported ${res.data.imported} students`);
      await refreshData();
    } catch (e) {
      showToast(e.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Wipe ALL students from the sheet? This cannot be undone.')) return;
    setClearing(true);
    try {
      await api.post('/setup/clear-tab', null, { params: { tab: 'Students' } });
      showToast('Students tab cleared');
      await refreshData();
    } catch (e) {
      showToast('Clear failed');
    } finally {
      setClearing(false);
    }
  };

  const filtered = useMemo(() => {
    let list = students;
    if (filter !== 'all') list = list.filter(s => s.relationship === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.phone || '').includes(q));
    }
    return list;
  }, [students, search, filter]);

  const counts = useMemo(() => ({
    all: students.length,
    Both: students.filter(s => s.relationship === 'Both').length,
    Teach: students.filter(s => s.relationship === 'Teach').length,
    Host: students.filter(s => s.relationship === 'Host').length,
  }), [students]);

  const fmtDate = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '-';

  return (
    <div>
      <h2 className="section-title">
        Students &amp; Hosts
        <span className="sub">{filtered.length} of {students.length}</span>
      </h2>

      {students.length === 0 && (
        <div className="cdm-card" style={{ marginBottom: 22, textAlign: 'center', padding: 30 }}>
          <h3 style={{ marginBottom: 10 }}>No students yet</h3>
          <p style={{ color: 'var(--text-dim)', marginBottom: 18, fontSize: 13 }}>
            Import your real contacts from the data file, or add them manually.
          </p>
          <button className="btn-gold" onClick={handleImport} disabled={importing}>
            <Upload size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            {importing ? 'Importing...' : 'Import 24 contacts from data file'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            className="cdm-input"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'Both', 'Teach', 'Host'].map(f => (
            <button
              key={f}
              className="btn-ghost"
              style={f === filter ? { borderColor: 'var(--gold)', color: 'var(--gold-2)' } : {}}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f} ({counts[f]})
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {students.length > 0 && (
          <button className="btn-ghost" onClick={handleImport} disabled={importing} title="Re-import from seed file">
            <Upload size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            {importing ? 'Importing...' : 'Re-import'}
          </button>
        )}
        <button className="btn-gold" onClick={() => setModalOpen(true)}>
          <Plus size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
          Add Student
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {filtered.map(s => (
          <div key={s.id} className="student-card" onClick={() => setDetailStudent(s)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div className="avatar">{initials(s.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--text)', fontSize: 15, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.name}
                </div>
                <span className={`pill ${relPill(s.relationship)}`}>{s.relationship || 'Unknown'}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Lessons (6mo)</div>
                <div className="text-gold" style={{ fontFamily: 'Playfair Display, serif', fontSize: 18 }}>{s.lessons6mo || 0}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Hostings (6mo)</div>
                <div className="text-gold" style={{ fontFamily: 'Playfair Display, serif', fontSize: 18 }}>{s.hostings6mo || 0}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Lessons Bought</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: 'var(--text)' }}>{s.lessonsTotal || 0}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Total Paid</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: 'var(--success)' }}>${s.totalPaid || 0}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, fontSize: 11, color: 'var(--text-dim)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Last seen</span>
                <span style={{ color: 'var(--text)' }}>{fmtDate(s.lastSeen)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Next</span>
                <span style={{ color: s.nextScheduled ? 'var(--gold-2)' : 'var(--muted)' }}>{fmtDate(s.nextScheduled)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="cdm-card-header">
              <h3>Add New Contact</h3>
              <button className="btn-icon" onClick={() => setModalOpen(false)}><X size={14} /></button>
            </div>
            <div style={{ padding: 22 }}>
              <div className="cdm-field">
                <label className="cdm-label">Name</label>
                <input className="cdm-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="cdm-field">
                <label className="cdm-label">Relationship</label>
                <select className="cdm-select" value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })}>
                  {RELATIONSHIPS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="grid-2col">
                <div className="cdm-field">
                  <label className="cdm-label">Phone</label>
                  <input className="cdm-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="cdm-field">
                  <label className="cdm-label">Email</label>
                  <input className="cdm-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="grid-2col">
                <div className="cdm-field">
                  <label className="cdm-label">Last Seen</label>
                  <input type="date" className="cdm-input" value={form.lastSeen} onChange={e => setForm({ ...form, lastSeen: e.target.value })} />
                </div>
                <div className="cdm-field">
                  <label className="cdm-label">Next Scheduled</label>
                  <input type="date" className="cdm-input" value={form.nextScheduled} onChange={e => setForm({ ...form, nextScheduled: e.target.value })} />
                </div>
              </div>
              <div className="cdm-field">
                <label className="cdm-label">Notes</label>
                <textarea className="cdm-textarea" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <button className="btn-gold" style={{ width: '100%' }} onClick={handleAdd}>Save Contact</button>
            </div>
          </div>
        </div>
      )}

      {detailStudent && (
        <div className="modal-overlay" onClick={() => setDetailStudent(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="cdm-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="avatar">{initials(detailStudent.name)}</div>
                <div>
                  <h3>{detailStudent.name}</h3>
                  <span className={`pill ${relPill(detailStudent.relationship)}`} style={{ marginTop: 4 }}>{detailStudent.relationship || 'Unknown'}</span>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setDetailStudent(null)}><X size={14} /></button>
            </div>
            <div style={{ padding: 22 }}>
              <div className="grid-2col" style={{ marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Contact</div>
                  <div style={{ fontSize: 13, marginBottom: 4 }}><Phone size={12} style={{ verticalAlign: '-1px', marginRight: 6 }} />{detailStudent.phone || <span className="text-muted">No phone</span>}</div>
                  <div style={{ fontSize: 13 }}><Mail size={12} style={{ verticalAlign: '-1px', marginRight: 6 }} />{detailStudent.email || <span className="text-muted">No email</span>}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Schedule</div>
                  <div style={{ fontSize: 13, marginBottom: 4 }}><Calendar size={12} style={{ verticalAlign: '-1px', marginRight: 6 }} />Last: {fmtDate(detailStudent.lastSeen)}</div>
                  <div style={{ fontSize: 13 }}><Calendar size={12} style={{ verticalAlign: '-1px', marginRight: 6 }} />Next: {fmtDate(detailStudent.nextScheduled)}</div>
                </div>
              </div>
              <div className="divider-gold" />
              <div className="grid-2col" style={{ marginBottom: 14 }}>
                <div>
                  <div className="stat-label">Lessons (6 months)</div>
                  <div className="stat-value">{detailStudent.lessons6mo || 0}</div>
                </div>
                <div>
                  <div className="stat-label">Hostings (6 months)</div>
                  <div className="stat-value">{detailStudent.hostings6mo || 0}</div>
                </div>
              </div>
              <div className="grid-2col">
                <div>
                  <div className="stat-label">Lessons Bought</div>
                  <div className="stat-value">{detailStudent.lessonsTotal || 0}</div>
                </div>
                <div>
                  <div className="stat-label">Total Paid</div>
                  <div className="stat-value" style={{ color: 'var(--success)' }}>${detailStudent.totalPaid || 0}</div>
                </div>
              </div>
              {detailStudent.notes && (
                <>
                  <div className="divider-gold" />
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Notes</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontStyle: 'italic', lineHeight: 1.6 }}>{detailStudent.notes}</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;

import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, X, Mail, Phone, MapPin } from 'lucide-react';

const initialForm = {
  name: '', email: '', phone: '', level: 'Beginner',
  primaryStyle: 'Salsa', status: 'Active', balance: 0,
  lessonsRemaining: 0, package: '', notes: '',
  joinDate: new Date().toISOString().slice(0, 10),
};

const Students = () => {
  const { students, addStudent, styles } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState('');

  const initials = (name) => name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  const handleAdd = () => {
    if (!form.name) return;
    addStudent(form);
    setModalOpen(false);
    setForm(initialForm);
  };

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h2 className="section-title">
        Students
        <span className="sub">{filtered.length} total</span>
      </h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
        <input
          className="cdm-input"
          placeholder="Search students by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <div style={{ flex: 1 }} />
        <button className="btn-gold" onClick={() => setModalOpen(true)}>
          <Plus size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
          Add Student
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filtered.map(s => (
          <div key={s.id} className="student-card" onClick={() => setDetailStudent(s)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div className="avatar">{initials(s.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--text)', fontSize: 15, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {s.level} - {s.primaryStyle}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Lessons Left</span>
              <span className="text-gold" style={{ fontFamily: 'Playfair Display, serif', fontSize: 16 }}>{s.lessonsRemaining}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Balance</span>
              <span className={s.balance > 0 ? 'text-danger' : 'text-dim'} style={{ fontFamily: 'Playfair Display, serif', fontSize: 16 }}>${s.balance}</span>
            </div>
            <span className={`pill ${s.status === 'Active' ? 'pill-green' : 'pill-dim'}`}>{s.status}</span>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="cdm-card-header">
              <h3>Add New Student</h3>
              <button className="btn-icon" onClick={() => setModalOpen(false)}><X size={14} /></button>
            </div>
            <div style={{ padding: 22 }}>
              <div className="cdm-field">
                <label className="cdm-label">Full Name</label>
                <input className="cdm-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid-2col">
                <div className="cdm-field">
                  <label className="cdm-label">Email</label>
                  <input className="cdm-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="cdm-field">
                  <label className="cdm-label">Phone</label>
                  <input className="cdm-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid-2col">
                <div className="cdm-field">
                  <label className="cdm-label">Level</label>
                  <select className="cdm-select" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
                    <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                  </select>
                </div>
                <div className="cdm-field">
                  <label className="cdm-label">Primary Style</label>
                  <select className="cdm-select" value={form.primaryStyle} onChange={e => setForm({ ...form, primaryStyle: e.target.value })}>
                    {styles.map(st => <option key={st}>{st}</option>)}
                  </select>
                </div>
              </div>
              <div className="cdm-field">
                <label className="cdm-label">Notes</label>
                <textarea className="cdm-textarea" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <button className="btn-gold" style={{ width: '100%' }} onClick={handleAdd}>Save Student</button>
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
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{detailStudent.level} - {detailStudent.primaryStyle}</div>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setDetailStudent(null)}><X size={14} /></button>
            </div>
            <div style={{ padding: 22 }}>
              <div className="grid-2col" style={{ marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Contact</div>
                  <div style={{ fontSize: 13, marginBottom: 4 }}><Mail size={12} style={{ verticalAlign: '-1px', marginRight: 6 }} />{detailStudent.email}</div>
                  <div style={{ fontSize: 13 }}><Phone size={12} style={{ verticalAlign: '-1px', marginRight: 6 }} />{detailStudent.phone}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Package</div>
                  <div style={{ fontSize: 13 }}>{detailStudent.package || '-'}</div>
                </div>
              </div>
              <div className="divider-gold" />
              <div className="grid-3col">
                <div>
                  <div className="stat-label">Lessons Left</div>
                  <div className="stat-value">{detailStudent.lessonsRemaining}</div>
                </div>
                <div>
                  <div className="stat-label">Completed</div>
                  <div className="stat-value">{detailStudent.lessonsCompleted}</div>
                </div>
                <div>
                  <div className="stat-label">Balance</div>
                  <div className="stat-value" style={{ color: detailStudent.balance > 0 ? 'var(--danger)' : 'var(--gold-2)' }}>${detailStudent.balance}</div>
                </div>
              </div>
              {detailStudent.notes && (
                <>
                  <div className="divider-gold" />
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Notes</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontStyle: 'italic' }}>{detailStudent.notes}</div>
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

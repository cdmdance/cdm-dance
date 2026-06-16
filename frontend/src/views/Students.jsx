import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import api from '../lib/api';
import { Plus, X, Mail, Phone, Search, Upload, Trash2, Calendar, Edit2, Gift, Save } from 'lucide-react';

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

const initials = (name) => (name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
const fmtDate = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '-';

const Students = () => {
  const {
    students, addStudent, updateStudent, deleteStudent, addBonusLessons,
    studentBalances, fetchAllStudentBalances,
    refreshData, showToast,
  } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [bonusValue, setBonusValue] = useState('');
  const [bonusNote, setBonusNote] = useState('');
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [importing, setImporting] = useState(false);

  // Load balances when students list is ready
  useEffect(() => {
    if (students.length > 0 && Object.keys(studentBalances).length === 0) {
      fetchAllStudentBalances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students.length]);

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

  const openEdit = () => {
    setEditForm({
      name: detailStudent.name || '',
      relationship: detailStudent.relationship || 'Both',
      phone: detailStudent.phone || '',
      email: detailStudent.email || '',
      lastSeen: detailStudent.lastSeen || '',
      nextScheduled: detailStudent.nextScheduled || '',
      lessons6mo: detailStudent.lessons6mo || 0,
      hostings6mo: detailStudent.hostings6mo || 0,
      notes: detailStudent.notes || '',
    });
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name) {
      showToast('Name is required');
      return;
    }
    await updateStudent(detailStudent.id, editForm);
    setDetailStudent({ ...detailStudent, ...editForm });
    setEditMode(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${detailStudent.name}? This cannot be undone.`)) return;
    await deleteStudent(detailStudent.id);
    setDetailStudent(null);
    setEditMode(false);
  };

  const handleAddBonus = async () => {
    const n = Number(bonusValue);
    if (!n || n <= 0) {
      showToast('Enter a positive number of lessons');
      return;
    }
    await addBonusLessons(detailStudent.id, n, bonusNote);
    setDetailStudent(prev => prev ? { ...prev, lessonsTotal: (Number(prev.lessonsTotal) || 0) + n } : null);
    setBonusOpen(false);
    setBonusValue('');
    setBonusNote('');
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

  const getRemaining = (id) => {
    const b = studentBalances[id];
    if (!b) return null;
    return Math.max(0, Number(b.lessonsRemaining) || 0);
  };
  const getUsed = (id) => {
    const b = studentBalances[id];
    if (!b) return null;
    return Math.max(0, Number(b.lessonsUsed) || 0);
  };

  const remColor = (rem) => {
    if (rem === null || rem === undefined) return 'var(--text-dim)';
    if (rem === 0) return 'var(--danger)';
    if (rem <= 2) return '#e8a44b';
    return 'var(--gold-2)';
  };

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
          <button data-testid="import-students-btn" className="btn-gold" onClick={handleImport} disabled={importing}>
            <Upload size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            {importing ? 'Importing...' : 'Import 24 contacts from data file'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            data-testid="students-search"
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
              data-testid={`filter-${f}-btn`}
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
        <button data-testid="add-student-btn" className="btn-gold" onClick={() => setModalOpen(true)}>
          <Plus size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
          Add Student
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {filtered.map(s => {
          const rem = getRemaining(s.id);
          return (
            <div
              key={s.id}
              data-testid={`student-card-${s.id}`}
              className="student-card"
              onClick={() => { setDetailStudent(s); setEditMode(false); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div className="avatar">{initials(s.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--text)', fontSize: 15, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.name}
                  </div>
                  <span className={`pill ${relPill(s.relationship)}`}>{s.relationship || 'Unknown'}</span>
                </div>
                {rem !== null && rem <= 2 && (
                  <span
                    className="pill"
                    style={{
                      background: rem === 0 ? 'rgba(220,90,90,0.12)' : 'rgba(232,164,75,0.12)',
                      color: rem === 0 ? 'var(--danger)' : '#e8a44b',
                      borderColor: 'transparent',
                      fontSize: 9,
                    }}
                    title={rem === 0 ? 'No lessons remaining' : 'Low balance'}
                  >
                    {rem === 0 ? 'EMPTY' : 'LOW'}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Bought</div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: 'var(--text)' }}>{s.lessonsTotal || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Used</div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: 'var(--text-dim)' }}>{getUsed(s.id) ?? '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Remaining</div>
                  <div data-testid={`remaining-${s.id}`} style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: remColor(rem) }}>
                    {rem ?? '-'}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, fontSize: 11, color: 'var(--text-dim)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Total Paid</span>
                  <span style={{ color: 'var(--success)' }}>${s.totalPaid || 0}</span>
                </div>
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
          );
        })}
      </div>

      {modalOpen && (
        <AddStudentModal
          form={form}
          setForm={setForm}
          onClose={() => setModalOpen(false)}
          onSave={handleAdd}
        />
      )}

      {detailStudent && (
        <StudentDetailModal
          student={detailStudent}
          editMode={editMode}
          editForm={editForm}
          setEditForm={setEditForm}
          balance={studentBalances[detailStudent.id]}
          onClose={() => { setDetailStudent(null); setEditMode(false); }}
          onEdit={openEdit}
          onCancelEdit={() => setEditMode(false)}
          onSaveEdit={handleSaveEdit}
          onDelete={handleDelete}
          onOpenBonus={() => setBonusOpen(true)}
        />
      )}

      {bonusOpen && (
        <BonusLessonsModal
          studentName={detailStudent?.name}
          value={bonusValue}
          setValue={setBonusValue}
          note={bonusNote}
          setNote={setBonusNote}
          onClose={() => { setBonusOpen(false); setBonusValue(''); setBonusNote(''); }}
          onConfirm={handleAddBonus}
        />
      )}
    </div>
  );
};

/* ---------------- Sub-components ---------------- */

const AddStudentModal = ({ form, setForm, onClose, onSave }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
      <div className="cdm-card-header">
        <h3>Add New Contact</h3>
        <button className="btn-icon" onClick={onClose} data-testid="close-add-student"><X size={14} /></button>
      </div>
      <div style={{ padding: 22 }}>
        <div className="cdm-field">
          <label className="cdm-label">Name</label>
          <input data-testid="add-name" className="cdm-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
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
        <button data-testid="save-new-student-btn" className="btn-gold" style={{ width: '100%' }} onClick={onSave}>Save Contact</button>
      </div>
    </div>
  </div>
);

/* helper aliases used by sub-components */

const StudentDetailModal = ({
  student, editMode, editForm, setEditForm, balance,
  onClose, onEdit, onCancelEdit, onSaveEdit, onDelete, onOpenBonus,
}) => {
  const lessonsTotal = Number(student.lessonsTotal || 0);
  const lessonsUsed = balance ? Number(balance.lessonsUsed || 0) : null;
  const lessonsRemaining = balance ? Math.max(0, Number(balance.lessonsRemaining || 0)) : null;
  const remColor = lessonsRemaining === null ? 'var(--text-dim)'
    : lessonsRemaining === 0 ? 'var(--danger)'
    : lessonsRemaining <= 2 ? '#e8a44b'
    : 'var(--gold-2)';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
        <div className="cdm-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="avatar">{initials(student.name)}</div>
            <div>
              <h3>{student.name}</h3>
              <span className={`pill ${relPill(student.relationship)}`} style={{ marginTop: 4 }}>{student.relationship || 'Unknown'}</span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} data-testid="close-student-detail"><X size={14} /></button>
        </div>

        <div style={{ padding: 22 }}>
          {!editMode ? (
            <>
              {/* View mode */}
              <div className="grid-2col" style={{ marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Contact</div>
                  <div style={{ fontSize: 13, marginBottom: 4 }}><Phone size={12} style={{ verticalAlign: '-1px', marginRight: 6 }} />{student.phone || <span className="text-muted">No phone</span>}</div>
                  <div style={{ fontSize: 13 }}><Mail size={12} style={{ verticalAlign: '-1px', marginRight: 6 }} />{student.email || <span className="text-muted">No email</span>}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Schedule</div>
                  <div style={{ fontSize: 13, marginBottom: 4 }}><Calendar size={12} style={{ verticalAlign: '-1px', marginRight: 6 }} />Last: {fmtDate(student.lastSeen)}</div>
                  <div style={{ fontSize: 13 }}><Calendar size={12} style={{ verticalAlign: '-1px', marginRight: 6 }} />Next: {fmtDate(student.nextScheduled)}</div>
                </div>
              </div>

              <div className="divider-gold" />

              {/* Lesson balance tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                <BalanceTile label="Purchased" value={lessonsTotal} />
                <BalanceTile label="Used" value={lessonsUsed ?? '-'} dim />
                <BalanceTile label="Remaining" value={lessonsRemaining ?? '-'} color={remColor} testid="detail-remaining" />
              </div>

              <div className="grid-2col" style={{ marginBottom: 14 }}>
                <div>
                  <div className="stat-label">Lessons (6 months)</div>
                  <div className="stat-value">{student.lessons6mo || 0}</div>
                </div>
                <div>
                  <div className="stat-label">Total Paid</div>
                  <div className="stat-value" style={{ color: 'var(--success)' }}>${student.totalPaid || 0}</div>
                </div>
              </div>

              {student.notes && (
                <>
                  <div className="divider-gold" />
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Notes</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 14 }}>{student.notes}</div>
                </>
              )}

              {/* Action row */}
              <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                <button data-testid="edit-student-btn" className="btn-gold" onClick={onEdit} style={{ flex: 1 }}>
                  <Edit2 size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />Edit
                </button>
                <button data-testid="bonus-lessons-btn" className="btn-ghost" onClick={onOpenBonus} style={{ flex: 1 }}>
                  <Gift size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />Bonus Lessons
                </button>
                <button
                  data-testid="delete-student-btn"
                  className="btn-ghost"
                  onClick={onDelete}
                  style={{ borderColor: 'rgba(220,90,90,0.4)', color: 'var(--danger)' }}
                  title="Delete student"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Edit mode */}
              <div className="cdm-field">
                <label className="cdm-label">Name</label>
                <input data-testid="edit-name" className="cdm-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="cdm-field">
                <label className="cdm-label">Relationship</label>
                <select className="cdm-select" value={editForm.relationship} onChange={e => setEditForm({ ...editForm, relationship: e.target.value })}>
                  {RELATIONSHIPS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="grid-2col">
                <div className="cdm-field">
                  <label className="cdm-label">Phone</label>
                  <input className="cdm-input" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div className="cdm-field">
                  <label className="cdm-label">Email</label>
                  <input className="cdm-input" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
              </div>
              <div className="grid-2col">
                <div className="cdm-field">
                  <label className="cdm-label">Last Seen</label>
                  <input type="date" className="cdm-input" value={editForm.lastSeen} onChange={e => setEditForm({ ...editForm, lastSeen: e.target.value })} />
                </div>
                <div className="cdm-field">
                  <label className="cdm-label">Next Scheduled</label>
                  <input type="date" className="cdm-input" value={editForm.nextScheduled} onChange={e => setEditForm({ ...editForm, nextScheduled: e.target.value })} />
                </div>
              </div>
              <div className="cdm-field">
                <label className="cdm-label">Notes</label>
                <textarea className="cdm-textarea" rows={3} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
              </div>

              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12, fontStyle: 'italic' }}>
                Lessons Bought and Total Paid are managed via POS &amp; Enrollments. Use &quot;Bonus Lessons&quot; to add free lessons.
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button data-testid="save-edit-student-btn" className="btn-gold" style={{ flex: 1 }} onClick={onSaveEdit}>
                  <Save size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />Save Changes
                </button>
                <button className="btn-ghost" onClick={onCancelEdit}>Cancel</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const BalanceTile = ({ label, value, color, dim, testid }) => (
  <div style={{
    background: 'var(--bg-soft)',
    border: '1px solid var(--line)',
    borderRadius: 8,
    padding: '12px 14px',
    textAlign: 'center',
  }}>
    <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
    <div
      data-testid={testid}
      style={{
        fontFamily: 'Playfair Display, serif',
        fontSize: 24,
        color: color || (dim ? 'var(--text-dim)' : 'var(--text)'),
        lineHeight: 1,
      }}
    >
      {value}
    </div>
  </div>
);

const BonusLessonsModal = ({ studentName, value, setValue, note, setNote, onClose, onConfirm }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
      <div className="cdm-card-header">
        <h3><Gift size={16} style={{ verticalAlign: '-2px', marginRight: 8, color: 'var(--gold)' }} />Add Bonus Lessons</h3>
        <button className="btn-icon" onClick={onClose}><X size={14} /></button>
      </div>
      <div style={{ padding: 22 }}>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
          Add free lessons to <b style={{ color: 'var(--text)' }}>{studentName}</b>. This adds to their balance without affecting Total Paid, and is logged as a Bonus payment for audit.
        </p>
        <div className="cdm-field">
          <label className="cdm-label">Number of Lessons</label>
          <input
            data-testid="bonus-lessons-input"
            className="cdm-input"
            type="number"
            min="1"
            step="1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 1"
            autoFocus
          />
        </div>
        <div className="cdm-field">
          <label className="cdm-label">Reason / Note (optional)</label>
          <input
            data-testid="bonus-note-input"
            className="cdm-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Birthday gift, referral bonus..."
          />
        </div>
        <button data-testid="confirm-bonus-btn" className="btn-gold" style={{ width: '100%' }} onClick={onConfirm}>
          Add Bonus Lessons
        </button>
      </div>
    </div>
  </div>
);

export default Students;

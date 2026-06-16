import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Trash2, Printer, X, Edit2, ShoppingCart, Box, Receipt } from 'lucide-react';

const POS = () => {
  const [section, setSection] = useState('sell'); // sell | packages | history
  return (
    <div>
      <h2 className="section-title">
        Point of Sale
        <span className="sub">Sell packages - manage catalog - history</span>
      </h2>
      <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
        <SectionTab active={section === 'sell'} onClick={() => setSection('sell')} icon={<ShoppingCart size={13} />}>Sell</SectionTab>
        <SectionTab active={section === 'packages'} onClick={() => setSection('packages')} icon={<Box size={13} />}>Packages</SectionTab>
        <SectionTab active={section === 'history'} onClick={() => setSection('history')} icon={<Receipt size={13} />}>History</SectionTab>
      </div>
      {section === 'sell' && <SellSection />}
      {section === 'packages' && <PackagesSection />}
      {section === 'history' && <HistorySection />}
    </div>
  );
};

const SectionTab = ({ active, onClick, icon, children }) => (
  <button className="btn-ghost" onClick={onClick}
    style={active ? { borderColor: 'var(--gold)', color: 'var(--gold-2)' } : {}}>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{icon}{children}</span>
  </button>
);

/* ---------------- Sell Section ---------------- */
const SellSection = () => {
  const { students, packages, recordPayment } = useData();
  const [studentId, setStudentId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [method, setMethod] = useState('Cash');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [receipt, setReceipt] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');

  const activePackages = useMemo(() => packages.filter(p => p.active), [packages]);
  const selectedStudent = useMemo(() => students.find(s => s.id === studentId), [students, studentId]);
  const selectedPackage = useMemo(() => packages.find(p => p.id === packageId), [packages, packageId]);

  const suggestedAmount = selectedPackage?.price ?? 0;
  const filteredStudents = useMemo(() => {
    if (!studentSearch) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(s => (s.name || '').toLowerCase().includes(q));
  }, [students, studentSearch]);

  const handleSell = async () => {
    if (!studentId || !packageId) return;
    const payment = {
      studentId,
      studentName: selectedStudent?.name || '',
      packageId,
      packageName: selectedPackage?.name || '',
      lessons: selectedPackage?.lessons || 0,
      amount: Number(amount || suggestedAmount),
      method,
      notes,
      date,
    };
    try {
      const saved = await recordPayment(payment);
      setReceipt({ ...payment, ...saved, _student: selectedStudent, _package: selectedPackage });
      // Reset form
      setAmount(''); setNotes('');
    } catch (e) {
      console.error('Failed to record payment:', e);
      // toast handled in context
    }
  };

  if (activePackages.length === 0) {
    return (
      <div className="cdm-card" style={{ textAlign: 'center', padding: 40 }}>
        <Box size={32} color="var(--gold-dim)" style={{ margin: '0 auto 16px', display: 'block' }} />
        <h3 style={{ marginBottom: 8 }}>No packages yet</h3>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 18 }}>
          Create packages first so you can sell them. Switch to the Packages tab.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid-2col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="cdm-card">
            <h3 style={{ fontSize: 16, marginBottom: 14 }}>1. Choose Student</h3>
            <div className="cdm-field">
              <input
                className="cdm-input"
                placeholder="Search students..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>
            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 6 }}>
              {filteredStudents.map(s => (
                <div
                  key={s.id}
                  onClick={() => setStudentId(s.id)}
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid rgba(42,42,50,0.4)',
                    cursor: 'pointer',
                    background: studentId === s.id ? 'rgba(200,165,91,0.08)' : 'transparent',
                    borderLeft: studentId === s.id ? '2px solid var(--gold)' : '2px solid transparent',
                  }}
                >
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                    {s.relationship} - Lessons: {s.lessonsTotal || 0} - Paid: ${s.totalPaid || 0}
                  </div>
                </div>
              ))}
              {filteredStudents.length === 0 && (
                <div style={{ padding: 14, color: 'var(--text-dim)', textAlign: 'center', fontSize: 12 }}>No match</div>
              )}
            </div>
          </div>

          <div className="cdm-card">
            <h3 style={{ fontSize: 16, marginBottom: 14 }}>2. Choose Package</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activePackages.map(p => (
                <div
                  key={p.id}
                  onClick={() => { setPackageId(p.id); setAmount(String(p.price)); }}
                  style={{
                    padding: 14,
                    border: packageId === p.id ? '1px solid var(--gold)' : '1px solid var(--line)',
                    background: packageId === p.id ? 'rgba(200,165,91,0.06)' : 'var(--bg-soft)',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: 'var(--text)', fontSize: 14 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                        {p.lessons} lessons - ${(p.price / Math.max(1, p.lessons)).toFixed(0)}/lesson
                      </div>
                    </div>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: 'var(--gold-2)' }}>
                      ${p.price}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="cdm-card">
            <h3 style={{ fontSize: 16, marginBottom: 14 }}>3. Payment</h3>
            <div className="cdm-field">
              <label className="cdm-label">Date</label>
              <input type="date" className="cdm-input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="cdm-field">
              <label className="cdm-label">Method</label>
              <select className="cdm-select" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option>Cash</option><option>Zelle</option><option>Venmo</option><option>Check</option>
              </select>
            </div>
            <div className="cdm-field">
              <label className="cdm-label">Amount Received ($)</label>
              <input type="number" className="cdm-input" value={amount}
                onChange={(e) => setAmount(e.target.value)} placeholder={`Suggested: $${suggestedAmount}`} />
              {selectedPackage && Number(amount || 0) !== suggestedAmount && Number(amount || 0) > 0 && (
                <div style={{ fontSize: 11, color: Number(amount) < suggestedAmount ? 'var(--danger)' : 'var(--success)', marginTop: 4 }}>
                  {Number(amount) < suggestedAmount
                    ? `Partial payment - $${suggestedAmount - Number(amount)} remaining`
                    : `Overpayment of $${Number(amount) - suggestedAmount}`}
                </div>
              )}
            </div>
            <div className="cdm-field">
              <label className="cdm-label">Notes (optional)</label>
              <textarea className="cdm-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="cdm-card">
            <h3 style={{ fontSize: 16, marginBottom: 14 }}>Summary</h3>
            {!selectedStudent && <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Choose a student</div>}
            {selectedStudent && !selectedPackage && <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Choose a package</div>}
            {selectedStudent && selectedPackage && (
              <>
                <div className="summary-row"><span>Student</span><span>{selectedStudent.name}</span></div>
                <div className="summary-row"><span>Package</span><span>{selectedPackage.name}</span></div>
                <div className="summary-row"><span>Lessons added</span><span className="text-gold">+{selectedPackage.lessons}</span></div>
                <div className="summary-row"><span>Method</span><span>{method}</span></div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span>${Number(amount || suggestedAmount)}</span>
                </div>
                <button className="btn-gold" style={{ width: '100%', marginTop: 16, padding: 13 }} onClick={handleSell}>
                  Complete Sale
                </button>
                <div style={{ marginTop: 14, fontSize: 11, color: 'var(--muted)', textAlign: 'center', letterSpacing: '0.05em' }}>
                  Zelle: cdmdanceservices@gmail.com - Venmo: @Carlos-Mateu-1
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </>
  );
};

/* ---------------- Packages Section ---------------- */
const PackagesSection = () => {
  const { packages, addPackage, updatePackage, deletePackage } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', lessons: 4, price: 0, description: '', active: true });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', lessons: 4, price: 0, description: '', active: true });
    setShowForm(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, lessons: p.lessons, price: p.price, description: p.description || '', active: p.active });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.lessons || !form.price) return;
    if (editing) {
      await updatePackage(editing.id, form);
    } else {
      await addPackage(form);
    }
    setShowForm(false);
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          Define the packages you sell. Only &quot;Active&quot; packages appear in the Sell tab.
        </p>
        <button className="btn-gold" onClick={openCreate}>
          <Plus size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />New Package
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {packages.length === 0 && (
          <div className="cdm-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 32 }}>
            <Box size={28} color="var(--gold-dim)" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ color: 'var(--text-dim)' }}>No packages yet. Click &quot;New Package&quot; to create your first one.</p>
          </div>
        )}
        {packages.map(p => (
          <div key={p.id} className="cdm-card" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <h3 style={{ fontSize: 17, marginBottom: 4 }}>{p.name}</h3>
                <span className={`pill ${p.active ? 'pill-green' : 'pill-dim'}`}>{p.active ? 'Active' : 'Inactive'}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-icon" onClick={() => openEdit(p)} title="Edit"><Edit2 size={12} /></button>
                <button className="btn-icon" onClick={() => { if (window.confirm('Delete this package?')) deletePackage(p.id); }} title="Delete"><Trash2 size={12} /></button>
              </div>
            </div>
            <div style={{ marginTop: 14, marginBottom: 12 }}>
              <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, color: 'var(--gold-2)' }}>${p.price}</span>
              <span style={{ color: 'var(--text-dim)', marginLeft: 8, fontSize: 12 }}>
                / {p.lessons} lessons (${(p.price / Math.max(1, p.lessons)).toFixed(0)}/lesson)
              </span>
            </div>
            {p.description && <p style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>{p.description}</p>}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="cdm-card-header">
              <h3>{editing ? 'Edit Package' : 'New Package'}</h3>
              <button className="btn-icon" onClick={() => setShowForm(false)}><X size={14} /></button>
            </div>
            <div style={{ padding: 22 }}>
              <div className="cdm-field">
                <label className="cdm-label">Name</label>
                <input className="cdm-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. 4 Lessons Package" />
              </div>
              <div className="grid-2col">
                <div className="cdm-field">
                  <label className="cdm-label"># of Lessons</label>
                  <input type="number" className="cdm-input" value={form.lessons} onChange={e => setForm({ ...form, lessons: Number(e.target.value) })} />
                </div>
                <div className="cdm-field">
                  <label className="cdm-label">Price ($)</label>
                  <input type="number" className="cdm-input" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
                </div>
              </div>
              <div className="cdm-field">
                <label className="cdm-label">Description (optional)</label>
                <textarea className="cdm-textarea" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="cdm-field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="pkg-active" checked={!!form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
                <label htmlFor="pkg-active" style={{ fontSize: 13, cursor: 'pointer' }}>Active (available for sale)</label>
              </div>
              <button className="btn-gold" style={{ width: '100%' }} onClick={handleSave}>
                {editing ? 'Save Changes' : 'Create Package'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ---------------- History Section ---------------- */
const HistorySection = () => {
  const { payments, deletePayment } = useData();
  const sorted = useMemo(() => [...payments].sort((a, b) => (b.date || '').localeCompare(a.date || '')), [payments]);

  const total = sorted.reduce((s, p) => s + p.amount, 0);
  const fmt = (n) => `$${Number(n).toLocaleString()}`;
  const fmtDate = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

  return (
    <div className="cdm-card" style={{ padding: 0 }}>
      <div className="cdm-card-header">
        <h3>Payment History ({sorted.length})</h3>
        <div className="text-gold" style={{ fontFamily: 'Playfair Display, serif', fontSize: 18 }}>Total: {fmt(total)}</div>
      </div>
      <table className="cdm-table">
        <thead>
          <tr>
            <th>Date</th><th>Student</th><th>Package</th><th>Lessons</th><th>Method</th>
            <th style={{ textAlign: 'right' }}>Amount</th><th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 22 }}>No payments yet</td></tr>
          )}
          {sorted.map(p => (
            <tr key={p.id}>
              <td>{fmtDate(p.date)}</td>
              <td style={{ color: 'var(--text)' }}>{p.studentName}</td>
              <td className="text-dim">{p.packageName || '-'}</td>
              <td>{p.lessons || 0}</td>
              <td><span className="pill pill-dim">{p.method}</span></td>
              <td className="text-gold" style={{ textAlign: 'right' }}>{fmt(p.amount)}</td>
              <td>
                <button className="btn-icon" onClick={() => { if (window.confirm('Delete this payment? Student totals will be reversed.')) deletePayment(p.id); }}>
                  <Trash2 size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ---------------- Receipt Modal ---------------- */
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const ReceiptModal = ({ receipt, onClose }) => {
  const print = () => {
    const w = window.open('', '_blank', 'width=500,height=700');
    if (!w) return;
    const html = `
      <html><head><title>Receipt</title>
      <style>
        body { font-family: Georgia, serif; padding: 40px; max-width: 380px; margin: auto; color: #222; }
        h1 { text-align: center; font-style: italic; letter-spacing: 0.1em; margin: 0 0 8px; }
        .sub { text-align: center; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #888; margin-bottom: 22px; }
        .line { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ccc; font-size: 13px; }
        .total { border-top: 2px solid #222; border-bottom: 2px solid #222; padding: 10px 0; margin-top: 10px; font-weight: bold; font-size: 16px; }
        .thanks { text-align: center; margin-top: 30px; font-style: italic; color: #555; }
      </style></head><body>
      <h1>CDM Dance</h1>
      <div class="sub">Receipt</div>
      <div class="line"><span>Date</span><span>${escapeHtml(receipt.date)}</span></div>
      <div class="line"><span>Student</span><span>${escapeHtml(receipt.studentName)}</span></div>
      <div class="line"><span>Package</span><span>${escapeHtml(receipt.packageName)}</span></div>
      <div class="line"><span>Lessons</span><span>${escapeHtml(receipt.lessons)}</span></div>
      <div class="line"><span>Payment Method</span><span>${escapeHtml(receipt.method)}</span></div>
      <div class="line total"><span>Total Paid</span><span>$${escapeHtml(receipt.amount)}</span></div>
      ${receipt.notes ? `<div style="margin-top:14px;font-size:12px;font-style:italic;color:#666;">${escapeHtml(receipt.notes)}</div>` : ''}
      <div class="thanks">Thank you - CDM Dance Services<br><span style="font-size:11px">cdmdanceservices@gmail.com</span></div>
      </body></html>`;
    // Safer than document.write: replace full document via DOMParser-free innerHTML on a new window
    w.document.open();
    w.document.write('<!doctype html><html><body></body></html>');
    w.document.close();
    w.document.documentElement.innerHTML = html;
    w.focus();
    setTimeout(() => w.print(), 250);
  };

  const fmt = (n) => `$${Number(n).toLocaleString()}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="cdm-card-header">
          <h3>Sale Complete</h3>
          <button className="btn-icon" onClick={onClose}><X size={14} /></button>
        </div>
        <div style={{ padding: 26 }}>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(107,191,122,0.2), rgba(107,191,122,0.05))',
              border: '1px solid var(--success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <Receipt size={26} color="var(--success)" />
            </div>
            <h3 style={{ fontSize: 22, marginBottom: 4 }}>{fmt(receipt.amount)}</h3>
            <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>via {receipt.method}</p>
          </div>
          <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 6, padding: 16 }}>
            <div className="summary-row"><span>Date</span><span>{receipt.date}</span></div>
            <div className="summary-row"><span>Student</span><span>{receipt.studentName}</span></div>
            <div className="summary-row"><span>Package</span><span>{receipt.packageName}</span></div>
            <div className="summary-row"><span>Lessons added</span><span className="text-gold">+{receipt.lessons}</span></div>
            {receipt.notes && <div className="summary-row"><span>Notes</span><span style={{ fontStyle: 'italic' }}>{receipt.notes}</span></div>}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Close</button>
            <button className="btn-gold" style={{ flex: 1 }} onClick={print}>
              <Printer size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POS;

import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';

const POS = () => {
  const { students, packages, styles, completeSale } = useData();
  const [studentId, setStudentId] = useState(students[0]?.id || '');
  const [packageId, setPackageId] = useState(packages[0]?.id || '');
  const [style, setStyle] = useState(styles[0] || '');
  const [method, setMethod] = useState('Cash');
  const [paid, setPaid] = useState(0);
  const [notes, setNotes] = useState('');

  const selectedStudent = useMemo(() => students.find(s => s.id === studentId), [students, studentId]);
  const selectedPackage = useMemo(() => packages.find(p => p.id === packageId), [packages, packageId]);

  const remaining = (selectedPackage?.price || 0) - Number(paid || 0);

  const handleSell = () => {
    if (!studentId || !packageId) return;
    completeSale({ studentId, packageId, paid: Number(paid), method, style, notes });
    setPaid(0);
    setNotes('');
  };

  return (
    <div>
      <h2 className="section-title">
        Point of Sale
        <span className="sub">Sell Packages</span>
      </h2>

      <div className="grid-2col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="cdm-card">
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Student</h3>
            <div className="cdm-field">
              <label className="cdm-label">Select Student</label>
              <select className="cdm-select" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {selectedStudent && (
              <div style={{ background: 'var(--bg-soft)', padding: 14, borderRadius: 6, border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span className="text-dim">Level</span>
                  <span>{selectedStudent.level}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span className="text-dim">Current Balance</span>
                  <span className={selectedStudent.balance > 0 ? 'text-danger' : 'text-dim'}>${selectedStudent.balance}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span className="text-dim">Lessons Remaining</span>
                  <span className="text-gold">{selectedStudent.lessonsRemaining}</span>
                </div>
              </div>
            )}
          </div>

          <div className="cdm-card">
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Package</h3>
            <div className="cdm-field">
              <label className="cdm-label">Select Package</label>
              <select className="cdm-select" value={packageId} onChange={(e) => setPackageId(e.target.value)}>
                {packages.map(p => <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>)}
              </select>
            </div>
            <div className="cdm-field">
              <label className="cdm-label">Dance Style</label>
              <select className="cdm-select" value={style} onChange={(e) => setStyle(e.target.value)}>
                {styles.map(st => <option key={st}>{st}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="cdm-card">
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Payment</h3>
            <div className="cdm-field">
              <label className="cdm-label">Payment Method</label>
              <select className="cdm-select" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option>Cash</option><option>Zelle</option><option>Venmo</option><option>Check</option><option>Other</option>
              </select>
            </div>
            <div className="cdm-field">
              <label className="cdm-label">Amount Paid Today ($)</label>
              <input type="number" className="cdm-input" value={paid} onChange={(e) => setPaid(e.target.value)} />
            </div>
            <div className="cdm-field">
              <label className="cdm-label">Notes</label>
              <textarea className="cdm-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="cdm-card">
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Summary</h3>
            {selectedPackage && (
              <>
                <div className="summary-row"><span>{selectedPackage.name}</span><span>${selectedPackage.price}</span></div>
                <div className="summary-row"><span>{selectedPackage.lessons} lessons (${selectedPackage.perLesson}/ea)</span><span className="text-dim">incl.</span></div>
                <div className="summary-row"><span>Paid Today ({method})</span><span className="text-gold">${Number(paid || 0)}</span></div>
                <div className="summary-row total">
                  <span>Remaining Balance</span>
                  <span>${remaining}</span>
                </div>
              </>
            )}
            <button className="btn-gold" style={{ width: '100%', marginTop: 16, padding: 13 }} onClick={handleSell}>
              Complete Sale
            </button>
            <div style={{ marginTop: 14, fontSize: 11, color: 'var(--muted)', textAlign: 'center', letterSpacing: '0.05em' }}>
              Zelle: cdmdanceservices@gmail.com - Venmo: @Carlos-Mateu-1
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POS;

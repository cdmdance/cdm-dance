import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Plus, X, FileText, Trash2, Download, Search, Mail } from 'lucide-react';

const PROGRAM_TIERS = ['Bronze', 'Silver', 'Gold', 'Open'];
const EVENT_TYPES = ['Showcase', 'Competition', 'Mini Match', 'Social', 'Other'];
const PAYMENT_METHODS = ['Cash', 'Zelle', 'Venmo', 'Check'];

const fmt = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

const Enrollments = () => {
  const { enrollments, students, createEnrollment, signEnrollment, cancelEnrollment, downloadEnrollmentPDF } = useData();
  const [showForm, setShowForm] = useState(false);
  const [signingEnrollment, setSigningEnrollment] = useState(null);
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    let list = [...enrollments];
    if (filter === 'pending') list = list.filter(e => e.status === 'Pending');
    if (filter === 'signed') list = list.filter(e => e.status === 'Signed');
    if (filter === 'cancelled') list = list.filter(e => e.status === 'Cancelled');
    if (filter === 'programs') list = list.filter(e => e.type === 'Program');
    if (filter === 'events') list = list.filter(e => e.type === 'Event');
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [enrollments, filter]);

  const counts = useMemo(() => ({
    all: enrollments.length,
    pending: enrollments.filter(e => e.status === 'Pending').length,
    signed: enrollments.filter(e => e.status === 'Signed').length,
    programs: enrollments.filter(e => e.type === 'Program').length,
    events: enrollments.filter(e => e.type === 'Event').length,
  }), [enrollments]);

  const pillFor = (s) => s === 'Signed' ? 'pill-green' : s === 'Pending' ? 'pill-gold' : 'pill-red';

  return (
    <div>
      <h2 className="section-title">
        Enrollments
        <span className="sub">{filtered.length} of {enrollments.length}</span>
      </h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all', 'pending', 'signed', 'cancelled', 'programs', 'events'].map(f => (
            <button key={f} className="btn-ghost"
              style={f === filter ? { borderColor: 'var(--gold)', color: 'var(--gold-2)' } : {}}
              onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}{counts[f] !== undefined && ` (${counts[f]})`}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn-gold" onClick={() => setShowForm(true)}>
          <Plus size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />New Enrollment
        </button>
      </div>

      <div className="cdm-card" style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <FileText size={28} color="var(--gold-dim)" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ color: 'var(--text-dim)' }}>No enrollments yet. Click &quot;New Enrollment&quot; to create the first one.</p>
          </div>
        ) : (
          <table className="cdm-table">
            <thead>
              <tr>
                <th>Date</th><th>Student</th><th>Type</th><th>Details</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Paid</th>
                <th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id}>
                  <td>{fmtDate(e.date)}</td>
                  <td style={{ color: 'var(--text)' }}>{e.studentName}</td>
                  <td><span className={`pill ${e.type === 'Program' ? 'pill-gold' : 'pill-dim'}`}>{e.type}</span></td>
                  <td className="text-dim">
                    {e.type === 'Program'
                      ? `${e.programTier} - ${e.lessonsCount} lessons - ${fmt(e.pricePerLesson)}/ea`
                      : `${e.eventName} (${e.eventType})`}
                  </td>
                  <td className="text-gold" style={{ textAlign: 'right' }}>
                    {fmt(e.type === 'Program' ? e.totalValue : e.totalCost)}
                  </td>
                  <td className="text-gold" style={{ textAlign: 'right' }}>{fmt(e.amountPaid)}</td>
                  <td><span className={`pill ${pillFor(e.status)}`}>{e.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {e.status === 'Pending' && (
                        <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => setSigningEnrollment(e)}>Sign</button>
                      )}
                      <button className="btn-icon" title="Download PDF"
                        onClick={() => downloadEnrollmentPDF(e.id, e.studentName)}>
                        <Download size={12} />
                      </button>
                      {e.status !== 'Cancelled' && (
                        <button className="btn-icon" title="Cancel"
                          onClick={() => { if (window.confirm('Cancel this enrollment?')) cancelEnrollment(e.id); }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && <EnrollmentForm onClose={() => setShowForm(false)}
        students={students} onCreate={createEnrollment} />}
      {signingEnrollment && <SignDialog enrollment={signingEnrollment}
        students={students} onClose={() => setSigningEnrollment(null)}
        onSign={signEnrollment} onDownload={downloadEnrollmentPDF} />}
    </div>
  );
};

/* ---------- New Enrollment Form ---------- */
const EnrollmentForm = ({ onClose, students, onCreate }) => {
  const [tab, setTab] = useState('Program');
  const [studentId, setStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');

  // Program fields
  const [programTier, setProgramTier] = useState('Bronze');
  const [lessonsCount, setLessonsCount] = useState(4);
  const [pricePerLesson, setPricePerLesson] = useState(80);

  // Event fields
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState('Showcase');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [totalCost, setTotalCost] = useState('');

  const totalValue = Number(lessonsCount || 0) * Number(pricePerLesson || 0);

  const filteredStudents = useMemo(() => {
    if (!studentSearch) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(s => (s.name || '').toLowerCase().includes(q));
  }, [students, studentSearch]);

  const canSubmit = () => {
    if (!studentId) return false;
    if (tab === 'Program') return lessonsCount > 0 && pricePerLesson > 0;
    if (tab === 'Event') return eventName && totalCost;
    return false;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    const base = {
      type: tab, date, studentId, paymentMethod,
      amountPaid: Number(amountPaid || (tab === 'Program' ? totalValue : totalCost)),
      notes,
    };
    let payload;
    if (tab === 'Program') {
      payload = {
        ...base,
        programTier,
        lessonsCount: Number(lessonsCount),
        pricePerLesson: Number(pricePerLesson),
      };
    } else {
      payload = {
        ...base,
        eventName, eventType, eventLocation, eventDate,
        totalCost: Number(totalCost),
      };
    }
    await onCreate(payload);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
        <div className="cdm-card-header">
          <h3>New Enrollment</h3>
          <button className="btn-icon" onClick={onClose}><X size={14} /></button>
        </div>
        <div style={{ padding: 22 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            <button className="btn-ghost"
              style={tab === 'Program' ? { borderColor: 'var(--gold)', color: 'var(--gold-2)' } : {}}
              onClick={() => setTab('Program')}>Program</button>
            <button className="btn-ghost"
              style={tab === 'Event' ? { borderColor: 'var(--gold)', color: 'var(--gold-2)' } : {}}
              onClick={() => setTab('Event')}>Event</button>
          </div>

          <div className="cdm-field">
            <label className="cdm-label">Student</label>
            <input className="cdm-input" placeholder="Search student..."
              value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 6, marginTop: 8 }}>
              {filteredStudents.map(s => (
                <div key={s.id} onClick={() => setStudentId(s.id)}
                  style={{ padding: '8px 12px', borderBottom: '1px solid rgba(42,42,50,0.4)',
                    cursor: 'pointer',
                    background: studentId === s.id ? 'rgba(200,165,91,0.08)' : 'transparent',
                    borderLeft: studentId === s.id ? '2px solid var(--gold)' : '2px solid transparent' }}>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    {s.email || 'no email'} - {s.relationship}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid-2col">
            <div className="cdm-field">
              <label className="cdm-label">Enrollment Date</label>
              <input type="date" className="cdm-input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="cdm-field">
              <label className="cdm-label">Payment Method</label>
              <select className="cdm-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {tab === 'Program' && (
            <>
              <div className="grid-2col">
                <div className="cdm-field">
                  <label className="cdm-label">Program Tier</label>
                  <select className="cdm-select" value={programTier} onChange={e => setProgramTier(e.target.value)}>
                    {PROGRAM_TIERS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="cdm-field">
                  <label className="cdm-label">Number of Lessons</label>
                  <input type="number" className="cdm-input" value={lessonsCount}
                    onChange={e => setLessonsCount(Number(e.target.value))} />
                </div>
              </div>
              <div className="grid-2col">
                <div className="cdm-field">
                  <label className="cdm-label">Price per Lesson ($)</label>
                  <input type="number" className="cdm-input" value={pricePerLesson}
                    onChange={e => setPricePerLesson(Number(e.target.value))} />
                </div>
                <div className="cdm-field">
                  <label className="cdm-label">Total Value</label>
                  <div style={{ padding: '10px 12px', background: 'var(--bg-soft)', border: '1px solid var(--line)',
                    borderRadius: 6, fontFamily: 'Playfair Display, serif', fontSize: 18, color: 'var(--gold-2)' }}>
                    {fmt(totalValue)}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', marginTop: -6 }}>
                Lessons hold their monetary value for 1 year from purchase date. Private lessons only. Non-transferable.
              </p>
            </>
          )}

          {tab === 'Event' && (
            <>
              <div className="grid-2col">
                <div className="cdm-field">
                  <label className="cdm-label">Event Name</label>
                  <input className="cdm-input" value={eventName}
                    onChange={e => setEventName(e.target.value)} placeholder="e.g. Summer Showcase 2026" />
                </div>
                <div className="cdm-field">
                  <label className="cdm-label">Event Type</label>
                  <select className="cdm-select" value={eventType} onChange={e => setEventType(e.target.value)}>
                    {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid-2col">
                <div className="cdm-field">
                  <label className="cdm-label">Event Date</label>
                  <input type="date" className="cdm-input" value={eventDate}
                    onChange={e => setEventDate(e.target.value)} />
                </div>
                <div className="cdm-field">
                  <label className="cdm-label">Location</label>
                  <input className="cdm-input" value={eventLocation}
                    onChange={e => setEventLocation(e.target.value)} placeholder="Venue or city" />
                </div>
              </div>
              <div className="cdm-field">
                <label className="cdm-label">Total Cost ($)</label>
                <input type="number" className="cdm-input" value={totalCost}
                  onChange={e => setTotalCost(e.target.value)} placeholder="0" />
              </div>
            </>
          )}

          <div className="cdm-field">
            <label className="cdm-label">Amount Paid Now ($) <span style={{ color: 'var(--muted)', textTransform: 'none', letterSpacing: 0 }}>(blank = full payment)</span></label>
            <input type="number" className="cdm-input" value={amountPaid}
              onChange={e => setAmountPaid(e.target.value)}
              placeholder={`Default: $${tab === 'Program' ? totalValue : (totalCost || 0)}`} />
          </div>

          <div className="cdm-field">
            <label className="cdm-label">Notes / Breakdown (optional)</label>
            <textarea className="cdm-textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <button className="btn-gold" style={{ width: '100%' }} onClick={handleSubmit} disabled={!canSubmit()}>
            Create Enrollment (Pending Signature)
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- Sign Dialog ---------- */
const SignDialog = ({ enrollment, students, onClose, onSign, onDownload }) => {
  const [signedBy, setSignedBy] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [step, setStep] = useState('review'); // review | sign
  const [submitting, setSubmitting] = useState(false);

  const student = students.find(s => s.id === enrollment.studentId);
  const hasEmail = !!student?.email;

  const canSign = agreed && signedBy.trim().length >= 2;

  const handleSign = async () => {
    if (!canSign) return;
    setSubmitting(true);
    try {
      await onSign(enrollment.id, signedBy.trim(), sendEmail);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, maxHeight: '92vh' }}>
        <div className="cdm-card-header">
          <h3>{step === 'review' ? 'Review & Sign Enrollment' : 'Sign Document'}</h3>
          <button className="btn-icon" onClick={onClose}><X size={14} /></button>
        </div>
        <div style={{ padding: 22, overflowY: 'auto', maxHeight: 'calc(92vh - 70px)' }}>
          <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 6, padding: 14, marginBottom: 18 }}>
            <div className="summary-row"><span>Student</span><span>{enrollment.studentName}</span></div>
            <div className="summary-row"><span>Type</span><span>{enrollment.type}</span></div>
            {enrollment.type === 'Program' ? (
              <>
                <div className="summary-row"><span>Tier</span><span>{enrollment.programTier}</span></div>
                <div className="summary-row"><span>Lessons</span><span>{enrollment.lessonsCount}</span></div>
                <div className="summary-row"><span>Price/lesson</span><span>{fmt(enrollment.pricePerLesson)}</span></div>
                <div className="summary-row"><span>Total Value</span><span className="text-gold">{fmt(enrollment.totalValue)}</span></div>
                <div className="summary-row"><span>Expires</span><span>{fmtDate(enrollment.expirationDate)}</span></div>
              </>
            ) : (
              <>
                <div className="summary-row"><span>Event</span><span>{enrollment.eventName}</span></div>
                <div className="summary-row"><span>Type</span><span>{enrollment.eventType}</span></div>
                <div className="summary-row"><span>Date</span><span>{fmtDate(enrollment.eventDate)}</span></div>
                <div className="summary-row"><span>Location</span><span>{enrollment.eventLocation || '-'}</span></div>
                <div className="summary-row"><span>Total Cost</span><span className="text-gold">{fmt(enrollment.totalCost)}</span></div>
              </>
            )}
            <div className="summary-row"><span>Amount Paid</span><span className="text-gold">{fmt(enrollment.amountPaid)}</span></div>
            <div className="summary-row"><span>Method</span><span>{enrollment.paymentMethod}</span></div>
          </div>

          <PolicySection title="Refund Policy" body={REFUND_POLICY_TEXT} />
          <PolicySection title="Liability Release & Waiver" body={LIABILITY_TEXT} />

          <div style={{ background: 'rgba(200,165,91,0.05)', border: '1px solid var(--gold-dim)', borderRadius: 6, padding: 16, marginTop: 14 }}>
            <h4 style={{ fontSize: 14, marginBottom: 12, color: 'var(--gold-2)' }}>Sign to Agree</h4>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
              <input type="checkbox" id="agree" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                style={{ marginTop: 3, accentColor: '#c8a55b' }} />
              <label htmlFor="agree" style={{ fontSize: 12, color: 'var(--text-dim)', cursor: 'pointer', lineHeight: 1.5 }}>
                I have read and agree to the Refund Policy and Liability Release & Waiver above. I am signing voluntarily and acknowledge that this typed signature is legally binding.
              </label>
            </div>

            <div className="cdm-field" style={{ marginBottom: 10 }}>
              <label className="cdm-label">Type your full legal name</label>
              <input className="cdm-input" value={signedBy}
                onChange={(e) => setSignedBy(e.target.value)}
                placeholder="e.g. John Smith"
                style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontStyle: 'italic' }} />
            </div>

            {hasEmail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <input type="checkbox" id="sendEmail" checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  style={{ accentColor: '#c8a55b' }} />
                <label htmlFor="sendEmail" style={{ fontSize: 12, color: 'var(--text-dim)', cursor: 'pointer' }}>
                  <Mail size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />
                  Email PDF receipt to <b>{student?.email}</b>
                </label>
              </div>
            )}
            {!hasEmail && (
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14 }}>
                No email on file for this student - you&apos;ll be able to download the PDF after signing.
              </p>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button className="btn-gold" style={{ flex: 2 }} onClick={handleSign}
                disabled={!canSign || submitting}>
                {submitting ? 'Signing...' : 'Sign & Complete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PolicySection = ({ title, body }) => (
  <div style={{ marginBottom: 14 }}>
    <h4 style={{ fontSize: 14, marginBottom: 8, color: 'var(--text)' }}>{title}</h4>
    <div style={{
      background: 'var(--bg-soft)',
      border: '1px solid var(--line)',
      borderRadius: 6,
      padding: 14,
      fontSize: 12,
      color: 'var(--text-dim)',
      lineHeight: 1.6,
      maxHeight: 200,
      overflowY: 'auto',
      whiteSpace: 'pre-line',
    }}>
      {body}
    </div>
  </div>
);

// Policy text - matches the PDF generator on the backend
const REFUND_POLICY_TEXT = `Lesson Packages
All lesson packages are non-refundable once purchased. Unused lessons hold their monetary value for one (1) year from the date of purchase, after which they expire with no cash value. Lesson packages are non-transferable and may only be used by the enrolled student.

Event Enrollments
Event fees (showcases, competitions, mini matches, and other events) are non-refundable once paid. If a student is unable to attend a registered event, fees may be applied as a credit toward a future event at the instructor's discretion, provided written notice is given at least 14 days before the event date.

Medical & Emergency Exceptions
In the case of a documented medical condition or family emergency that prevents a student from continuing lessons, unused lesson value may be frozen and held for up to six (6) months upon submission of supporting documentation.

No-Shows & Cancellations
Lessons cancelled with less than 24 hours' notice are forfeited. Lessons cancelled with 24 hours' notice or more will be rescheduled at the instructor's availability.

Changes to Packages
CDM Dance Services LLC reserves the right to adjust pricing for future packages. Purchased packages are honored at the rate agreed upon at time of purchase.`;

const LIABILITY_TEXT = `I, the undersigned, hereby acknowledge and agree to the following terms as a condition of participating in dance lessons, events, and activities offered by CDM Dance Services LLC.

Assumption of Risk
I understand that dance instruction and related physical activities involve inherent risks, including but not limited to muscle strains, sprains, falls, and other physical injuries. I voluntarily assume all such risks associated with my participation in any program or event offered by CDM Dance Services LLC.

Release of Liability
I hereby release, waive, and discharge CDM Dance Services LLC, its instructors, staff, agents, and representatives from any and all claims, demands, losses, or liability arising out of or related to any injury, accident, illness, or damage I may sustain during participation in any lesson, event, or activity, whether caused by negligence or otherwise.

Medical Disclosure
I confirm that I am in adequate physical health to participate in dance activities. I agree to inform CDM Dance Services LLC of any medical conditions, physical limitations, or injuries that may affect my participation prior to beginning lessons or attending events.

Photo & Video Consent
I grant CDM Dance Services LLC permission to photograph and/or record video of me during lessons, events, and performances for use in promotional materials, social media, and studio documentation, unless I provide written notice otherwise.

Acknowledgment
I have read and fully understand this Liability Release and Waiver. I agree that this release is binding upon me, my heirs, assigns, and legal representatives. I am signing this agreement voluntarily and of my own free will.`;

export default Enrollments;

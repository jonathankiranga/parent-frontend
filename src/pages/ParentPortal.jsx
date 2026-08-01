import React, { useState, useEffect } from 'react';
import OTPInput from '../components/OTPInput.jsx';
import MarketplaceBanner from '../components/MarketplaceBanner.jsx';
import api, { requestParentOtp, verifyParentOtp, getParentDashboard, getParentSchools, getAcademicReport, getFeeStatement, getPremiumStatus } from '../utils/api.js';

export default function ParentPortal() {
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('phone'); // phone → otp → schools → dashboard
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [mySchools, setMySchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [schoolId, setSchoolId] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [renewalRequired, setRenewalRequired] = useState(false);
  const [premiumExpires, setPremiumExpires] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [checkoutRequestId, setCheckoutRequestId] = useState(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderMsg, setReminderMsg] = useState('');
  const [exporting, setExporting] = useState(false);
  const [premiumPrice, setPremiumPrice] = useState(100);
  const [premiumTotal, setPremiumTotal] = useState(100);
  const [premiumCount, setPremiumCount] = useState(1);
  const [renewalPhone, setRenewalPhone] = useState('');

  function deriveCurrentTerm() {
    const m = new Date().getMonth() + 1;
    if (m <= 4) return 'Term 1';
    if (m <= 8) return 'Term 2';
    return 'Term 3';
  }
  const [selectedTerm, setSelectedTerm] = useState(deriveCurrentTerm);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // ── Restore session on refresh ───────────────────────────────
  useEffect(() => {
    const savedPhone = sessionStorage.getItem('parent_phone');
    const savedSchool = sessionStorage.getItem('parent_school_id');
    if (!savedPhone) return;
    setPhone(savedPhone);
    if (savedSchool) {
      setSelectedSchoolId(savedSchool);
      loadDashboard(savedPhone, savedSchool);
    } else {
      getParentSchools(savedPhone).then(data => {
        const schools = data.schools || [];
        if (schools.length === 1) {
          const sId = schools[0].school_id;
          setSelectedSchoolId(sId);
          sessionStorage.setItem('parent_school_id', sId);
          loadDashboard(savedPhone, sId);
        } else if (schools.length > 1) {
          setMySchools(schools);
          setStep('schools');
        } else {
          sessionStorage.removeItem('parent_phone');
        }
      }).catch(() => sessionStorage.removeItem('parent_phone'));
    }
  }, []);

  async function loadDashboard(p, sId) {
    try {
      const data = await getParentDashboard(p, sId);
      setDashboard(data.children || []);
      setSchoolId(data.school_id);
      setIsPremium(Boolean(data.premium_active));
      setRenewalRequired(Boolean(data.renewal_required));
      setPremiumExpires(data.parent?.premium_expires_at || null);
      setPremiumPrice(data.premium_price || 100);
      setPremiumTotal(data.premium_total || 100);
      setPremiumCount(data.premium_children_count || (data.children?.length || 1));
      setRenewalPhone(p);
      setStep('dashboard');
    } catch {
      sessionStorage.removeItem('parent_phone');
      sessionStorage.removeItem('parent_school_id');
      setStep('phone');
    }
  }

  async function handleRequestOtp(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const status = await getPremiumStatus(phone);
      setPremiumPrice(status.premium_price || 100);
      setPremiumTotal(status.premium_total || 100);
      setPremiumCount(status.premium_children_count || 1);
      setRenewalPhone(phone);
      if (status.registered === false) {
        setError('This phone is not registered. Please contact your school to be linked.');
        setLoading(false);
        return;
      }
      const data = await requestParentOtp(phone);
      setSessionId(data.session_id);
      if (status.renewal_required) setRenewalRequired(true);
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    }
    setLoading(false);
  }

  async function handleVerify(code) {
    setLoading(true);
    setError('');
    try {
      await verifyParentOtp(sessionId, code);
      sessionStorage.setItem('parent_phone', phone);
      const schoolData = await getParentSchools(phone);
      const schools = schoolData.schools || [];
      if (schools.length === 0) {
        setError('No children linked to this account. Contact your school.');
        setLoading(false);
        return;
      }
      if (schools.length === 1) {
        const sId = schools[0].school_id;
        setSelectedSchoolId(sId);
        sessionStorage.setItem('parent_school_id', sId);
        await loadDashboard(phone, sId);
      } else {
        setMySchools(schools);
        setStep('schools');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code');
    }
    setLoading(false);
  }

  async function handleSelectSchool(sId) {
    setSelectedSchoolId(sId);
    sessionStorage.setItem('parent_school_id', sId);
    setLoading(true);
    await loadDashboard(phone, sId);
    setLoading(false);
  }

  async function handleFeeReminder() {
    setSendingReminder(true); setReminderMsg('');
    try {
      const r = await api.post('/api/parents/fee-reminder', { phone });
      setReminderMsg(r.data.sent > 0 ? 'Fee details sent to your WhatsApp' : 'No fees found');
    } catch (err) { setReminderMsg(err.response?.data?.error || 'Failed'); }
    setSendingReminder(false);
  }

  useEffect(() => {
    if (!checkoutRequestId) return;
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts++;
      try {
        const r = await api.get('/api/parents/payment-status', { params: { checkout_request_id: checkoutRequestId, phone } });
        if (r.data.status === 'completed') {
          clearInterval(timer); setCheckoutRequestId(null);
          setIsPremium(true); setRenewalRequired(false); setUpgrading(false);
          setUpgradeMsg('✓ Payment confirmed — premium activated!');
          getParentDashboard(phone, selectedSchoolId).then(d => { setDashboard(d.children || []); setPremiumExpires(d.parent?.premium_expires_at || null); }).catch(() => {});
        } else if (r.data.status === 'failed') {
          clearInterval(timer); setCheckoutRequestId(null); setUpgrading(false);
          setUpgradeMsg('Payment cancelled or failed. Try again.');
        }
      } catch { /* ignore */ }
      if (attempts >= 24) { clearInterval(timer); setCheckoutRequestId(null); setUpgrading(false); setUpgradeMsg('Payment timed out. If you paid, it will activate shortly.'); }
    }, 5000);
    return () => clearInterval(timer);
  }, [checkoutRequestId, phone, selectedSchoolId]);

  async function handleUpgrade() {
    setUpgrading(true); setUpgradeMsg('');
    try {
      const r = await api.post('/api/parents/upgrade', { phone: (renewalPhone || phone).trim() });
      if (r.data.status === 'confirmed') {
        setIsPremium(true); setRenewalRequired(false);
        const exp = new Date(); exp.setMonth(exp.getMonth() + 4);
        setPremiumExpires(exp.toISOString()); setUpgradeMsg('✓ Premium activated'); setUpgrading(false);
      } else if (r.data.status === 'school_paid') {
        setIsPremium(true); setRenewalRequired(false); setUpgradeMsg(r.data.message); setUpgrading(false);
      } else if (r.data.status === 'pending') {
        setUpgradeMsg('STK push sent — enter your M-Pesa PIN...'); setCheckoutRequestId(r.data.checkout_request_id);
      }
    } catch (err) { setUpgradeMsg(err.response?.data?.error || 'Upgrade failed'); setUpgrading(false); }
  }

  async function handleDownloadAcademic(child) {
    setExporting(true);
    try {
      const report = await getAcademicReport(child.student_id, selectedTerm, selectedYear);
      const module = await import('../utils/pdfExport.js');
      await module.downloadAcademicPdf(report, child.full_name, phone, selectedTerm);
    } catch (err) { setReminderMsg(err.response?.data?.error || 'Failed to generate report'); }
    setExporting(false);
  }

  async function handleDownloadFees(child) {
    setExporting(true);
    try {
      const statement = await getFeeStatement(child.student_id, selectedTerm, selectedYear.toString());
      const module = await import('../utils/pdfExport.js');
      await module.downloadFeePdf(statement, child.full_name, phone, selectedTerm, selectedYear.toString());
    } catch (err) { setReminderMsg(err.response?.data?.error || 'Failed to generate fee statement'); }
    setExporting(false);
  }

  function handleLogout() {
    sessionStorage.removeItem('parent_phone');
    sessionStorage.removeItem('parent_school_id');
    setStep('phone'); setPhone(''); setDashboard(null); setMySchools([]); setSelectedSchoolId(null);
  }

  // ── SCHOOL PICKER ────────────────────────────────────────────
  if (step === 'schools') {
    return (
      <div style={{ minHeight: '100vh', backgroundImage: 'url(https://images.unsplash.com/photo-1523050854058-8df90110c7f1?w=800&q=80)', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400 }}>
          <div className="text-center mb-5">
            <h1 className="text-xl font-bold text-white">Select School</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Your children are in {mySchools.length} schools</p>
          </div>
          <div className="space-y-3">
            {mySchools.map(s => (
              <button key={s.school_id} onClick={() => handleSelectSchool(s.school_id)} disabled={loading}
                className="w-full bg-white rounded-card p-4 text-left shadow-xl" style={{ cursor: 'pointer' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm" style={{ color: '#333' }}>{s.school_name}</p>
                    {s.region && <p className="text-xs mt-0.5" style={{ color: '#888' }}>{s.region}</p>}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: '#F3E5F5', color: '#7B4F9B' }}>
                    {s.children_count} child{s.children_count === 1 ? '' : 'ren'}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <button onClick={handleLogout} className="w-full mt-4 text-center text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>← Use a different number</button>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ────────────────────────────────────────────────
  if (step === 'dashboard') {
    const currentSchool = mySchools.find(s => s.school_id === selectedSchoolId);
    return (
      <div style={{ backgroundColor: '#F8F8F8', minHeight: '100vh' }}>
        {exporting && (
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000 }}>
            <div style={{ background: '#fff', padding: 16, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12, minWidth: 280 }}>
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#7B4F9B', borderTopColor: 'transparent' }} />
              <div><div style={{ fontWeight: 700 }}>Preparing PDF…</div><div style={{ fontSize: 12, color: '#666' }}>First load may take a few seconds</div></div>
            </div>
          </div>
        )}
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#333' }}>My Children</h1>
              <p className="text-xs mt-0.5" style={{ color: '#888' }}>{phone}</p>
            </div>
            <div className="flex items-center gap-2">
              {mySchools.length > 1 && (
                <button onClick={() => setStep('schools')} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ backgroundColor: 'rgba(123,79,155,0.08)', color: '#7B4F9B' }}>
                  Switch School
                </button>
              )}
              <button onClick={handleLogout} className="btn-secondary text-xs">Logout</button>
            </div>
          </div>

          {currentSchool && (
            <div className="mb-4 px-3 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: '#F3E5F5', color: '#7B4F9B' }}>
              🏫 {currentSchool.school_name}{currentSchool.region && <span style={{ color: '#aaa', fontWeight: 400 }}> · {currentSchool.region}</span>}
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Term</label>
              <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} className="input-field text-sm">
                <option>Term 1</option><option>Term 2</option><option>Term 3</option>
              </select>
            </div>
            <div style={{ width: 100 }}>
              <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Year</label>
              <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="input-field text-sm">
                {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {!isPremium ? (
            <div className="card p-4 mb-4" style={{ borderLeft: '4px solid #FFB300' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#333' }}>Renew Premium for This Term</p>
                  <p className="text-xs mt-0.5" style={{ color: '#888' }}>KSh {premiumTotal} for {premiumCount} child{premiumCount === 1 ? '' : 'ren'}</p>
                </div>
                <button onClick={handleUpgrade} disabled={upgrading} className="btn-primary text-sm" style={{ padding: '8px 16px', fontSize: 13 }}>
                  {upgrading ? 'Processing...' : `Pay KSh ${premiumTotal}`}
                </button>
              </div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#555' }}>M-Pesa number</label>
              <input type="tel" value={renewalPhone} onChange={e => setRenewalPhone(e.target.value)} className="input-field mb-3" placeholder="2547XXXXXXXX" />
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['Daily absence alerts','3+ day warnings','Assessment results','Fee reminders','School broadcasts','All children covered'].map(f => (
                  <div key={f} className="flex items-center gap-1.5" style={{ color: '#555' }}><span style={{ color: '#10B981' }}>✓</span> {f}</div>
                ))}
              </div>
              {upgradeMsg && <p className="text-xs mt-2" style={{ color: upgradeMsg.includes('fail') ? '#C62828' : '#2E7D32' }}>{upgradeMsg}</p>}
            </div>
          ) : (
            <div className="card p-4 mb-4" style={{ borderLeft: '4px solid #10B981' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 18 }}>✓</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#2E7D32' }}>Premium Active</p>
                    {premiumExpires && <p className="text-xs" style={{ color: '#888' }}>Expires {new Date(premiumExpires).toLocaleDateString()}</p>}
                  </div>
                </div>
                <button onClick={handleFeeReminder} disabled={sendingReminder} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ backgroundColor: 'rgba(123,79,155,0.08)', color: '#7B4F9B' }}>
                  {sendingReminder ? '...' : 'Fee Reminder'}
                </button>
              </div>
              {reminderMsg && <p className="text-xs mt-1" style={{ color: '#2E7D32' }}>{reminderMsg}</p>}
              <p className="text-xs mt-2 pt-2 border-t" style={{ color: '#888', borderColor: '#F0F0F0' }}>All WhatsApp alerts active</p>
            </div>
          )}

          <div className="space-y-3">
            {renewalRequired && !isPremium ? (
              <div className="card p-8 text-center">
                <p className="text-sm font-semibold" style={{ color: '#333' }}>Renewal Required</p>
                <p className="text-xs mt-2" style={{ color: '#888' }}>Pay premium above to view your children's details.</p>
              </div>
            ) : (dashboard || []).length === 0 ? (
              <div className="card p-8 text-center"><p className="text-sm" style={{ color: '#888' }}>No children found.</p></div>
            ) : null}

            <a href="#/merchant" className="card p-4 flex items-center gap-3" style={{ display: 'flex', textDecoration: 'none' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#FFF3E0' }}><span style={{ fontSize: 18 }}>📢</span></div>
              <div><p className="text-sm font-semibold" style={{ color: '#333' }}>Advertise Your Business</p><p className="text-xs mt-0.5" style={{ color: '#888' }}>Reach parents with sponsored ads</p></div>
              <span className="ml-auto" style={{ color: '#bbb' }}>→</span>
            </a>

            {(!renewalRequired || isPremium) && (dashboard || []).map((child, i) => (
              <div key={i} className="card p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold" style={{ color: '#333' }}>{child.full_name}</h3>
                  <span className="badge-present">{child.class_name}</span>
                </div>
                <div className="mt-3 pt-3 border-t" style={{ borderColor: '#F0F0F0' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: '#888' }}>Attendance</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={child.last_attendance === 'Present' ? 'badge-present' : 'badge-absent'}>{child.last_attendance || 'Not recorded'}</span>
                    {child.last_date && <span className="text-xs" style={{ color: '#bbb' }}>{new Date(child.last_date).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}</span>}
                    {child.arrival_time && child.last_attendance === 'Present' && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#E8F5E9', color: '#2E7D32' }}>
                        🕐 Arrived {new Date(child.arrival_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t" style={{ borderColor: '#F0F0F0' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: '#888' }}>Last Fee Payment</p>
                  {child.last_payment_amount ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold" style={{ color: '#1565C0' }}>KSh {parseFloat(child.last_payment_amount).toLocaleString()}</span>
                      <span className="text-xs" style={{ color: '#bbb' }}>{new Date(child.last_payment_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(child.last_payment_date).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ) : <span className="text-xs" style={{ color: '#bbb' }}>No payments recorded</span>}
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleDownloadAcademic(child)} disabled={exporting} className="btn-secondary text-xs">Report PDF ({selectedTerm})</button>
                  <button onClick={() => handleDownloadFees(child)} disabled={exporting} className="btn-secondary text-xs">Fees PDF ({selectedTerm})</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── LOGIN ────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', backgroundImage: 'url(https://images.unsplash.com/photo-1523050854058-8df90110c7f1?w=800&q=80)', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400 }}>
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-3" style={{ backgroundColor: '#7B4F9B' }}>
            <span className="text-2xl font-bold text-white">P</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Parent Portal</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Powered by Smarternow Data Venture</p>
        </div>

        <MarketplaceBanner />

        <div className="bg-white rounded-card p-6 shadow-xl">
          {step === 'phone' && (
            <form onSubmit={handleRequestOtp}>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#555' }}>Phone Number</label>
              <input type="tel" placeholder="e.g. 254712345678" value={phone} onChange={e => setPhone(e.target.value)} className="input-field mb-4" autoFocus required />
              <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Sending...' : 'Continue with OTP'}</button>
            </form>
          )}
          {step === 'otp' && (
            <div>
              <p className="text-sm mb-1 text-center" style={{ color: '#666' }}>Enter the code sent to</p>
              <p className="text-base font-semibold mb-5 text-center" style={{ color: '#7B4F9B' }}>{phone}</p>
              <OTPInput onComplete={handleVerify} />
              <button onClick={() => { setStep('phone'); setError(''); }} className="w-full mt-3 text-center text-sm" style={{ color: '#888' }}>← Change number</button>
            </div>
          )}
        </div>
        {error && <div className="mt-3 p-3 rounded-lg text-sm text-center" style={{ backgroundColor: '#FFEBEE', color: '#C62828' }}>{error}</div>}
        <MarketplaceBanner />
      </div>
    </div>
  );
}

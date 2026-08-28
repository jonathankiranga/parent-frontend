import React, { useState, useEffect, useCallback } from 'react';
import OTPInput from '../components/OTPInput.jsx';
import MarketplaceBanner from '../components/MarketplaceBanner.jsx';
import api, { requestParentOtp, verifyParentOtp, getParentDashboard, getAcademicReport, getFeeStatement, getPremiumStatus } from '../utils/api.js';

export default function ParentPortal() {
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [schoolId, setSchoolId] = useState(null);
  const [schoolsInfo, setSchoolsInfo] = useState([]);
  const [parentName, setParentName] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [renewalRequired, setRenewalRequired] = useState(false);
  const [premiumExpires, setPremiumExpires] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [checkoutRequestId, setCheckoutRequestId] = useState(null);
  const [pdfNotice, setPdfNotice] = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [premiumPrice, setPremiumPrice] = useState(100);
  const [premiumTotal, setPremiumTotal] = useState(100);
  const [premiumCount, setPremiumCount] = useState(1);
  const [renewalPhone, setRenewalPhone] = useState('');

  // Term selection — derive current term from month, one selector shared across all children
  function deriveCurrentTerm() {
    const m = new Date().getMonth() + 1; // 1–12
    if (m <= 4) return 'Term 1';
    if (m <= 8) return 'Term 2';
    return 'Term 3';
  }
  const [selectedTerm, setSelectedTerm] = useState(deriveCurrentTerm);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Restore session on page load/refresh
  useEffect(() => {
    const saved = sessionStorage.getItem('parent_phone');
    if (!saved) return;
    setPhone(saved);
    getParentDashboard(saved).then(data => {
      setDashboard(data.children || []);
      setSchoolId(data.school_id);
      setSchoolsInfo(data.schools || []);
      setParentName(data.parent?.parent_name || '');
      setIsPremium(Boolean(data.premium_active));
      setRenewalRequired(Boolean(data.renewal_required));
      setPremiumExpires(data.parent?.premium_expires_at || null);
      setPremiumPrice(data.premium_price || 100);
      setPremiumTotal(data.premium_total || 100);
      setPremiumCount(data.premium_children_count || (data.children?.length || 1));
      setRenewalPhone(saved);
      setStep('dashboard');
    }).catch(() => {
      // Session stale or server error — clear and show login
      sessionStorage.removeItem('parent_phone');
    });
  }, []);

  async function handleRequestOtp(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const identifier = phone.trim();
      const isEmail = identifier.includes('@');

      if (!isEmail) {
        // Check premium status first to show renewal/locked UI at login
        const status = await getPremiumStatus(identifier);
        setPremiumPrice(status.premium_price || 100);
        setPremiumTotal(status.premium_total || 100);
        setPremiumCount(status.premium_children_count || 1);
        setRenewalPhone(identifier);

        if (status.registered === false) {
          // Phone not registered as a parent — show helpful message with next steps
          setError('This phone number is not registered as a parent in the system. Please contact the school or support to link your children.');
          setLoading(false);
          return;
        }

        if (status.renewal_required) {
          // Show pay wall but still allow them to proceed to OTP so they can pay from dashboard
          setRenewalRequired(true);
          // Still send OTP so they can log in and pay from within the dashboard
          const data = await requestParentOtp(identifier);
          setSessionId(data.session_id);
          setStep('otp');
          setLoading(false);
          return;
        }
      }

      // Email logins skip the pre-check — the backend resolves the email
      // to the registered parent profile after OTP verification.
      const data = await requestParentOtp(identifier);
      setSessionId(data.session_id);
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
      const v = await verifyParentOtp(sessionId, code);
      // Email logins resolve to the profile's canonical phone server-side
      const effective = v.phone || phone.trim();
      const data = await getParentDashboard(effective);
      setDashboard(data.children || []);
      setSchoolId(data.school_id);
      setSchoolsInfo(data.schools || []);
      setParentName(data.parent?.parent_name || '');
      setIsPremium(Boolean(data.premium_active));
      setRenewalRequired(Boolean(data.renewal_required));
      setPremiumExpires(data.parent?.premium_expires_at || null);
      setPremiumPrice(data.premium_price || 100);
      setPremiumTotal(data.premium_total || 100);
      setPremiumCount(data.premium_children_count || (data.children?.length || 1));
      setPhone(effective);
      setRenewalPhone(effective);
      sessionStorage.setItem('parent_phone', effective); // persist across page refreshes
      setStep('dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code');
    }
    setLoading(false);
  }

  // Poll for payment confirmation after STK push
  useEffect(() => {
    if (!checkoutRequestId) return;
    let attempts = 0;
    const maxAttempts = 24; // 2 minutes at 5s intervals
    const timer = setInterval(async () => {
      attempts++;
      try {
        const r = await api.get('/api/parents/payment-status', {
          params: { checkout_request_id: checkoutRequestId, phone }
        });
        if (r.data.status === 'completed') {
          clearInterval(timer);
          setCheckoutRequestId(null);
          setIsPremium(true);
          setRenewalRequired(false);
          setUpgrading(false);
          setUpgradeMsg('✓ Payment confirmed — subscription activated!');
          // Refresh dashboard to get updated children
          getParentDashboard(phone).then(data => {
            setDashboard(data.children || []);
            setSchoolsInfo(data.schools || []);
            setParentName(data.parent?.parent_name || parentName);
      setParentName(data.parent?.parent_name || '');
            setPremiumExpires(data.parent?.premium_expires_at || null);
          }).catch(() => {});
        } else if (r.data.status === 'failed') {
          clearInterval(timer);
          setCheckoutRequestId(null);
          setUpgrading(false);
          setUpgradeMsg(r.data.reason || 'Payment was cancelled or failed. Try again.');
        }
      } catch (e) { /* ignore poll errors */ }

      if (attempts >= maxAttempts) {
        clearInterval(timer);
        setCheckoutRequestId(null);
        setUpgrading(false);
        setUpgradeMsg('Payment timed out. If you paid, it will activate shortly.');
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [checkoutRequestId, phone]);

  async function handleUpgrade(schoolId) {
    setUpgrading(true);
    setUpgradeMsg('');
    try {
      const targetPhone = (renewalPhone || phone).trim();
      const r = await api.post('/api/parents/upgrade', { phone: targetPhone, school_id: schoolId || undefined });
      if (r.data.status === 'confirmed') {
        // Simulated / dev mode — immediate
        setIsPremium(true);
        setRenewalRequired(false);
        setPremiumTotal(r.data.premium_due || premiumTotal);
        const expires = new Date();
        expires.setMonth(expires.getMonth() + 4);
        setPremiumExpires(expires.toISOString());
        setUpgradeMsg('✓ Subscription activated');
        setUpgrading(false);
      } else if (r.data.status === 'school_paid') {
        setIsPremium(true);
        setRenewalRequired(false);
        setUpgradeMsg(r.data.message);
        setUpgrading(false);
      } else if (r.data.status === 'pending') {
        // STK push sent — start polling for confirmation
        setUpgradeMsg('STK push sent — enter your M-Pesa PIN to confirm payment...');
        setCheckoutRequestId(r.data.checkout_request_id);
        // keep upgrading=true and spinner showing until poll resolves
      }
    } catch (err) {
      setUpgradeMsg(err.response?.data?.error || 'Upgrade failed');
      setUpgrading(false);
    }
  }

  async function handleDownloadAcademic(child) {
    if (!isPremium) {
      setPdfNotice('Report cards are available with an active subscription. Tap Upgrade above to activate.');
      return;
    }
    setExporting(true);
    setPdfNotice('');
    try {
      const report = await getAcademicReport(child.student_id, selectedTerm, selectedYear, phone);
      const module = await import('../utils/pdfExport.js');
      await module.downloadAcademicPdf(report, child.full_name, phone, selectedTerm);
    } catch (err) {
      setPdfNotice(err.response?.data?.error || 'Failed to generate academic report');
    }
    setExporting(false);
  }

  async function handleDownloadFees(child) {
    setExporting(true);
    setPdfNotice('');
    try {
      const statement = await getFeeStatement(child.student_id, selectedTerm, selectedYear.toString());
      const module = await import('../utils/pdfExport.js');
      await module.downloadFeePdf(statement, child.full_name, phone, selectedTerm, selectedYear.toString());
    } catch (err) {
      setPdfNotice(err.response?.data?.error || 'Failed to generate fee statement');
    }
    setExporting(false);
  }

  // Group children per school for merged multi-school display + per-school payments
  function buildSchoolGroups() {
    const groups = [];
    const ensure = (id, name) => {
      let g = groups.find(x => x.school_id === id);
      if (!g) { g = { school_id: id, school_name: name || 'My School', children: [] }; groups.push(g); }
      return g;
    };
    (schoolsInfo || []).forEach(s => ensure(s.school_id, s.school_name));
    (dashboard || []).forEach(child => {
      const info = (schoolsInfo || []).find(s => s.school_id === child.school_id);
      const g = ensure(child.school_id, child.school_name || (info ? info.school_name : ''));
      g.children.push(child);
    });
    return groups;
  }

  function initialsOf(name) {
    return String(name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  function fmtDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  if (step === 'dashboard') {
    const schoolGroups = buildSchoolGroups();
    return (
      <div style={{ backgroundColor: '#F8F8F8', minHeight: '100vh' }}>
        {exporting && (
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000 }}>
            <div style={{ background: '#fff', padding: 16, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12, minWidth: 280 }}>
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#7B4F9B', borderTopColor: 'transparent' }} />
              <div>
                <div style={{ fontWeight: 700 }}>Preparing PDF…</div>
                <div style={{ fontSize: 12, color: '#666' }}>Downloading necessary libraries — first time may take a few seconds</div>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-lg mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold tracking-wide" style={{ color: '#7B4F9B' }}>PARENT PORTAL</p>
              <h1 className="text-xl font-bold" style={{ color: '#333' }}>{parentName || 'Welcome'}</h1>
              <p className="text-xs mt-0.5" style={{ color: '#888' }}>{phone}</p>
            </div>
            <button onClick={() => { sessionStorage.removeItem('parent_phone'); setStep('phone'); setPhone(''); setDashboard(null); }} className="btn-secondary text-xs">Logout</button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="card p-3 text-center">
              <p className="text-lg font-bold" style={{ color: '#7B4F9B' }}>{(dashboard || []).length}</p>
              <p className="text-xs" style={{ color: '#888' }}>Child{(dashboard || []).length === 1 ? '' : 'ren'}</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-lg font-bold" style={{ color: '#7B4F9B' }}>{schoolGroups.length}</p>
              <p className="text-xs" style={{ color: '#888' }}>School{schoolGroups.length === 1 ? '' : 's'}</p>
            </div>
          </div>

          {/* Term / Year selector — applies to all PDF downloads */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Term</label>
              <select
                value={selectedTerm}
                onChange={e => setSelectedTerm(e.target.value)}
                className="input-field text-sm"
              >
                <option>Term 1</option>
                <option>Term 2</option>
                <option>Term 3</option>
              </select>
            </div>
            <div style={{ width: 100 }}>
              <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Year</label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="input-field text-sm"
              >
                {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Plan status — quiet, honest, no pressure */}
          {!isPremium ? (
            <div className="card p-4 mb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#333' }}>Free plan</p>
                  <p className="text-xs mt-0.5" style={{ color: '#888' }}>Viewing your children's fees is free. Report cards and WhatsApp alerts come with a subscription.</p>
                </div>
                <button onClick={() => setShowUpgrade(s => !s)} className="btn-secondary text-xs whitespace-nowrap">
                  {showUpgrade ? 'Close' : 'Upgrade'}
                </button>
              </div>
              {showUpgrade && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: '#F0F0F0' }}>
                  {(schoolGroups.length > 0 ? schoolGroups.filter(g => g.children.length > 0) : [{ school_id: null, school_name: 'All children', children: [] }]).map(g => (
                    <div key={g.school_id || 'all'} className="flex items-center justify-between p-2.5 rounded-lg mb-2" style={{ backgroundColor: '#FAFAFA' }}>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: '#333' }}>{g.school_name}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#888' }}>KSh {premiumPrice * Math.max(g.children.length, 1)} per term</p>
                      </div>
                      <button onClick={() => handleUpgrade(g.school_id)} disabled={upgrading}
                        className="btn-primary text-xs whitespace-nowrap" style={{ padding: '7px 14px', fontSize: 12 }}>
                        {upgrading ? 'Processing...' : `Pay via M-Pesa`}
                      </button>
                    </div>
                  ))}
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#555' }}>M-Pesa number to charge</label>
                  <input
                    type="tel"
                    value={renewalPhone}
                    onChange={(e) => setRenewalPhone(e.target.value)}
                    className="input-field mb-2"
                    placeholder="2547XXXXXXXX"
                  />
                  <p className="text-xs" style={{ color: '#999' }}>
                    One payment per term. No auto-renewal, no hidden charges. You will receive an M-Pesa prompt to confirm with your PIN.
                  </p>
                  {upgradeMsg && <p className="text-xs mt-2" style={{ color: upgradeMsg.includes('Failed') || upgradeMsg.includes('failed') ? '#C62828' : '#2E7D32' }}>{upgradeMsg}</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="card p-4 mb-4" style={{ borderLeft: '4px solid #10B981', backgroundColor: '#F0FAF4' }}>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 18 }}>✓</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#2E7D32' }}>Subscription Active</p>
                  <p className="text-xs" style={{ color: '#888' }}>
                    {premiumExpires ? `Active until ${new Date(premiumExpires).toLocaleDateString()}` : 'No expiry date'} — all features unlocked
                  </p>
                </div>
              </div>
            </div>
          )}

          {pdfNotice && (
            <div className="card p-3 mb-4" style={{ borderLeft: '4px solid #C62828' }}>
              <p className="text-xs" style={{ color: '#C62828' }}>{pdfNotice}</p>
            </div>
          )}

          <div className="space-y-3">
            {(dashboard || []).length === 0 && (
              <div className="card p-8 text-center">
                <p className="text-sm font-semibold" style={{ color: '#333' }}>No children linked yet</p>
                <p className="text-xs mt-1" style={{ color: '#888' }}>Ask your school to link your phone ({phone}) to your children.</p>
              </div>
            )}

            {schoolGroups.map(g => (
              <div key={g.school_id || g.school_name}>
                <div className="flex items-center justify-between mb-2 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#F6F2FA', fontSize: 13 }}>🏫</span>
                    <div>
                      <h2 className="text-sm font-bold leading-tight" style={{ color: '#333' }}>{g.school_name}</h2>
                      <p className="text-xs" style={{ color: '#888' }}>{g.children.length} child{g.children.length === 1 ? '' : 'ren'}</p>
                    </div>
                  </div>
                </div>

                {g.children.map(child => (
                  <div key={child.student_id} className="card p-4 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full flex items-center justify-center font-bold shrink-0"
                        style={{ width: 44, height: 44, backgroundColor: 'rgba(123,79,155,0.12)', color: '#7B4F9B', fontSize: 15 }}>
                        {initialsOf(child.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold truncate" style={{ color: '#333' }}>{child.full_name}</h3>
                          <span className="badge-present whitespace-nowrap">{child.class_name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {child.last_payment_amount && (
                            <span className="text-xs" style={{ color: '#888' }}>
                              Paid KSh {child.last_payment_amount}{child.last_payment_date ? ` on ${fmtDate(child.last_payment_date)}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: '#F0F0F0' }}>
                      <button
                        onClick={() => handleDownloadAcademic(child)}
                        disabled={exporting}
                        className="btn-secondary text-xs flex-1"
                        style={!isPremium ? { opacity: 0.55 } : undefined}
                      >
                        Report Card{!isPremium ? ' — Locked' : ` (${selectedTerm})`}
                      </button>
                      <button
                        onClick={() => handleDownloadFees(child)}
                        disabled={exporting}
                        className="btn-secondary text-xs flex-1"
                      >
                        Fee Statement ({selectedTerm})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
 
          <MarketplaceBanner schoolId={schoolGroups[0]?.school_id} />

          <a href="#/market"
            className="card p-4 flex items-center gap-3"
            style={{ display: 'flex', textDecoration: 'none' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#F6F2FA' }}>
              <span style={{ fontSize: 18 }}>🛍️</span>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#333' }}>School Market</p>
              <p className="text-xs mt-0.5" style={{ color: '#888' }}>Uniforms, books & more from local sellers</p>
            </div>
            <span className="ml-auto" style={{ color: '#bbb' }}>→</span>
          </a>

          <a href="#/merchant"
            className="card p-4 flex items-center gap-3"
            style={{ display: 'flex', textDecoration: 'none' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#FFF3E0' }}>
              <span style={{ fontSize: 18 }}>🛍️</span>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#333' }}>Sell on School Market</p>
              <p className="text-xs mt-0.5" style={{ color: '#888' }}>List products, parents call you directly</p>
            </div>
            <span className="ml-auto" style={{ color: '#bbb' }}>→</span>
          </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'url(https://images.unsplash.com/photo-1523050854058-8df90110c7f1?w=800&q=80)',
      backgroundSize: 'cover', backgroundPosition: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px'
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400 }}>
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-3" style={{ backgroundColor: '#7B4F9B' }}>
            <span className="text-2xl font-bold text-white">P</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Parent Portal</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Powered by Smarternow Data Venture</p>
        </div>

        <div className="bg-white rounded-card p-6 shadow-xl">
          {step === 'phone' && (
            <form onSubmit={handleRequestOtp}>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#555' }}>Email or Phone Number</label>
              <input
                type="text"
                inputMode="email"
                placeholder="email@example.com or 254712345678"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="input-field mb-4"
                required
              />
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
        <MarketplaceBanner rotate />
      </div>
    </div>
  );
}

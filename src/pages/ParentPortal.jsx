import React, { useState, useEffect, useCallback } from 'react';
import OTPInput from '../components/OTPInput.jsx';
import MarketplaceBanner from '../components/MarketplaceBanner.jsx';
import api, { requestParentOtp, verifyParentOtp, getParentDashboard } from '../utils/api.js';

export default function ParentPortal() {
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [schoolId, setSchoolId] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumExpires, setPremiumExpires] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderMsg, setReminderMsg] = useState('');

  async function handleRequestOtp(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await requestParentOtp(phone);
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
      await verifyParentOtp(sessionId, code);
      const data = await getParentDashboard(phone);
      setDashboard(data.children || []);
      setSchoolId(data.school_id);
      setIsPremium(data.parent?.is_premium || false);
      setPremiumExpires(data.parent?.premium_expires_at || null);
      setStep('dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code');
    }
    setLoading(false);
  }

  async function handleFeeReminder() {
    setSendingReminder(true);
    setReminderMsg('');
    try {
      const r = await api.post('/api/parents/fee-reminder', { phone });
      setReminderMsg(r.data.sent > 0 ? 'Fee details sent to your WhatsApp' : 'No fees found');
    } catch (err) {
      setReminderMsg(err.response?.data?.error || 'Failed');
    }
    setSendingReminder(false);
  }

  async function handleUpgrade() {
    setUpgrading(true);
    setUpgradeMsg('');
    try {
      const r = await api.post('/api/parents/upgrade', { phone });
      setUpgradeMsg(r.data.message || 'Processing...');
      if (r.data.status === 'confirmed') {
        setIsPremium(true);
        const expires = new Date();
        expires.setMonth(expires.getMonth() + 4);
        setPremiumExpires(expires.toISOString());
      }
    } catch (err) {
      setUpgradeMsg(err.response?.data?.error || 'Upgrade failed');
    }
    setUpgrading(false);
  }

  if (step === 'dashboard') {
    return (
      <div style={{ backgroundColor: '#F8F8F8', minHeight: '100vh' }}>
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#333' }}>My Children</h1>
              <p className="text-xs mt-0.5" style={{ color: '#888' }}>{phone}</p>
            </div>
            <button onClick={() => { setStep('phone'); setPhone(''); setDashboard(null); }} className="btn-secondary text-xs">Logout</button>
          </div>

          {/* Premium Banner */}
          {!isPremium ? (
            <div className="card p-4 mb-4" style={{ borderLeft: '4px solid #FFB300' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#333' }}>Upgrade to Premium</p>
                  <p className="text-xs mt-0.5" style={{ color: '#888' }}>KSh 100 per term — cancel anytime</p>
                </div>
                <button onClick={handleUpgrade} disabled={upgrading}
                  className="btn-primary text-sm" style={{ padding: '8px 16px', fontSize: 13 }}>
                  {upgrading ? 'Processing...' : 'KSh 100'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5" style={{ color: '#555' }}><span style={{ color: '#10B981' }}>✓</span> Daily absence alerts</div>
                <div className="flex items-center gap-1.5" style={{ color: '#555' }}><span style={{ color: '#10B981' }}>✓</span> 3+ day absence warnings</div>
                <div className="flex items-center gap-1.5" style={{ color: '#555' }}><span style={{ color: '#10B981' }}>✓</span> Assessment results</div>
                <div className="flex items-center gap-1.5" style={{ color: '#555' }}><span style={{ color: '#10B981' }}>✓</span> Fee balance reminders</div>
                <div className="flex items-center gap-1.5" style={{ color: '#555' }}><span style={{ color: '#10B981' }}>✓</span> School broadcast messages</div>
                <div className="flex items-center gap-1.5" style={{ color: '#555' }}><span style={{ color: '#10B981' }}>✓</span> All children covered</div>
              </div>
              {upgradeMsg && <p className="text-xs mt-2" style={{ color: upgradeMsg.includes('Failed') || upgradeMsg.includes('failed') ? '#C62828' : '#2E7D32' }}>{upgradeMsg}</p>}
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
                <button onClick={handleFeeReminder} disabled={sendingReminder}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ backgroundColor: 'rgba(123,79,155,0.08)', color: '#7B4F9B' }}>
                  {sendingReminder ? '...' : 'Fee Reminder'}
                </button>
              </div>
              {reminderMsg && <p className="text-xs mt-1" style={{ color: '#2E7D32' }}>{reminderMsg}</p>}
              <div className="text-xs mt-2 pt-2 border-t" style={{ color: '#888', borderColor: '#F0F0F0' }}>
                All WhatsApp alerts active for your children
              </div>
            </div>
          )}

          <div className="space-y-3">
            {dashboard.length === 0 && <div className="card p-8 text-center"><p className="text-sm" style={{ color: '#888' }}>No children linked to this phone.</p></div>}
            {dashboard.map((child, i) => (
              <div key={i} className="card p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold" style={{ color: '#333' }}>{child.full_name}</h3>
                  <span className="badge-present">{child.class_name}</span>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: '#F0F0F0' }}>
                  <span className="text-xs" style={{ color: '#888' }}>Last attendance:</span>
                  <span className={child.last_attendance === 'Present' ? 'badge-present' : 'badge-absent'}>{child.last_attendance || 'N/A'}</span>
                  {child.last_date && <span className="text-xs" style={{ color: '#bbb' }}>{child.last_date}</span>}
                </div>
              </div>
            ))}
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4" style={{ backgroundColor: '#7B4F9B' }}>
            <span className="text-2xl font-bold text-white">P</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Parent Portal</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Powered by Smarternow Data Venture</p>
        </div>
        <div className="bg-white rounded-card p-6 shadow-xl">
          {step === 'phone' && (
            <form onSubmit={handleRequestOtp}>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#555' }}>Phone Number</label>
              <input type="tel" placeholder="e.g. 254712345678" value={phone} onChange={e => setPhone(e.target.value)} className="input-field mb-4" required />
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
        <div className="mt-6 text-center">
          <a href="#/teacher/login" className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>Teacher Login →</a>
        </div>
        <MarketplaceBanner />
      </div>
    </div>
  );
}

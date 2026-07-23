import React, { useState, useEffect } from 'react';
import api, { registerMerchant, requestMerchantOtp, verifyMerchantOtp } from '../utils/api.js';

export default function MerchantPortal({ phone: parentPhone, onBack }) {
  const [step, setStep] = useState('register');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState(parentPhone || '');
  const [email, setEmail] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [schools, setSchools] = useState([]);
  const [targetSchool, setTargetSchool] = useState('');
  const [days, setDays] = useState(7);
  const [adMessage, setAdMessage] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [msg, setMsg] = useState('');
  const [prices, setPrices] = useState({});

  useEffect(() => {
    api.get('/api/merchants/schools').then(d => setSchools((d.schools || []).map(s => ({ value: s.school_id, label: s.school_name })))).catch(() => {});
    api.get('/admin/api/settings').then(d => {
      if (d.settings) setPrices(d.settings);
    }).catch(() => {});
  }, []);

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const data = await registerMerchant({ business_name: businessName, phone, email });
      setMerchantId(data.merchant_id);
      setSessionId(data.session_id);
      setStep('otp');
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    setLoading(false);
  }

  async function handleVerify(code) {
    setLoading(true); setError('');
    try {
      const data = await verifyMerchantOtp(sessionId, code);
      setMerchantId(data.merchant_id);
      setBusinessName(data.business_name);
      const d = await api.get('/api/merchants/campaigns', { params: { merchant_id: data.merchant_id } });
      setCampaigns(d.data.campaigns || []);
      setStep('dashboard');
    } catch (err) { setError(err.response?.data?.error || 'Invalid'); }
    setLoading(false);
  }

  async function handleCreateAd(e) {
    e.preventDefault();
    setLoading(true); setMsg('');
    try {
      const r = await api.post('/api/merchants/campaigns', { merchant_id: merchantId, message: adMessage, target_school_id: targetSchool, days });
      setMsg(r.data.message || 'Campaign created!');
      setAdMessage('');
      const d = await api.get('/api/merchants/campaigns', { params: { merchant_id: merchantId } });
      setCampaigns(d.data.campaigns || []);
    } catch (err) { setMsg(err.response?.data?.error || 'Failed'); }
    setLoading(false);
  }

  function getPrice(d) {
    const key = 'merchant_' + d + '_day';
    return prices[key] || { 7: 200, 14: 350, 30: 500, 90: 1200 }[d] || 0;
  }

  function OTPInput({ onComplete }) {
    const [vals, setVals] = useState(Array(4).fill(''));
    const refs = [];
    return (
      <div className="flex justify-center gap-3 mb-4">
        {vals.map((v, i) => (
          <input key={i} ref={el => refs[i] = el} type="text" inputMode="numeric" maxLength={1} value={v}
            onChange={e => { const n = [...vals]; n[i] = e.target.value.replace(/\D/g,'').slice(-1); setVals(n); if (n[i] && i<3) refs[i+1]?.focus(); if (n.every(ch=>ch) && onComplete) onComplete(n.join('')); }}
            onKeyDown={e => { if (e.key==='Backspace' && !vals[i] && i>0) refs[i-1]?.focus(); }}
            className="w-12 h-14 text-center text-xl font-bold rounded-lg border-2 outline-none"
            style={{ borderColor: v ? '#7B4F9B' : '#E0E0E0', color: '#7B4F9B' }} />
        ))}
      </div>
    );
  }

  if (step === 'dashboard') {
    return (
      <div style={{ backgroundColor: '#F8F8F8', minHeight: '100vh' }}>
        <div className="navbar px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <h1 className="text-base font-bold" style={{ color: '#333' }}>Advertise</h1>
            <button onClick={onBack} className="btn-ghost text-sm">Back</button>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
          <div className="card p-4">
            <p className="text-sm font-semibold mb-1" style={{ color: '#333' }}>{businessName}</p>
            <p className="text-xs" style={{ color: '#888' }}>Reach parents at your target school with sponsored ads</p>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-bold mb-4" style={{ color: '#333' }}>New Campaign</h2>
            <form onSubmit={handleCreateAd} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Target School</label>
                <select value={targetSchool} onChange={e => setTargetSchool(e.target.value)} className="input-field" required>
                  <option value="">Select school</option>
                  {schools.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Ad Message</label>
                <textarea value={adMessage} onChange={e => setAdMessage(e.target.value)} rows={2} className="input-field" placeholder="e.g. Mwangi Hardware — 10% off for parents" required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Duration</label>
                <select value={days} onChange={e => setDays(Number(e.target.value))} className="input-field">
                  <option value={7}>7 days — KSh {getPrice(7)}</option>
                  <option value={14}>14 days — KSh {getPrice(14)}</option>
                  <option value={30}>30 days — KSh {getPrice(30)}</option>
                  <option value={90}>90 days — KSh {getPrice(90)}</option>
                </select>
              </div>
              <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Creating...' : 'Create Campaign'}</button>
            </form>
            {msg && <p className="text-xs mt-2 text-center" style={{ color: msg.includes('Fail') || msg.includes('fail') ? '#C62828' : msg.includes('Pay') ? '#F57F17' : '#2E7D32' }}>{msg}</p>}
          </div>

          {campaigns.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-bold" style={{ color: '#333' }}>Your Campaigns</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#FAFAFA' }}>
                    <th className="text-left px-4 py-2 text-xs font-semibold uppercase" style={{ color: '#888' }}>Message</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold uppercase" style={{ color: '#888' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c, i) => (
                    <tr key={i} style={{ borderBottom: i < campaigns.length-1 ? '1px solid #F0F0F0' : 'none' }}>
                      <td className="px-4 py-3 text-sm" style={{ color: '#333' }}>{c.message || c.business_name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="badge-present">{c.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#F8F8F8', minHeight: '100vh' }}>
      <div className="navbar px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-base font-bold" style={{ color: '#333' }}>Advertise Your Business</h1>
          <button onClick={onBack} className="btn-ghost text-sm">Back</button>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4" style={{ backgroundColor: '#FFB300' }}>
            <span className="text-2xl font-bold text-white">📢</span>
          </div>
          <h1 className="text-xl font-bold" style={{ color: '#333' }}>Reach Local Parents</h1>
          <p className="text-sm mt-1" style={{ color: '#888' }}>Promote your business to parents in your child's school</p>
        </div>

        <div className="card p-6">
          {step === 'register' && (
            <form onSubmit={handleRegister}>
              <div className="mb-3">
                <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Business Name</label>
                <input value={businessName} onChange={e => setBusinessName(e.target.value)} className="input-field" required />
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Phone Number</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className="input-field" placeholder="254712345678" required />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Email (optional)</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Sending...' : 'Register & Send OTP'}</button>
            </form>
          )}

          {step === 'otp' && (
            <div>
              <p className="text-sm mb-1 text-center" style={{ color: '#666' }}>Enter the code sent to</p>
              <p className="text-base font-semibold mb-5 text-center" style={{ color: '#7B4F9B' }}>{phone}</p>
              <OTPInput onComplete={handleVerify} />
            </div>
          )}
        </div>

        {error && <div className="mt-3 p-3 rounded-lg text-sm text-center" style={{ backgroundColor: '#FFEBEE', color: '#C62828' }}>{error}</div>}
      </div>
    </div>
  );
}

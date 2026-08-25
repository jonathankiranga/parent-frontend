import React, { useState, useEffect } from 'react';
import { registerMerchant, requestMerchantOtp, verifyMerchantOtp, addMerchantProduct, getMerchantProducts, deactivateMerchantProduct } from '../utils/api.js';

export default function MerchantPortal({ phone: parentPhone, onBack }) {
  const [step, setStep] = useState('register');
  const [businessName, setBusinessName] = useState('');
  const [identifier, setIdentifier] = useState(parentPhone || '');
  const [sessionId, setSessionId] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [prodForm, setProdForm] = useState({ name: '', category: 'Uniforms', price: '', description: '' });
  const [prodMsg, setProdMsg] = useState('');

  useEffect(() => {
    if (step === 'dashboard' && merchantId) {
      getMerchantProducts(merchantId).then(d => setProducts(d.products || [])).catch(() => {});
    }
  }, [step, merchantId]);

  async function handleAddProduct(e) {
    e.preventDefault();
    setLoading(true); setProdMsg('');
    try {
      await addMerchantProduct({
        merchant_id: merchantId,
        name: prodForm.name,
        category: prodForm.category,
        price: parseFloat(prodForm.price) || 0,
        description: prodForm.description
      });
      setProdMsg('Listing published');
      setProdForm({ name: '', category: prodForm.category, price: '', description: '' });
      const d = await getMerchantProducts(merchantId);
      setProducts(d.products || []);
    } catch (err) {
      setProdMsg(err.response?.data?.error || 'Failed to publish');
    }
    setLoading(false);
  }

  async function handleHideProduct(productId) {
    try {
      await deactivateMerchantProduct(merchantId, productId);
      setProducts(ps => ps.map(p => p.product_id === productId ? { ...p, active: 0 } : p));
    } catch (err) {
      setProdMsg(err.response?.data?.error || 'Failed');
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const value = identifier.trim();
      const isEmail = value.includes('@');
      const body = { business_name: businessName.trim(), ...(isEmail ? { email: value } : { phone: value }) };
      const data = await registerMerchant(body);
      setMerchantId(data.merchant_id);
      setSessionId(data.session_id);
      setStep('otp');
    } catch (err) {
      const msgText = err.response?.data?.error || 'Failed';
      setError(msgText);
      if (msgText.includes('already registered')) {
        try {
          const d = await requestMerchantOtp(identifier);
          setSessionId(d.session_id);
          setStep('otp');
          setError('');
        } catch (e2) { /* keep the 409 message */ }
      }
    }
    setLoading(false);
  }

  async function handleVerify(code) {
    setLoading(true); setError('');
    try {
      const data = await verifyMerchantOtp(sessionId, code);
      setMerchantId(data.merchant_id);
      setBusinessName(data.business_name);
      setStep('dashboard');
    } catch (err) { setError(err.response?.data?.error || 'Invalid'); }
    setLoading(false);
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
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <h1 className="text-base font-bold" style={{ color: '#333' }}>{businessName}</h1>
            <button onClick={onBack} className="btn-ghost text-sm">Back</button>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
          <div className="card p-5">
            <h2 className="text-sm font-bold mb-1" style={{ color: '#333' }}>List a Product</h2>
            <p className="text-xs mb-4" style={{ color: '#888' }}>Parents find it in the School Market and call you directly.</p>
            <form onSubmit={handleAddProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Product Name</label>
                <input value={prodForm.name} onChange={e => setProdForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="e.g. Grade 1 sweater, maroon" required />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Category</label>
                  <select value={prodForm.category} onChange={e => setProdForm(f => ({ ...f, category: e.target.value }))} className="input-field">
                    {['Uniforms', 'Textbooks', 'Stationery', 'Transport', 'Tuition', 'Food', 'Other'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ width: 110 }}>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Price (KSh)</label>
                  <input type="number" min="0" value={prodForm.price} onChange={e => setProdForm(f => ({ ...f, price: e.target.value }))} className="input-field" placeholder="1450" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Description (optional)</label>
                <textarea value={prodForm.description} onChange={e => setProdForm(f => ({ ...f, description: e.target.value }))} rows={2} className="input-field" placeholder="Sizes available, condition, collection point..." />
              </div>
              <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Publishing...' : 'Publish Listing'}</button>
            </form>
            {prodMsg && <p className="text-xs mt-2 text-center" style={{ color: prodMsg.includes('ail') ? '#C62828' : '#2E7D32' }}>{prodMsg}</p>}
          </div>

          {products.length > 0 && (
            <div className="card p-5">
              <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#888' }}>Your Listings</h3>
              <div className="space-y-2">
                {products.map(p => (
                  <div key={p.product_id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: p.active ? '#FAFAFA' : '#F3F3F3' }}>
                    <div className="min-w-0">
                      <p className="text-sm truncate" style={{ color: p.active ? '#333' : '#999' }}>{p.name}</p>
                      <p className="text-xs" style={{ color: '#888' }}>KSh {Number(p.price || 0).toLocaleString()} · {p.category}{p.active ? '' : ' · hidden'}</p>
                    </div>
                    {Boolean(p.active) && (
                      <button onClick={() => handleHideProduct(p.product_id)} className="text-xs shrink-0" style={{ color: '#C62828' }}>Hide</button>
                    )}
                  </div>
                ))}
              </div>
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
          <h1 className="text-base font-bold" style={{ color: '#333' }}>Sell on School Market</h1>
          <button onClick={onBack} className="btn-ghost text-sm">Back</button>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4" style={{ backgroundColor: '#FFB300' }}>
            <span className="text-2xl font-bold text-white">🛍️</span>
          </div>
          <h1 className="text-xl font-bold" style={{ color: '#333' }}>List Your Products</h1>
          <p className="text-sm mt-1" style={{ color: '#888' }}>Parents browse the School Market and call you directly</p>
        </div>

        <div className="card p-6">
          {step === 'register' && (
            <form onSubmit={handleRegister}>
              <div className="mb-3">
                <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Business Name</label>
                <input value={businessName} onChange={e => setBusinessName(e.target.value)} className="input-field" required />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Email or Phone Number</label>
                <input value={identifier} onChange={e => setIdentifier(e.target.value)} className="input-field" placeholder="kirangajon@gmail.com or 254712345678" required />
                <p className="text-xs mt-1" style={{ color: '#999' }}>We send your login code here. Parents see your profile number on listings.</p>
              </div>
              <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Sending...' : 'Register & Send OTP'}</button>
            </form>
          )}

          {step === 'otp' && (
            <div>
              <p className="text-sm mb-1 text-center" style={{ color: '#666' }}>Enter the code sent to</p>
              <p className="text-base font-semibold mb-5 text-center" style={{ color: '#7B4F9B' }}>{identifier}</p>
              <OTPInput onComplete={handleVerify} />
            </div>
          )}
        </div>

        {error && <div className="mt-3 p-3 rounded-lg text-sm text-center" style={{ backgroundColor: '#FFEBEE', color: '#C62828' }}>{error}</div>}
      </div>
    </div>
  );
}

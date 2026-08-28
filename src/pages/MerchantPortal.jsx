import React, { useState, useEffect } from 'react';
import { merchantAutoLogin, addMerchantProduct, getMerchantProducts, deactivateMerchantProduct } from '../utils/api.js';

export default function MerchantPortal({ phone: parentPhone, onBack }) {
  const [status, setStatus] = useState('loading');
  const [merchantId, setMerchantId] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [products, setProducts] = useState([]);
  const [prodForm, setProdForm] = useState({ name: '', category: 'Uniforms', price: '', description: '' });
  const [prodMsg, setProdMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!parentPhone) { setStatus('no_phone'); return; }
    merchantAutoLogin(parentPhone)
      .then(d => {
        setMerchantId(d.merchant_id);
        setBusinessName(d.business_name);
        setStatus('dashboard');
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Could not open merchant portal');
        setStatus('error');
      });
  }, [parentPhone]);

  useEffect(() => {
    if (status === 'dashboard' && merchantId) {
      getMerchantProducts(merchantId).then(d => setProducts(d.products || [])).catch(() => {});
    }
  }, [status, merchantId]);

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

  if (status === 'no_phone') {
    return (
      <div style={{ backgroundColor: '#F8F8F8', minHeight: '100vh' }}>
        <div className="navbar px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <h1 className="text-base font-bold" style={{ color: '#333' }}>Sell on School Market</h1>
            <button onClick={onBack} className="btn-ghost text-sm">Back</button>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <p className="text-sm" style={{ color: '#888' }}>Please log in to your parent account first.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ backgroundColor: '#F8F8F8', minHeight: '100vh' }}>
        <div className="navbar px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <h1 className="text-base font-bold" style={{ color: '#333' }}>Sell on School Market</h1>
            <button onClick={onBack} className="btn-ghost text-sm">Back</button>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-16">
          <div className="card p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4" style={{ backgroundColor: '#F5F5F5' }}>
              <span className="text-2xl">🔒</span>
            </div>
            <p className="text-sm font-semibold mb-2" style={{ color: '#333' }}>{error}</p>
            <p className="text-xs mb-4" style={{ color: '#888' }}>Upgrade your account to start selling on the School Market.</p>
            <button onClick={onBack} className="btn-primary">Back to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'loading' || status === 'dashboard') {
    return (
      <div style={{ backgroundColor: '#F8F8F8', minHeight: '100vh' }}>
        <div className="navbar px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <h1 className="text-base font-bold" style={{ color: '#333' }}>{status === 'dashboard' ? businessName : 'Sell on School Market'}</h1>
            <button onClick={onBack} className="btn-ghost text-sm">Back</button>
          </div>
        </div>
        {status === 'loading' ? (
          <div className="max-w-lg mx-auto px-4 py-16 text-center">
            <p className="text-sm" style={{ color: '#999' }}>Checking your account...</p>
          </div>
        ) : (
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
        )}
      </div>
    );
  }

  return null;
}

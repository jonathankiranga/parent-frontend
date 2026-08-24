import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMarketProducts } from '../utils/api.js';

const CATEGORIES = ['All', 'Uniforms', 'Textbooks', 'Stationery', 'Transport', 'Tuition', 'Food', 'Other'];

export default function MarketPage({ onBack }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('All');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  async function runSearch(nextQ = q, nextCategory = category) {
    setLoading(true);
    setError('');
    try {
      const d = await searchMarketProducts(nextQ.trim(), nextCategory);
      setProducts(d.products || []);
      setSearched(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load listings');
    }
    setLoading(false);
  }

  function pickCategory(c) {
    setCategory(c);
    runSearch(q, c);
  }

  return (
    <div style={{ backgroundColor: '#F8F8F8', minHeight: '100vh' }}>
      <div className="navbar px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-base font-bold" style={{ color: '#333' }}>School Market</h1>
          <button onClick={onBack || (() => navigate('/parent'))} className="btn-ghost text-sm">Back</button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        <form onSubmit={e => { e.preventDefault(); runSearch(); }} className="flex gap-2 mb-3">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            className="input-field flex-1"
            placeholder="Search uniforms, books, tuition..."
          />
          <button type="submit" disabled={loading} className="btn-primary px-4" style={{ width: 'auto' }}>
            {loading ? '...' : 'Search'}
          </button>
        </form>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => pickCategory(c)}
              className="text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium shrink-0"
              style={category === c
                ? { backgroundColor: '#7B4F9B', color: '#fff' }
                : { backgroundColor: '#fff', color: '#666', border: '1px solid #E5E0EA' }}>
              {c}
            </button>
          ))}
        </div>

        {error && <div className="mt-3 p-3 rounded-lg text-sm text-center" style={{ backgroundColor: '#FFEBEE', color: '#C62828' }}>{error}</div>}

        {loading && <p className="text-sm text-center mt-8" style={{ color: '#999' }}>Loading...</p>}

        {!loading && products.length === 0 && searched && (
          <p className="text-sm text-center mt-8" style={{ color: '#888' }}>No listings found{q ? ` for "${q}"` : ''}. Try another search.</p>
        )}

        {!loading && !searched && (
          <p className="text-sm text-center mt-8" style={{ color: '#888' }}>Search or pick a category to see what local sellers are offering.</p>
        )}

        <div className="space-y-3 mt-3">
          {products.map(p => (
            <div key={p.product_id} className="card p-4 flex gap-3">
              {p.image_url ? (
                <img src={p.image_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0"
                  onError={e => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#F6F2FA' }}>
                  <span style={{ fontSize: 22 }}>🛍️</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold leading-tight" style={{ color: '#333' }}>{p.name}</h3>
                  <span className="text-sm font-bold whitespace-nowrap" style={{ color: '#7B4F9B' }}>
                    KSh {Number(p.price || 0).toLocaleString()}
                  </span>
                </div>
                {p.description && <p className="text-xs mt-1" style={{ color: '#777', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</p>}
                <div className="flex items-center justify-between gap-2 mt-2">
                  <span className="text-xs truncate" style={{ color: '#888' }}>Sold by <b>{p.business_name}</b></span>
                </div>
                {p.merchant_phone && (
                  <a href={`tel:${p.merchant_phone}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium mt-2 px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: '#F6F2FA', color: '#7B4F9B' }}>
                    📞 {p.merchant_phone}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-center mt-6" style={{ color: '#bbb' }}>
          Listings are provided by independent sellers. Always meet in safe, public places and inspect items before paying.
        </p>
      </div>
    </div>
  );
}

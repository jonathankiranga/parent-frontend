import React, { useEffect, useState } from 'react';
import { getAd, getRandomAd } from '../utils/api.js';

export default function MarketplaceBanner({ schoolId }) {
  const [ad, setAd] = useState(null);

  useEffect(() => {
    const fetch = schoolId ? getAd(schoolId) : getRandomAd();
    fetch.then(data => {
      if (data && data.merchant_name) setAd(data);
    }).catch(() => {});
  }, [schoolId]);

  if (!ad) return null;

  return (
    <div className="mt-5 rounded-xl flex items-center gap-3 px-3.5 py-3"
      style={{ backgroundColor: '#FAF8FB', border: '1px solid #EEE7F4' }}>
      {ad.banner_image_url ? (
        <img src={ad.banner_image_url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#EFE7F5' }}>
          <span style={{ fontSize: 15 }}>🛍️</span>
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-wide uppercase mb-0.5" style={{ color: '#B8A6C9' }}>Sponsored</p>
        <p className="font-semibold text-sm truncate leading-tight" style={{ color: '#4A3560' }}>{ad.merchant_name}</p>
        {ad.message && <p className="text-xs truncate mt-0.5" style={{ color: '#8A7A99' }}>{ad.message}</p>}
      </div>
      {ad.target_link && (
        <a href={ad.target_link} target="_blank" rel="noopener noreferrer"
           className="ml-auto text-xs font-medium shrink-0 flex items-center gap-0.5"
           style={{ color: '#7B4F9B' }}>
          Visit
          <span aria-hidden>›</span>
        </a>
      )}
    </div>
  );
}

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
    <div className="mt-5 card p-3 flex items-center gap-3">
      {ad.banner_image_url && (
        <img src={ad.banner_image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: '#bbb' }}>Sponsored</p>
        <p className="font-semibold text-sm truncate" style={{ color: '#7B4F9B' }}>{ad.merchant_name}</p>
        {ad.message && <p className="text-xs truncate" style={{ color: '#888' }}>{ad.message}</p>}
      </div>
      {ad.target_link && (
        <a href={ad.target_link} target="_blank" rel="noopener noreferrer"
           className="ml-auto text-xs px-3 py-1.5 rounded-lg font-medium shrink-0"
           style={{ backgroundColor: 'rgba(123,79,155,0.08)', color: '#7B4F9B' }}>
          Visit
        </a>
      )}
    </div>
  );
}

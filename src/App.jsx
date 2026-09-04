import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import ParentPortal from './pages/ParentPortal.jsx';
import MerchantPortal from './pages/MerchantPortal.jsx';
import HelpPage from './pages/HelpPage.jsx';
import MarketPage from './pages/MarketPage.jsx';

export default function App() {
  const navigate = useNavigate();

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/parent" replace />} />
        <Route path="/parent" element={<ParentPortal />} />
        <Route path="/merchant" element={<MerchantPortal onBack={() => navigate('/parent')} phone={sessionStorage.getItem('parent_phone') || ''} />} />
        <Route path="/market" element={<MarketPage onBack={() => navigate('/parent')} />} />
        <Route path="/help" element={<HelpPage />} />
      </Routes>
    </>
  );
}

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ParentPortal from './pages/ParentPortal.jsx';
import MerchantPortal from './pages/MerchantPortal.jsx';
import HelpPage from './pages/HelpPage.jsx';

export default function App() {
  // Suppress the browser's native install banner entirely — users can still
  // install manually from the browser menu
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', e => e.preventDefault());
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/parent" replace />} />
        <Route path="/parent" element={<ParentPortal />} />
        <Route path="/merchant" element={<MerchantPortal />} />
        <Route path="/help" element={<HelpPage />} />
      </Routes>
    </>
  );
}

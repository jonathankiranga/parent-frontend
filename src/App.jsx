import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ParentPortal from './pages/ParentPortal.jsx';
import HelpPage from './pages/HelpPage.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';

export default function App() {
  return (
    <>
      <InstallPrompt />
      <Routes>
        <Route path="/" element={<Navigate to="/parent" replace />} />
        <Route path="/parent" element={<ParentPortal />} />
        <Route path="/help" element={<HelpPage />} />
      </Routes>
    </>
  );
}

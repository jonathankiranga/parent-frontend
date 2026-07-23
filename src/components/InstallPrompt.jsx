import React, { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-sm mx-auto bg-white p-4 rounded-xl shadow-lg border border-gray-200 z-50">
      <p className="text-sm mb-2">Install Education APP for offline access</p>
      <div className="flex gap-3">
        <button onClick={handleInstall} className="bg-school text-white px-4 py-2 rounded-lg text-sm flex-1">Install</button>
        <button onClick={() => setShow(false)} className="text-gray-500 px-4 py-2 rounded-lg text-sm">Not now</button>
      </div>
    </div>
  );
}

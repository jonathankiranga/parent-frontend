import React, { useEffect, useState } from 'react';

/**
 * PWA install button — renders as a small download icon in the navbar area.
 * No blocking banner. Tapping it triggers the native browser install prompt.
 * Disappears once the app is installed or the prompt is dismissed.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installed = () => setDeferredPrompt(null);
    window.addEventListener('appinstalled', installed);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } catch {
      // ignore
    }
  }

  if (!deferredPrompt) return null;

  return (
    <button
      onClick={handleInstall}
      title="Install app for offline use"
      aria-label="Install app for offline use"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: 8,
        border: '1.5px solid rgba(123,79,155,0.25)',
        backgroundColor: 'rgba(123,79,155,0.07)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(123,79,155,0.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(123,79,155,0.07)'; }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="#7B4F9B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v13" />
        <path d="M7 11l5 5 5-5" />
        <path d="M3 19h18" />
      </svg>
    </button>
  );
}

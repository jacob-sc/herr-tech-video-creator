import { useEffect, useState } from 'react';
import Head from 'next/head';

const DEFAULT_PLATFORM = 'https://world.herr.tech';
const ALLOWED_HOSTS = new Set(['staging.herr.tech', 'world.herr.tech', 'localhost']);
const LAST_REDIRECT_KEY = 'htvc-signin-redirect';
// Die Plattform schickt immer auf /projects zurück, /sso holt das echte Ziel hier ab.
const NEXT_KEY = 'htvc-signin-next';

function platformOrigin() {
  const match = document.cookie.match(/(?:^|;\s*)htvc-back=([^;]+)/);
  if (!match) return DEFAULT_PLATFORM;
  try {
    const u = new URL(decodeURIComponent(match[1]));
    if (ALLOWED_HOSTS.has(u.hostname) || u.hostname.endsWith('.vercel.app')) return u.origin;
  } catch { /* ignore */ }
  return DEFAULT_PLATFORM;
}

export default function Signin() {
  const [platform, setPlatform] = useState(DEFAULT_PLATFORM);
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    const origin = platformOrigin();
    setPlatform(origin);
    // Die Video-Creator-Seite der Plattform startet den SSO-Handshake von selbst.
    // Schlug der gerade erst fehl, nicht im Kreis schicken, sondern den Button zeigen.
    let last = 0;
    try { last = Number(sessionStorage.getItem(LAST_REDIRECT_KEY)) || 0; } catch { /* ignore */ }
    if (Date.now() - last < 60 * 1000) {
      setRedirecting(false);
      return;
    }
    try {
      sessionStorage.setItem(LAST_REDIRECT_KEY, String(Date.now()));
      const next = new URLSearchParams(window.location.search).get('next');
      if (next && next.startsWith('/') && !next.startsWith('//')) sessionStorage.setItem(NEXT_KEY, next);
    } catch { /* ignore */ }
    window.location.replace(`${origin}/dashboard/ki-toolbox/video-creator`);
  }, []);

  return (
    <>
      <Head><title>Anmelden · Herr Tech Video Creator</title></Head>
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: 460, padding: 32 }}>
          <img src="/herr-tech-logo.png" alt="HERR TECH" style={{ height: 22, marginBottom: 32, opacity: 0.9 }} />
          {redirecting ? (
            <p style={{ color: '#888', fontSize: 14 }}>Anmeldung über Herr Tech World läuft…</p>
          ) : (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 12px' }}>Anmeldung über Herr Tech World</h1>
              <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
                Der Video Creator nutzt deinen Herr Tech World-Login. Öffne die Plattform, gehe zur KI-Toolbox und klick auf „KI Video Creator".
              </p>
              <a href={`${platform}/dashboard/ki-toolbox`} style={{ display: 'inline-block', padding: '10px 20px', borderRadius: 9999, background: '#B598E2', color: '#000', fontSize: 13, fontWeight: 700 }}>
                Zu Herr Tech World →
              </a>
              <p style={{ color: '#444', fontSize: 11, marginTop: 20 }}>
                Interner Test? <a href="https://staging.herr.tech/dashboard/ki-toolbox" style={{ color: '#666', textDecoration: 'underline' }}>Staging öffnen</a>
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}

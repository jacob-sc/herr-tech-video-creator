/**
 * SSO-Landing. herrtechgpt redirected hierher mit Supabase-Tokens im
 * URL-Hash (#at=...&rt=...), damit die Tokens nicht in Server-Logs/Referrer
 * landen. Wir lesen sie client-seitig, posten an /api/auth/sso, und
 * navigieren dann zur eigentlichen Zielseite.
 *
 * Optional ?next=<path> für Redirect-Ziel (default: /projects).
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function SSOPage() {
  const router = useRouter();
  const [state, setState] = useState('working');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        if (!hash.startsWith('#')) throw new Error('Keine Tokens im URL-Hash');

        const params = new URLSearchParams(hash.slice(1));
        const access_token = params.get('at') || params.get('access_token');
        const refresh_token = params.get('rt') || params.get('refresh_token');
        const theme = params.get('theme'); // 'light' | 'dark'
        const back = params.get('back');   // Return-URL (staging/world/lokal)
        if (!access_token) throw new Error('access_token fehlt');

        const res = await fetch('/api/auth/sso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token, refresh_token }),
          credentials: 'include',
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `SSO fehlgeschlagen (${res.status})`);
        }

        // Theme-Cookie setzen (non-httpOnly, für Client-Read)
        if (theme === 'light' || theme === 'dark') {
          document.cookie = `htvc-theme=${theme}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax; Secure`;
          document.documentElement.setAttribute('data-theme', theme);
        }

        // Back-URL-Cookie setzen (non-httpOnly, für Client-Read im NavBar)
        if (back) {
          try {
            const u = new URL(back);
            // Nur erlaubte Hosts akzeptieren — verhindert Open-Redirect
            const allowedHosts = new Set(['staging.herr.tech', 'world.herr.tech', 'localhost']);
            if (allowedHosts.has(u.hostname) || u.hostname.endsWith('.vercel.app')) {
              document.cookie = `htvc-back=${encodeURIComponent(back)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure`;
            }
          } catch { /* ignore */ }
        }

        // Hash entfernen damit Tokens nicht im Browser-History verbleiben
        const next = new URLSearchParams(window.location.search).get('next') || '/projects';
        window.location.replace(next);
      } catch (e) {
        setError(e.message || String(e));
        setState('error');
      }
    })();
  }, [router]);

  return (
    <>
      <Head><title>Anmelden…</title></Head>
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: 24 }}>
          {state === 'working' && (
            <>
              <div style={{ width: 36, height: 36, border: '3px solid #B598E2', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ color: '#888', fontSize: 14 }}>Anmeldung läuft…</p>
            </>
          )}
          {state === 'error' && (
            <>
              <p style={{ color: '#ef4444', fontSize: 14, marginBottom: 16 }}>Anmeldung fehlgeschlagen: {error}</p>
              <a href="/auth/signin" style={{ color: '#B598E2', fontSize: 13 }}>Zur Anmeldeseite</a>
            </>
          )}
        </div>
        <style jsx global>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </main>
    </>
  );
}

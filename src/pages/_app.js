import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import '../app/globals.css';

const PUBLIC_PATHS = new Set(['/auth/signin', '/sso']);

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.has(router.pathname);
  const [checked, setChecked] = useState(isPublic);

  useEffect(() => {
    if (isPublic) { setChecked(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (cancelled) return;
        if (res.ok) {
          setChecked(true);
        } else {
          const next = encodeURIComponent(router.asPath);
          router.replace(`/auth/signin?next=${next}`);
        }
      } catch {
        if (!cancelled) setChecked(true); // Fehler nicht-blockierend, Seite zeigt eigene Error-States
      }
    })();
    return () => { cancelled = true; };
  }, [isPublic, router]);

  if (!checked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #B598E2', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <Component {...pageProps} />;
}

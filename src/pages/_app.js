import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import '../app/globals.css';
import { ThemeProvider } from '../lib/theme-context';
import { applyTheme, resolveInitialTheme } from '../lib/theme';

const PUBLIC_PATHS = new Set(['/auth/signin', '/sso']);

// Inline-Script das vor der Hydration laeuft und data-theme sofort
// setzt — verhindert Theme-Flash beim Laden.
const NO_FLASH = `
(function(){try{
  var m=document.cookie.match(/(?:^|;\\s*)htvc-theme=(light|dark)/);
  var t=m?m[1]:(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light':'dark');
  document.documentElement.setAttribute('data-theme', t);
}catch(e){}})();
`;

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.has(router.pathname);
  const [checked, setChecked] = useState(isPublic);

  useEffect(() => {
    // Theme so frueh wie moeglich setzen (zusaetzlich zum Inline-Script)
    applyTheme(resolveInitialTheme());
  }, []);

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
        if (!cancelled) setChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, [isPublic, router]);

  return (
    <ThemeProvider>
      <Head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </Head>
      {!checked ? (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <Component {...pageProps} />
      )}
    </ThemeProvider>
  );
}

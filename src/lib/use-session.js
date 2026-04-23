/**
 * Drop-in Ersatz für `useSession` / `signOut` aus next-auth/react.
 * Liest Session via /api/auth/me (Cookie-basiert).
 */

import { useEffect, useState } from 'react';

export function useSession() {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) {
          if (!cancelled) { setSession(null); setStatus('unauthenticated'); }
          return;
        }
        const data = await res.json();
        if (!cancelled) { setSession({ user: data.user }); setStatus('authenticated'); }
      } catch {
        if (!cancelled) { setSession(null); setStatus('unauthenticated'); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { data: session, status };
}

export async function signOut({ callbackUrl = '/auth/signin' } = {}) {
  try {
    await fetch('/api/auth/signout', { method: 'POST', credentials: 'include' });
  } catch {}
  if (typeof window !== 'undefined') {
    window.location.href = callbackUrl;
  }
}

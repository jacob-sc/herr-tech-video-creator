/**
 * SSO-Handshake: Browser postet Supabase-Tokens (von herrtechgpt),
 * Worker verifiziert und setzt HttpOnly-Cookies für die Worker-Domain.
 */

import { supabase } from '../../../lib/supabase';
import { setAuthCookies, createWorkerSession } from '../../../lib/api-auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Nur POST' });

  const { access_token } = req.body ?? {};
  if (!access_token || typeof access_token !== 'string') {
    return res.status(400).json({ error: 'access_token fehlt' });
  }

  const { data, error } = await supabase.auth.getUser(access_token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Token ungültig' });
  }

  // Den Refresh-Token der Plattform nie übernehmen (siehe createWorkerSession).
  // Klappt die eigene Session nicht, reicht der Access-Token für 1 h.
  const own = data.user.email ? await createWorkerSession(data.user.email) : null;
  if (own) {
    setAuthCookies(res, {
      accessToken: own.access_token,
      refreshToken: own.refresh_token,
      maxAge: own.expires_in,
    });
  } else {
    setAuthCookies(res, { accessToken: access_token, refreshToken: null });
  }

  return res.status(200).json({ ok: true, userId: data.user.id });
}

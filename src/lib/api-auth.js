/**
 * Auth für API-Routes via Supabase-JWT.
 *
 * Zwei Quellen werden akzeptiert:
 *  1) Authorization: Bearer <token>  — für Proxy-Requests aus herrtechgpt
 *  2) Cookie `sb-at`                  — für Browser-Requests auf vc.herr.tech
 *     (gesetzt über den SSO-Flow, siehe /api/auth/sso + /sso-Page)
 *
 * Rückgabe-Shape bleibt identisch zur vorherigen Version:
 *   const { session, ownerId } = await requireAuth(req, res);
 *   if (!session) return; // 401 bereits gesendet
 */

const { supabase } = require('./supabase');

const AT_COOKIE = 'sb-at';
const RT_COOKIE = 'sb-rt';

function parseCookie(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

function serializeCookie(name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.maxAge != null) parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite[0].toUpperCase() + opts.sameSite.slice(1)}`);
  if (opts.secure) parts.push('Secure');
  if (opts.httpOnly) parts.push('HttpOnly');
  return parts.join('; ');
}

function extractBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

function extractCookieToken(req) {
  const raw = req.headers?.cookie;
  if (!raw || typeof raw !== 'string') return null;
  const cookies = parseCookie(raw);
  return cookies[AT_COOKIE] || null;
}

function extractRefreshToken(req) {
  const raw = req.headers?.cookie;
  if (!raw || typeof raw !== 'string') return null;
  const cookies = parseCookie(raw);
  return cookies[RT_COOKIE] || null;
}

async function requireAuth(req, res) {
  let token = extractBearerToken(req) || extractCookieToken(req);
  const refreshToken = extractRefreshToken(req);
  // Kurzer Request-Kontext für die Logs — hilft, das Rausfliegen zuzuordnen.
  const ctx = `path=${req.url ?? '?'} hasAT=${!!token} hasRT=${!!refreshToken}`;

  // Kein Access-Token mehr, aber ein Refresh-Token da → Session refreshen,
  // neue Cookies setzen, mit dem frischen Access-Token weitermachen.
  if (!token && refreshToken) {
    const refreshed = await tryRefresh(refreshToken);
    if (refreshed) {
      setAuthCookies(res, {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token || refreshToken,
        maxAge: refreshed.expires_in ?? 60 * 60,
      });
      token = refreshed.access_token;
      console.info(`[auth] refreshed via RT (AT was missing) ${ctx}`);
    }
  }

  if (!token) {
    console.warn(`[auth] 401 no usable token ${ctx}`);
    res.status(401).json({ error: 'Nicht autorisiert (kein Token)' });
    return { session: null, ownerId: null };
  }

  let { data, error } = await supabase.auth.getUser(token);

  // Access-Token ist zwar da, aber expired/ungültig — einmal via Refresh retry.
  if ((error || !data?.user) && refreshToken) {
    console.info(`[auth] AT invalid, retrying via RT ${ctx}`);
    const refreshed = await tryRefresh(refreshToken);
    if (refreshed) {
      setAuthCookies(res, {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token || refreshToken,
        maxAge: refreshed.expires_in ?? 60 * 60,
      });
      ({ data, error } = await supabase.auth.getUser(refreshed.access_token));
    }
  }

  if (error || !data?.user) {
    console.warn(`[auth] 401 token unusable after refresh ${ctx} getUserErr=${error?.message ?? 'none'}`);
    res.status(401).json({ error: 'Nicht autorisiert (Token ungültig)' });
    return { session: null, ownerId: null };
  }

  const user = data.user;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, access_tier')
    .eq('id', user.id)
    .maybeSingle();

  const session = {
    user: {
      id: user.id,
      email: user.email ?? null,
      role: profile?.role ?? 'user',
      accessTier: profile?.access_tier ?? 'basic',
    },
  };

  return { session, ownerId: user.id };
}

function isAdmin(session) {
  return session?.user?.role === 'admin';
}

/**
 * Versucht mit dem Refresh-Token eine neue Session zu holen.
 * Gibt bei Erfolg { access_token, refresh_token, expires_in } zurück, sonst null.
 */
async function tryRefresh(refreshToken) {
  try {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data?.session?.access_token) {
      // Diagnose: Warum schlug der Refresh fehl? (Reuse-Detection liefert
      // typischerweise status 400 + "Invalid Refresh Token: Already Used".)
      console.warn(
        `[auth] refresh failed status=${error?.status ?? '?'} code=${error?.code ?? '?'} msg=${error?.message ?? 'no session in response'}`,
      );
      return null;
    }
    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
    };
  } catch (e) {
    console.warn(`[auth] refresh threw: ${e?.message ?? e}`);
    return null;
  }
}

function requirePremium(session) {
  if (!session) return false;
  if (session.user.role === 'admin') return true;
  return session.user.accessTier === 'premium';
}

/**
 * Session-Cookies für den Browser setzen. Wird nach erfolgreichem SSO gerufen.
 * HttpOnly, Secure (HTTPS-only), SameSite=Lax für Redirect-Kompatibilität.
 */
function setAuthCookies(res, { accessToken, refreshToken, maxAge }) {
  const cookies = [
    serializeCookie(AT_COOKIE, accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: maxAge ?? 60 * 60, // 1h, matches Supabase access-token lifetime
    }),
  ];
  if (refreshToken) {
    cookies.push(
      serializeCookie(RT_COOKIE, refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 Tage
      }),
    );
  }
  res.setHeader('Set-Cookie', cookies);
}

function clearAuthCookies(res) {
  const expired = { path: '/', expires: new Date(0), httpOnly: true, secure: true, sameSite: 'lax' };
  res.setHeader('Set-Cookie', [
    serializeCookie(AT_COOKIE, '', expired),
    serializeCookie(RT_COOKIE, '', expired),
  ]);
}

module.exports = {
  requireAuth,
  isAdmin,
  requirePremium,
  setAuthCookies,
  clearAuthCookies,
  extractRefreshToken,
  AT_COOKIE,
  RT_COOKIE,
};

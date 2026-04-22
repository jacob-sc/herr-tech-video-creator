/**
 * Auth für API-Routes via Supabase-JWT.
 *
 * Das Frontend (herrtechgpt auf Vercel) holt den aktuellen Access-Token
 * aus der Supabase-Session und schickt ihn im `Authorization: Bearer …`-
 * Header mit. Hier validieren wir ihn gegen Supabase Auth und holen
 * zusätzlich die Rolle aus `profiles.role`.
 *
 * Rückgabe identisch zur alten NextAuth-Version, damit alle bestehenden
 * API-Routen ohne Änderung weiterlaufen:
 *   const { session, ownerId } = await requireAuth(req, res);
 *   if (!session) return; // 401 bereits gesendet
 */

const { supabase } = require('./supabase');

function extractBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

async function requireAuth(req, res) {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Nicht autorisiert (kein Token)' });
    return { session: null, ownerId: null };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: 'Nicht autorisiert (Token ungültig)' });
    return { session: null, ownerId: null };
  }

  const user = data.user;

  // Rolle aus profiles (Single Source of Truth in herrtechgpt)
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
 * Für Premium-only-Endpoints. Admin umgeht die Tier-Prüfung automatisch.
 */
function requirePremium(session) {
  if (!session) return false;
  if (session.user.role === 'admin') return true;
  return session.user.accessTier === 'premium';
}

module.exports = { requireAuth, isAdmin, requirePremium };

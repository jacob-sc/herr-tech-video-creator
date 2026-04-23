/**
 * Liefert eine Map userId → { email, fullName } fuer gegebene Supabase-User-IDs.
 *
 * Wichtig: Die `profiles`-Tabelle enthaelt KEIN `email`/`full_name` — das lebt
 * ausschliesslich in `auth.users`. Deshalb geht der Lookup ueber die Supabase-
 * Admin-API (`supabase.auth.admin.getUserById`), die mit dem service_role-Key
 * Zugriff auf die auth-Tabelle hat.
 *
 * Parallelisiert, damit der Admin-Bereich nicht linear mit der Nutzer-Anzahl
 * langsam wird. Fehler werden pro User geschluckt.
 */

const { supabase } = require('./supabase');

async function fetchUserInfoMap(userIds) {
  const unique = [...new Set((userIds || []).filter(Boolean))];
  if (unique.length === 0) return new Map();

  const results = await Promise.all(
    unique.map(async (id) => {
      try {
        const { data, error } = await supabase.auth.admin.getUserById(id);
        if (error || !data?.user) return [id, null];
        const u = data.user;
        const fullName =
          u.user_metadata?.full_name ||
          u.user_metadata?.name ||
          null;
        return [id, { email: u.email ?? null, fullName }];
      } catch {
        return [id, null];
      }
    })
  );

  const map = new Map();
  for (const [id, info] of results) {
    if (info) map.set(id, info);
  }
  return map;
}

module.exports = { fetchUserInfoMap };

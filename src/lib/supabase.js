/**
 * Supabase-Client für den Video-Creator-Worker.
 * Nutzt den Service-Role-Key — der Worker läuft serverseitig auf Hetzner
 * und braucht volle DB-/Storage-Rechte. Auth-Prüfung passiert pro Request
 * via JWT-Validation (siehe api-auth.js).
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein',
  );
}

const globalForSupabase = globalThis;

const supabase =
  globalForSupabase.__supabaseAdmin ??
  createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.__supabaseAdmin = supabase;
}

module.exports = { supabase };

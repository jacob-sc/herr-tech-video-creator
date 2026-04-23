/**
 * Gibt die aktuelle Session zurück (oder 401). Wird vom Worker-Frontend
 * beim Seiten-Mount gerufen, um User-Email / Admin-Flag zu bekommen.
 */

import { requireAuth } from '../../../lib/api-auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Nur GET' });

  const { session } = await requireAuth(req, res);
  if (!session) return; // 401 bereits gesendet

  return res.status(200).json({
    user: session.user,
  });
}

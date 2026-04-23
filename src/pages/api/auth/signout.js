import { clearAuthCookies } from '../../../lib/api-auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Nur POST' });
  clearAuthCookies(res);
  return res.status(200).json({ ok: true });
}

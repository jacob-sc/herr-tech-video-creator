import fs from 'fs';
import path from 'path';
import { PROJECTS_DIR } from '../../../lib/project';
import { requireAuth, isAdmin } from '../../../lib/api-auth';
import { fetchUserInfoMap } from '../../../lib/user-lookup';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Nur GET' });

  const { session, ownerId } = await requireAuth(req, res);
  if (!session) return;

  if (!fs.existsSync(PROJECTS_DIR)) return res.status(200).json({ projects: [] });

  const dirs = fs.readdirSync(PROJECTS_DIR).filter(d => {
    const jsonPath = path.join(PROJECTS_DIR, d, 'project.json');
    return fs.existsSync(jsonPath);
  });

  const adminView = isAdmin(session);

  const projects = dirs
    .map(d => {
      try {
        const raw = fs.readFileSync(path.join(PROJECTS_DIR, d, 'project.json'), 'utf-8');
        return JSON.parse(raw);
      } catch { return null; }
    })
    .filter(Boolean)
    // Jeder User sieht nur seine eigenen Projekte; Admin sieht alle
    .filter(p => adminView || p.ownerId === ownerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Für Admins: Owner-Email/Name aus auth.users nachladen (in profiles gibt's das nicht)
  if (adminView) {
    const ownerIds = projects.map(p => p.ownerId).filter(Boolean);
    const infoMap = await fetchUserInfoMap(ownerIds);

    const enriched = projects.map(p => {
      const info = infoMap.get(p.ownerId);
      return {
        ...p,
        ownerEmail: info?.email ?? null,
        ownerName: info?.fullName ?? null,
      };
    });
    return res.status(200).json({ projects: enriched });
  }

  return res.status(200).json({ projects });
}

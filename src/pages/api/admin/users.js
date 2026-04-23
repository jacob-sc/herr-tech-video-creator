/**
 * User-Liste für Admin-Übersicht. Verschmilzt profiles + video_creator_stats
 * + Projekt-Anzahl aus dem Dateisystem zu einer Zeile pro User.
 *
 * Sortiert absteigend nach Projekt-Anzahl, dann nach Bild-Generierungen.
 */

import fs from 'fs';
import path from 'path';
import { PROJECTS_DIR } from '../../../lib/project';
import { requireAuth, isAdmin } from '../../../lib/api-auth';
import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Nur GET' });

  const { session } = await requireAuth(req, res);
  if (!session) return;
  if (!isAdmin(session)) return res.status(403).json({ error: 'Nicht erlaubt' });

  // 1) Projekt-Histogramm vom Dateisystem
  const ownerProjects = new Map(); // ownerId → { count, latest, titles: [] }
  if (fs.existsSync(PROJECTS_DIR)) {
    const dirs = fs.readdirSync(PROJECTS_DIR);
    for (const d of dirs) {
      const jsonPath = path.join(PROJECTS_DIR, d, 'project.json');
      if (!fs.existsSync(jsonPath)) continue;
      try {
        const p = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        if (!p.ownerId) continue;
        const entry = ownerProjects.get(p.ownerId) || { count: 0, latest: null, titles: [] };
        entry.count += 1;
        const created = p.createdAt ? new Date(p.createdAt).getTime() : 0;
        if (!entry.latest || created > entry.latest) entry.latest = created;
        if (entry.titles.length < 3 && p.title) entry.titles.push(p.title);
        ownerProjects.set(p.ownerId, entry);
      } catch {}
    }
  }

  // 2) Profiles (alle) — ohne Limit, damit Admin alle sieht
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, access_tier, created_at');
  if (pErr) {
    return res.status(500).json({ error: 'Konnte Profiles nicht laden', detail: pErr.message });
  }

  // 3) Stats
  let statsByUser = new Map();
  try {
    const { data: stats } = await supabase
      .from('video_creator_stats')
      .select('user_id, projects_created, images_generated, videos_generated, updated_at');
    if (stats) {
      for (const s of stats) statsByUser.set(s.user_id, s);
    }
  } catch {}

  const users = (profiles ?? []).map(p => {
    const stats = statsByUser.get(p.id) || {};
    const fs = ownerProjects.get(p.id) || { count: 0, latest: null, titles: [] };
    return {
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      role: p.role ?? 'user',
      accessTier: p.access_tier ?? 'basic',
      createdAt: p.created_at,
      projectsOnDisk: fs.count,
      latestProjectAt: fs.latest ? new Date(fs.latest).toISOString() : null,
      sampleTitles: fs.titles,
      imagesGenerated: stats.images_generated ?? 0,
      videosGenerated: stats.videos_generated ?? 0,
      projectsCreatedLogged: stats.projects_created ?? 0,
      lastStatUpdateAt: stats.updated_at ?? null,
    };
  });

  users.sort((a, b) => {
    if (b.projectsOnDisk !== a.projectsOnDisk) return b.projectsOnDisk - a.projectsOnDisk;
    if (b.imagesGenerated !== a.imagesGenerated) return b.imagesGenerated - a.imagesGenerated;
    return (b.videosGenerated ?? 0) - (a.videosGenerated ?? 0);
  });

  return res.status(200).json({ users });
}

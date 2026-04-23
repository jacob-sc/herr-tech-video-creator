/**
 * Aggregierte Stats für den Admin-Bereich auf vc.herr.tech.
 * Nur für Admin-User (role=admin in profiles). Non-Admin → 403.
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

  // 1) Projekt-Count + Owner-Histogramm aus dem Dateisystem.
  let totalProjects = 0;
  const ownerCount = new Map();
  let projectsWithScenes = 0;
  let totalScenes = 0;

  if (fs.existsSync(PROJECTS_DIR)) {
    const dirs = fs.readdirSync(PROJECTS_DIR);
    for (const d of dirs) {
      const jsonPath = path.join(PROJECTS_DIR, d, 'project.json');
      if (!fs.existsSync(jsonPath)) continue;
      try {
        const p = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        totalProjects += 1;
        if (p.ownerId) ownerCount.set(p.ownerId, (ownerCount.get(p.ownerId) || 0) + 1);
        if (Array.isArray(p.scenes) && p.scenes.length > 0) {
          projectsWithScenes += 1;
          totalScenes += p.scenes.length;
        }
      } catch {
        // korruptes JSON einfach überspringen
      }
    }
  }

  // 2) User- und Bild/Video-Stats aus Supabase.
  const { data: profilesRows } = await supabase
    .from('profiles')
    .select('id, role, access_tier');
  const totalUsers = profilesRows?.length ?? 0;
  const totalAdmins = profilesRows?.filter(p => p.role === 'admin').length ?? 0;
  const totalPremium = profilesRows?.filter(p => p.access_tier === 'premium').length ?? 0;

  let imagesGenerated = 0;
  let videosGenerated = 0;
  let projectsCreatedLogged = 0;
  try {
    const { data: stats } = await supabase
      .from('video_creator_stats')
      .select('projects_created, images_generated, videos_generated');
    if (stats) {
      for (const s of stats) {
        imagesGenerated += s.images_generated ?? 0;
        videosGenerated += s.videos_generated ?? 0;
        projectsCreatedLogged += s.projects_created ?? 0;
      }
    }
  } catch {
    // Tabelle evtl. noch nicht angelegt — nicht fatal
  }

  return res.status(200).json({
    users: {
      total: totalUsers,
      admins: totalAdmins,
      premium: totalPremium,
      active: ownerCount.size, // User mit mindestens einem Projekt
    },
    projects: {
      total: totalProjects,
      withScenes: projectsWithScenes,
      totalScenes,
      loggedCreations: projectsCreatedLogged,
    },
    generation: {
      images: imagesGenerated,
      videos: videosGenerated,
    },
  });
}

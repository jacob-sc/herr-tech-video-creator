/**
 * Einzelner User inkl. aller seiner Projekte. Admin-only.
 */

import fs from 'fs';
import path from 'path';
import { PROJECTS_DIR } from '../../../../lib/project';
import { requireAuth, isAdmin } from '../../../../lib/api-auth';
import { supabase } from '../../../../lib/supabase';
import { fetchUserInfoMap } from '../../../../lib/user-lookup';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Nur GET' });

  const { session } = await requireAuth(req, res);
  if (!session) return;
  if (!isAdmin(session)) return res.status(403).json({ error: 'Nicht erlaubt' });

  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Ungültige ID' });

  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('id, role, access_tier, created_at, background, market, target_audience, offer')
    .eq('id', id)
    .maybeSingle();
  if (pErr) return res.status(500).json({ error: pErr.message });
  if (!profile) return res.status(404).json({ error: 'User nicht gefunden' });

  const infoMap = await fetchUserInfoMap([id]);
  const info = infoMap.get(id) || { email: null, fullName: null };

  let stats = {};
  try {
    const { data: s } = await supabase
      .from('video_creator_stats')
      .select('projects_created, images_generated, videos_generated, updated_at')
      .eq('user_id', id)
      .maybeSingle();
    if (s) stats = s;
  } catch {}

  // Projekte des Users aus dem Dateisystem
  const projects = [];
  if (fs.existsSync(PROJECTS_DIR)) {
    for (const d of fs.readdirSync(PROJECTS_DIR)) {
      const jsonPath = path.join(PROJECTS_DIR, d, 'project.json');
      if (!fs.existsSync(jsonPath)) continue;
      try {
        const p = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        if (p.ownerId !== id) continue;
        const sceneCount = Array.isArray(p.scenes) ? p.scenes.length : 0;
        const withImage = Array.isArray(p.scenes)
          ? p.scenes.filter(s => s.activeImage || s.generatedImage).length
          : 0;
        const withVideo = Array.isArray(p.scenes)
          ? p.scenes.filter(s => s.activeVideo || s.generatedVideo).length
          : 0;
        projects.push({
          id: p.id,
          title: p.title || 'Ohne Titel',
          createdAt: p.createdAt || null,
          status: p.status || null,
          sceneCount,
          withImage,
          withVideo,
        });
      } catch {}
    }
  }
  projects.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return res.status(200).json({
    user: {
      id: profile.id,
      email: info.email,
      fullName: info.fullName,
      role: profile.role ?? 'user',
      accessTier: profile.access_tier ?? 'basic',
      createdAt: profile.created_at,
      background: profile.background,
      market: profile.market,
      targetAudience: profile.target_audience,
      offer: profile.offer,
      projectsCreated: stats.projects_created ?? 0,
      imagesGenerated: stats.images_generated ?? 0,
      videosGenerated: stats.videos_generated ?? 0,
      lastStatUpdateAt: stats.updated_at ?? null,
    },
    projects,
  });
}

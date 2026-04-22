/**
 * User-Statistik-Counter (projectsCreated, imagesGenerated, videosGenerated).
 *
 * Ursprünglich via Prisma auf die User-Tabelle geschrieben. Mit der
 * Migration zu Supabase wandert der Counter in die Tabelle
 * `video_creator_stats` (user_id UUID PRIMARY KEY, ...). Diese Tabelle
 * wird in einer separaten Supabase-Migration angelegt.
 *
 * Aktuell: No-Op-Stub damit die API-Routes weiterlaufen ohne zu brechen.
 * Fehler werden geschluckt, damit Stats niemals den Haupt-Request scheitern
 * lassen (exakt wie vorher bei Prisma mit `.catch(() => {})`).
 */

const { supabase } = require('./supabase');

const FIELD_MAP = {
  project: 'projects_created',
  image: 'images_generated',
  video: 'videos_generated',
};

async function incrementStat(userId, kind) {
  if (!userId) return;
  const field = FIELD_MAP[kind];
  if (!field) return;

  try {
    // Nutzt eine Postgres-RPC-Funktion `video_creator_increment_stat`
    // (wird in Supabase-Migration angelegt). Atomic, idempotent, RLS-kompatibel.
    await supabase.rpc('video_creator_increment_stat', {
      p_user_id: userId,
      p_field: field,
    });
  } catch {
    // Stats dürfen niemals den Haupt-Flow kaputt machen
  }
}

module.exports = {
  incrementProjectsCreated: (userId) => incrementStat(userId, 'project'),
  incrementImagesGenerated: (userId) => incrementStat(userId, 'image'),
  incrementVideosGenerated: (userId) => incrementStat(userId, 'video'),
};

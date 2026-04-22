import { createProject } from '../../../lib/project';
import { requireAuth } from '../../../lib/api-auth';
import { incrementProjectsCreated } from '../../../lib/user-stats';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Nur POST' });
  const { session, ownerId } = await requireAuth(req, res);
  if (!session) return;

  const project = createProject(ownerId);
  await incrementProjectsCreated(ownerId);

  return res.status(200).json({ projectId: project.id });
}

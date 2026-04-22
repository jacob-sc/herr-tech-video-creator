require('../../lib/load-env');

function maskOrMissing(val) {
  if (!val) return 'NICHT GESETZT';
  return `${val.slice(0, 8)}... OK`;
}

export default function handler(req, res) {
  res.json({
    anthropic: maskOrMissing(process.env.ANTHROPIC_API_KEY),
    openai: maskOrMissing(process.env.OPENAI_API_KEY),
    fal: maskOrMissing(process.env.FAL_API_KEY || process.env.FAL_KEY),
    googleApi: maskOrMissing(process.env.GOOGLE_API_KEY),
    googleProject: process.env.GOOGLE_CLOUD_PROJECT ?? 'NICHT GESETZT',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'OK' : 'NICHT GESETZT',
    supabaseServiceRole: maskOrMissing(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}

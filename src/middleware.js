/**
 * CORS-Middleware für den Worker.
 * Das Frontend läuft auf Vercel (andere Origin), der Worker auf Hetzner —
 * Browser-Requests brauchen CORS-Header.
 *
 * Erlaubt nur Origins aus der ALLOWED_ORIGINS-env (komma-getrennt).
 * Preflight (OPTIONS) wird direkt mit 204 beantwortet.
 */

import { NextResponse } from 'next/server';

export function middleware(req) {
  const origin = req.headers.get('origin') ?? '';
  const allowed = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const isAllowed = allowed.includes(origin) || allowed.includes('*');

  // Preflight direkt beantworten
  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 });
    if (isAllowed) applyCors(res, origin);
    return res;
  }

  const res = NextResponse.next();
  if (isAllowed) applyCors(res, origin);
  return res;
}

function applyCors(res, origin) {
  res.headers.set('Access-Control-Allow-Origin', origin);
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  res.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  );
  res.headers.set(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, X-Requested-With',
  );
  res.headers.set('Access-Control-Max-Age', '86400');
  res.headers.set('Vary', 'Origin');
}

// Nur auf /api/* anwenden — es gibt eh keine anderen Routes mehr.
export const config = {
  matcher: ['/api/:path*'],
};

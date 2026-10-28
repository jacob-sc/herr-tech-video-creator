// Regressionstest Kontowechsel: A war im Worker, B meldet sich per SSO an,
// die eigene Worker-Session für B schlägt fehl. Nach Ablauf von B's
// Access-Token darf der Worker NIE wieder A anmelden. Supabase ist gemockt.
// Aufruf: npm run auth:test
const Module = require('module');
const path = require('path');
const os = require('os');
const esbuild = require('esbuild');

const repo = path.join(__dirname, '..');
const out = path.join(os.tmpdir(), `htvc-sso-bundle-${process.pid}.cjs`);
esbuild.buildSync({
  entryPoints: [path.join(repo, 'src/pages/api/auth/sso.js')],
  bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'error',
  external: ['@supabase/supabase-js'],
});

const calls = [];
const fakeSupabase = {
  auth: {
    getUser: async (token) => {
      if (token === 'AT_B') return { data: { user: { id: 'B', email: 'b@test' } } };
      if (token === 'AT_A2') return { data: { user: { id: 'A', email: 'a@test' } } };
      return { data: null, error: { message: 'invalid' } };
    },
    refreshSession: async ({ refresh_token }) => {
      calls.push(refresh_token);
      return refresh_token === 'RT_A'
        ? { data: { session: { access_token: 'AT_A2', refresh_token: 'RT_A2', expires_in: 3600 } } }
        : { data: null, error: { message: 'invalid' } };
    },
    verifyOtp: async () => ({ data: null, error: { message: 'simulierter Ausfall' } }),
    admin: { generateLink: async () => ({ data: null, error: { message: 'simulierter Ausfall' } }) },
  },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
};
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  if (req === '@supabase/supabase-js') return { createClient: () => fakeSupabase };
  return origLoad.call(this, req, ...rest);
};
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://fake';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake';
console.warn = () => {};
console.info = () => {};

const handler = require(out).default;
require('fs').unlinkSync(out);
const { requireAuth } = require(path.join(repo, 'src/lib/api-auth.js'));

function applySetCookie(jar, headers) {
  for (const c of [].concat(headers || [])) {
    const [pair, ...attrs] = c.split(';').map((s) => s.trim());
    const name = pair.slice(0, pair.indexOf('='));
    const value = decodeURIComponent(pair.slice(pair.indexOf('=') + 1));
    const expired = attrs.some((a) => /^Expires=Thu, 01 Jan 1970/i.test(a)) || attrs.some((a) => a === 'Max-Age=0');
    if (expired || value === '') delete jar[name]; else jar[name] = value;
  }
}
const cookieHeader = (jar) => Object.entries(jar).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ');
function mockRes() {
  const r = { headers: {}, statusCode: 200, body: null };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (s) => { r.statusCode = s; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}

(async () => {
  const jar = { 'sb-at': 'AT_A', 'sb-wrt': 'RT_A' };

  const res1 = mockRes();
  await handler({ method: 'POST', body: { access_token: 'AT_B' }, headers: { cookie: cookieHeader(jar) } }, res1);
  applySetCookie(jar, res1.headers['Set-Cookie']);
  console.log('SSO als B:', res1.statusCode, '| Cookies danach:', Object.keys(jar).join(', ') || '(keine)');

  delete jar['sb-at']; // B's Access-Token ist abgelaufen
  const res2 = mockRes();
  const { session } = await requireAuth({ url: '/api/projects/list', headers: { cookie: cookieHeader(jar) } }, res2);
  const leak = session?.user?.id === 'A' || calls.includes('RT_A');
  console.log('Nach Ablauf:', session ? `angemeldet als ${session.user.id}` : `nicht angemeldet (${res2.statusCode})`, '| Refresh mit A-Token versucht:', calls.includes('RT_A'));
  console.log(leak ? 'FEHLER: A wird wieder angemeldet' : 'OK: A wird nicht wieder angemeldet');
  process.exit(leak ? 1 : 0);
})();

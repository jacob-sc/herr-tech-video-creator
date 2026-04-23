import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import NavBar from '../../components/NavBar';
import { T } from '../../lib/theme';
import { useSession } from '../../lib/use-session';

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.replace('/auth/signin?next=/admin'); return; }
    if (session.user.role !== 'admin') { router.replace('/projects'); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [sRes, uRes] = await Promise.all([
          fetch('/api/admin/stats', { credentials: 'include' }),
          fetch('/api/admin/users', { credentials: 'include' }),
        ]);
        if (!sRes.ok) throw new Error(`stats ${sRes.status}`);
        if (!uRes.ok) throw new Error(`users ${uRes.status}`);
        const sJson = await sRes.json();
        const uJson = await uRes.json();
        if (!cancelled) { setStats(sJson); setUsers(uJson.users || []); }
      } catch (e) {
        if (!cancelled) setErr(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session, status]);

  return (
    <>
      <Head><title>Admin — Video Creator</title></Head>
      <div style={{ minHeight:'100vh', background:T.bg, color:T.text }}>
        <NavBar />

        <div style={{ maxWidth:1200, margin:'0 auto', padding:'32px 24px 80px' }}>
          <div style={{ marginBottom:24 }}>
            <h1 style={{ fontSize:32, fontWeight:900, margin:'0 0 6px', letterSpacing:'-0.5px', color:T.text }}>
              Admin — Video Creator
            </h1>
            <p style={{ color:T.muted, fontSize:14, margin:0 }}>
              Übersicht über alle Nutzer, Projekte und KI-Generierungen auf diesem Worker.
            </p>
          </div>

          {err && (
            <div style={{ background:T.redBg, border:`1px solid ${T.redBrd}`, borderRadius:10, padding:'10px 14px', color:T.red, marginBottom:16, fontSize:13 }}>
              ⚠ {err}
            </div>
          )}

          {/* Stats-Kacheln */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12, marginBottom:28 }}>
            <StatCard label="Nutzer gesamt" value={stats?.users?.total} />
            <StatCard label="Aktiv (≥1 Projekt)" value={stats?.users?.active} hint={`von ${stats?.users?.total ?? '–'}`} />
            <StatCard label="Premium" value={stats?.users?.premium} />
            <StatCard label="Admins" value={stats?.users?.admins} />
            <StatCard label="Projekte gesamt" value={stats?.projects?.total} accent />
            <StatCard label="Mit Szenen" value={stats?.projects?.withScenes} hint={`${stats?.projects?.totalScenes ?? 0} Szenen`} />
            <StatCard label="Bilder generiert" value={stats?.generation?.images} accent />
            <StatCard label="Videos generiert" value={stats?.generation?.videos} accent />
          </div>

          {/* User-Tabelle */}
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              <div style={{ fontSize:15, fontWeight:800, color:T.text }}>
                Alle Nutzer ({users.length})
              </div>
              <div style={{ fontSize:11, color:T.muted }}>
                Sortiert nach Anzahl Projekte
              </div>
            </div>

            {loading ? (
              <div style={{ padding:40, textAlign:'center', color:T.muted, fontSize:13 }}>
                Lädt…
              </div>
            ) : users.length === 0 ? (
              <div style={{ padding:40, textAlign:'center', color:T.muted, fontSize:13 }}>
                Keine Nutzer gefunden.
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:T.subtle }}>
                      <Th>Nutzer</Th>
                      <Th>Rolle</Th>
                      <Th align="right">Projekte</Th>
                      <Th align="right">Bilder</Th>
                      <Th align="right">Videos</Th>
                      <Th>Letzte Aktivität</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => <UserRow key={u.id} u={u} />)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, hint, accent }) {
  return (
    <div style={{
      background: accent ? T.accentBg : T.card,
      border: `1px solid ${accent ? T.accentBrd : T.border}`,
      borderRadius: 14,
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: 26, fontWeight: 900, color: accent ? T.accent : T.text, lineHeight:1, letterSpacing:'-0.5px' }}>
        {value ?? '–'}
      </div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 6, fontWeight: 600, textTransform:'uppercase', letterSpacing:0.4 }}>
        {label}
      </div>
      {hint && (
        <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function Th({ children, align = 'left' }) {
  return (
    <th style={{
      padding: '10px 14px',
      textAlign: align,
      color: T.muted,
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      borderBottom: `1px solid ${T.border}`,
      whiteSpace: 'nowrap',
    }}>{children}</th>
  );
}

function UserRow({ u }) {
  const cell = { padding:'10px 14px', borderBottom:`1px solid ${T.border}`, whiteSpace:'nowrap' };
  const isAdminRow = u.role === 'admin';
  return (
    <tr
      onClick={() => { window.location.href = `/admin/users/${u.id}`; }}
      onMouseEnter={e => e.currentTarget.style.background = T.subtle}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      style={{ cursor:'pointer', transition:'background .15s' }}>
      <td style={cell}>
        <div style={{ display:'flex', flexDirection:'column' }}>
          <span style={{ color:T.text, fontWeight:600 }}>{u.email || '—'}</span>
          {u.fullName && <span style={{ color:T.muted, fontSize:11 }}>{u.fullName}</span>}
        </div>
      </td>
      <td style={cell}>
        <span style={{
          display:'inline-flex', alignItems:'center', gap:4,
          padding:'2px 8px', borderRadius:9999, fontSize:11, fontWeight:700,
          background: isAdminRow ? T.accentBg : T.subtle,
          color: isAdminRow ? T.accent : T.muted,
          border: `1px solid ${isAdminRow ? T.accentBrd : T.border}`,
        }}>
          {u.role}{u.accessTier && u.accessTier !== 'basic' ? ` · ${u.accessTier}` : ''}
        </span>
      </td>
      <td style={{ ...cell, textAlign:'right', fontVariantNumeric:'tabular-nums', color: u.projectsOnDisk > 0 ? T.text : T.muted, fontWeight:700 }}>
        {u.projectsOnDisk}
      </td>
      <td style={{ ...cell, textAlign:'right', fontVariantNumeric:'tabular-nums', color: u.imagesGenerated > 0 ? T.text : T.muted }}>
        {u.imagesGenerated}
      </td>
      <td style={{ ...cell, textAlign:'right', fontVariantNumeric:'tabular-nums', color: u.videosGenerated > 0 ? T.text : T.muted }}>
        {u.videosGenerated}
      </td>
      <td style={{ ...cell, color:T.muted, fontSize:12 }}>
        {formatDate(u.latestProjectAt || u.lastStatUpdateAt)}
      </td>
    </tr>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  } catch {
    return '—';
  }
}

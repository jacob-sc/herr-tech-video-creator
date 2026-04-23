import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import NavBar from '../../../components/NavBar';
import { T } from '../../../lib/theme';
import { useSession } from '../../../lib/use-session';

export default function AdminUserDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.replace('/auth/signin?next=/admin'); return; }
    if (session.user.role !== 'admin') { router.replace('/projects'); return; }
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/users/${id}`, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setErr(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session, status, id]);

  const user = data?.user;
  const projects = data?.projects || [];
  const isAdminRow = user?.role === 'admin';

  return (
    <>
      <Head><title>{user?.email || 'User'} — Admin</title></Head>
      <div style={{ minHeight:'100vh', background:T.bg, color:T.text }}>
        <NavBar />

        <div style={{ maxWidth:1100, margin:'0 auto', padding:'32px 24px 80px' }}>
          <button
            onClick={() => router.push('/admin')}
            style={{ background:'transparent', border:`1px solid ${T.border}`, borderRadius:9999, color:T.muted, fontSize:12, fontWeight:600, padding:'6px 14px', cursor:'pointer', marginBottom:20 }}>
            ← Zurück zur Admin-Übersicht
          </button>

          {err && (
            <div style={{ background:T.redBg, border:`1px solid ${T.redBrd}`, borderRadius:10, padding:'10px 14px', color:T.red, marginBottom:16, fontSize:13 }}>
              ⚠ {err}
            </div>
          )}

          {loading ? (
            <div style={{ color:T.muted, fontSize:13 }}>Lädt…</div>
          ) : user && (
            <>
              {/* User-Card */}
              <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:'20px 22px', marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:20, flexWrap:'wrap' }}>
                  <div>
                    <div style={{ fontSize:22, fontWeight:900, color:T.text, letterSpacing:'-0.3px' }}>
                      {user.fullName || user.email || 'Unbekannt'}
                    </div>
                    {user.fullName && user.email && (
                      <div style={{ color:T.muted, fontSize:13, marginTop:2 }}>{user.email}</div>
                    )}
                    <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
                      <Pill accent={isAdminRow}>{user.role}</Pill>
                      {user.accessTier && user.accessTier !== 'basic' && <Pill>{user.accessTier}</Pill>}
                      {user.createdAt && <Pill>angelegt {formatDate(user.createdAt)}</Pill>}
                    </div>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, marginTop:18 }}>
                  <MiniStat label="Projekte (Disk)" value={projects.length} accent />
                  <MiniStat label="Bilder generiert" value={user.imagesGenerated} accent />
                  <MiniStat label="Videos generiert" value={user.videosGenerated} accent />
                </div>

                {(user.background || user.market || user.targetAudience || user.offer) && (
                  <div style={{ marginTop:18, paddingTop:18, borderTop:`1px solid ${T.border}`, display:'grid', gap:10, fontSize:13 }}>
                    {user.background && <Row label="Hintergrund" value={user.background} />}
                    {user.market && <Row label="Markt" value={user.market} />}
                    {user.targetAudience && <Row label="Zielgruppe" value={user.targetAudience} />}
                    {user.offer && <Row label="Angebot" value={user.offer} />}
                  </div>
                )}
              </div>

              {/* Projekt-Liste */}
              <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, overflow:'hidden' }}>
                <div style={{ padding:'14px 18px', borderBottom:`1px solid ${T.border}`, fontSize:15, fontWeight:800, color:T.text }}>
                  Projekte ({projects.length})
                </div>
                {projects.length === 0 ? (
                  <div style={{ padding:40, textAlign:'center', color:T.muted, fontSize:13 }}>
                    Noch keine Projekte auf dem Worker.
                  </div>
                ) : (
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                    <thead>
                      <tr style={{ background:T.subtle }}>
                        <Th>Titel</Th>
                        <Th>Erstellt</Th>
                        <Th align="right">Szenen</Th>
                        <Th align="right">Mit Bild</Th>
                        <Th align="right">Mit Video</Th>
                        <Th></Th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map(p => (
                        <tr key={p.id}>
                          <td style={td}>
                            <div style={{ color:T.text, fontWeight:600 }}>{p.title}</div>
                            <div style={{ color:T.muted, fontSize:11 }}>{p.id}</div>
                          </td>
                          <td style={{ ...td, color:T.muted }}>{formatDate(p.createdAt)}</td>
                          <td style={{ ...td, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{p.sceneCount}</td>
                          <td style={{ ...td, textAlign:'right', fontVariantNumeric:'tabular-nums', color: p.withImage > 0 ? T.text : T.muted }}>{p.withImage}</td>
                          <td style={{ ...td, textAlign:'right', fontVariantNumeric:'tabular-nums', color: p.withVideo > 0 ? T.text : T.muted }}>{p.withVideo}</td>
                          <td style={{ ...td, textAlign:'right' }}>
                            <a
                              href={`/scenes/${p.id}`}
                              style={{ fontSize:12, color:T.accent, fontWeight:700, padding:'4px 10px', borderRadius:9999, border:`1px solid ${T.accentBrd}`, background:T.accentBg }}>
                              Öffnen →
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

const td = { padding:'10px 14px', borderBottom:`1px solid ${T.border}`, whiteSpace:'nowrap' };

function Th({ children, align = 'left' }) {
  return (
    <th style={{ padding:'10px 14px', textAlign:align, color:T.muted, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, borderBottom:`1px solid ${T.border}`, whiteSpace:'nowrap' }}>
      {children}
    </th>
  );
}

function Pill({ children, accent }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      padding:'2px 10px', borderRadius:9999, fontSize:11, fontWeight:700,
      background: accent ? T.accentBg : T.subtle,
      color: accent ? T.accent : T.muted,
      border: `1px solid ${accent ? T.accentBrd : T.border}`,
    }}>{children}</span>
  );
}

function MiniStat({ label, value, accent }) {
  return (
    <div style={{ background: accent ? T.accentBg : T.subtle, border:`1px solid ${accent ? T.accentBrd : T.border}`, borderRadius:10, padding:'10px 12px' }}>
      <div style={{ fontSize:20, fontWeight:900, color: accent ? T.accent : T.text, letterSpacing:'-0.5px', lineHeight:1 }}>{value ?? 0}</div>
      <div style={{ fontSize:10, color:T.muted, marginTop:4, fontWeight:600, textTransform:'uppercase', letterSpacing:0.4 }}>{label}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display:'flex', gap:10 }}>
      <span style={{ color:T.muted, minWidth:120, fontSize:12 }}>{label}</span>
      <span style={{ color:T.text, flex:1 }}>{value}</span>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  } catch { return '—'; }
}

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { T } from '../../lib/theme';
import NavBar from '../../components/NavBar';

/* ── Design-Tokens ─────────────────────────────────────────── */

const FONTS = ['Arial Bold', 'Helvetica Neue', 'Impact', 'Montserrat', 'Oswald', 'Roboto Bold'];
const POSITIONS = [
  { v: 'bottom', l: 'Unten' },
  { v: 'center', l: 'Mitte' },
  { v: 'top',    l: 'Oben' },
];
const ANIMATIONS = [
  { v: 'fade',       l: 'Fade' },
  { v: 'word-by-word', l: 'Wort für Wort' },
  { v: 'slide-up',   l: 'Slide up' },
  { v: 'none',       l: 'Keine' },
];
const LANGUAGES = [
  { v: 'de', l: 'Deutsch' },
  { v: 'en', l: 'Englisch' },
  { v: 'original', l: 'Originalsprache' },
];

export default function SetupPage() {
  const router = useRouter();
  const { id } = router.query;

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Formularwerte
  const [format, setFormat] = useState('9:16');
  const [styleDescription, setStyleDescription] = useState('Herr Tech Stil: dunkler Hintergrund, dynamische Schriften, energetisch');
  const [styleDeviation, setStyleDeviation] = useState(3);
  const [subtitleLanguage, setSubtitleLanguage] = useState('de');
  const [subtitleColor, setSubtitleColor] = useState('#FFFFFF');
  const [subtitleFont, setSubtitleFont] = useState('Arial Bold');
  const [subtitlePosition, setSubtitlePosition] = useState('bottom');
  const [subtitleAnimation, setSubtitleAnimation] = useState('word-by-word');
  // Stil-Referenzbild
  const [styleImagePreview, setStyleImagePreview] = useState(null);
  const [styleImageFile, setStyleImageFile] = useState(null);
  const [uploadingStyle, setUploadingStyle] = useState(false);
  const [styleImageDragging, setStyleImageDragging] = useState(false);
  const styleImageInputRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((p) => { setProject(p); setLoading(false); })
      .catch(() => { setError('Projekt konnte nicht geladen werden.'); setLoading(false); });
  }, [id]);

  async function uploadStyleImage(file) {
    if (!file) return;
    setUploadingStyle(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`/api/projects/${id}/upload-style`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload fehlgeschlagen');
      setStyleImageFile(data.styleImageFile);
      const reader = new FileReader();
      reader.onload = (e) => setStyleImagePreview(e.target.result);
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingStyle(false);
    }
  }

  async function saveSetup() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${id}/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, styleDescription, styleDeviation, subtitleLanguage, subtitleColor, subtitleFont, subtitlePosition, subtitleAnimation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Setup konnte nicht gespeichert werden');
      router.push(`/scenes/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingScreen />;

  const sceneCount = project?.scenes?.length ?? 0;

  return (
    <>
      <Head><title>Produktions-Setup — Herr Tech</title></Head>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        * { box-sizing:border-box; }
        input[type=range] { accent-color: #B598E2; }
        input[type=color] { cursor:pointer; }
      `}</style>

      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column' }}>

        <NavBar
          rightSlot={
            <span style={{ color: T.muted, fontSize: 12, whiteSpace: 'nowrap' }}>
              {sceneCount} Szene{sceneCount !== 1 ? 'n' : ''} erkannt
            </span>
          }
        />

        {/* Breadcrumb */}
        <div style={{ padding: '20px 40px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          {['1 Upload', '2 Setup', '3 Szenen', '4 Bilder', '5 Videos', '6 Export'].map((step, i) => {
            // Step is reachable if: upload (always), setup (always), or scenes+ if project has setup already
            const hasSetup = !!project?.setup;
            const isActive = i === 1;
            const isReachable = i === 0 || i === 1 || (i === 2 && hasSetup);
            const onClick = i === 0 ? () => router.push('/')
              : i === 2 && hasSetup ? () => router.push(`/scenes/${id}`)
              : undefined;
            return (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {i > 0 && <span style={{ color: T.subtle }}>→</span>}
                <span
                  onClick={onClick}
                  style={{
                    fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 9999,
                    background: isActive ? T.accentBg : 'transparent',
                    border: `1px solid ${isActive ? T.accentBrd : isReachable ? T.border : T.subtle}`,
                    color: isActive ? T.accent : isReachable ? T.muted : T.subtle,
                    cursor: isReachable && !isActive ? 'pointer' : 'default',
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { if (isReachable && !isActive) { e.currentTarget.style.borderColor = T.accentBrd; e.currentTarget.style.color = T.accent; }}}
                  onMouseLeave={e => { if (isReachable && !isActive) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}}
                >{step}</span>
              </div>
            );
          })}
        </div>

        {/* Content */}
        <main style={{ flex: 1, maxWidth: 720, width: '100%', margin: '0 auto', padding: '40px 24px 80px' }}>
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 8px', letterSpacing: '-1px', color: T.text }}>
            Produktions-Setup
          </h1>
          <p style={{ color: T.muted, fontSize: 15, margin: '0 0 40px', lineHeight: 1.6 }}>
            Diese Einstellungen gelten für alle {sceneCount} Szenen. Du kannst sie später pro Szene überschreiben.
          </p>

          {/* ── Ausgabeformat ── */}
          <Section title="Ausgabeformat">
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { v: '9:16', label: '9:16', sub: 'Reels · TikTok · Shorts', icon: '📱' },
                { v: '16:9', label: '16:9', sub: 'YouTube · Widescreen',    icon: '🖥' },
              ].map((opt) => (
                <button key={opt.v} onClick={() => setFormat(opt.v)} style={{
                  flex: 1, padding: '20px', borderRadius: 14, textAlign: 'left',
                  background: format === opt.v ? T.accentBg : T.surface,
                  border: `2px solid ${format === opt.v ? T.accent : T.border}`,
                  cursor: 'pointer', transition: 'all .2s',
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{opt.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: format === opt.v ? T.accent : T.text }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{opt.sub}</div>
                </button>
              ))}
            </div>
          </Section>

          {/* ── Stil ── */}
          <Section title="Visueller Stil">
            {/* Stil-Referenzbild */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: T.muted, marginBottom: 8 }}>
                Stil-Referenzbild <span style={{ color: T.subtle }}>(optional — oder per Text beschreiben)</span>
              </label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div
                  onClick={() => styleImageInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setStyleImageDragging(true); }}
                  onDragLeave={() => setStyleImageDragging(false)}
                  onDrop={e => { e.preventDefault(); setStyleImageDragging(false); const f = e.dataTransfer.files[0]; if (f) uploadStyleImage(f); }}
                  style={{
                    width: 100, height: 70, borderRadius: 10,
                    border: `2px dashed ${styleImageDragging ? T.accent : styleImagePreview ? T.accent : T.border}`,
                    background: styleImageDragging ? T.accentBg : styleImagePreview ? 'transparent' : T.surface,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', flexShrink: 0, transition: 'all .15s', position: 'relative',
                  }}>
                  <input ref={styleImageInputRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadStyleImage(f); }} />
                  {styleImagePreview
                    ? <>
                        <img src={styleImagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {styleImageDragging && (
                          <div style={{ position:'absolute', inset:0, background:'rgba(181,152,226,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <span style={{ fontSize:20 }}>📂</span>
                          </div>
                        )}
                      </>
                    : <span style={{ fontSize: styleImageDragging ? 20 : 24, opacity: styleImageDragging ? 0.9 : 0.4 }}>{styleImageDragging ? '📂' : '🖼'}</span>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  {uploadingStyle
                    ? <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Wird hochgeladen…</p>
                    : styleImageFile
                    ? <p style={{ margin: 0, fontSize: 13, color: '#22c55e' }}>✓ Stil-Bild gespeichert — wird auf alle Szenen angewendet</p>
                    : <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.5 }}>Lade ein Beispiel-Bild hoch das den Ziel-Stil zeigt. Imagen orientiert sich daran für alle Szenenbilder.</p>
                  }
                </div>
              </div>
            </div>

            <label style={{ display: 'block', fontSize: 13, color: T.muted, marginBottom: 8 }}>
              Stil beschreiben — oder per Bild oben definieren (beides möglich)
            </label>
            <textarea
              value={styleDescription}
              onChange={(e) => setStyleDescription(e.target.value)}
              rows={3}
              placeholder="z.B. Herr Tech Stil: dunkler Hintergrund, dynamische Schriften, energetisch, schnelle Cuts, Farben: schwarz und lila"
              style={{
                width: '100%', background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 12, color: T.text, padding: '12px 16px', fontSize: 14,
                resize: 'vertical', outline: 'none', transition: 'border-color .15s', lineHeight: 1.5,
              }}
              onFocus={(e) => (e.target.style.borderColor = T.accent)}
              onBlur={(e) => (e.target.style.borderColor = T.border)}
            />

            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{ fontSize: 13, color: T.muted }}>Stil-Abweichung vom Original</label>
                <div style={{ display: 'flex', gap: 24, fontSize: 12, color: T.muted }}>
                  <span style={{ color: styleDeviation <= 2 ? T.accent : T.muted }}>Subtil</span>
                  <span style={{ color: styleDeviation === 3 ? T.accent : T.muted }}>Ausgewogen</span>
                  <span style={{ color: styleDeviation >= 4 ? T.accent : T.muted }}>Komplett anders</span>
                </div>
              </div>
              <input
                type="range" min={1} max={5} value={styleDeviation}
                onChange={(e) => setStyleDeviation(Number(e.target.value))}
                style={{ width: '100%', height: 4 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                {[1,2,3,4,5].map(v => (
                  <span key={v} style={{ fontSize: 11, color: styleDeviation === v ? T.accent : T.subtle, fontWeight: 700 }}>{v}</span>
                ))}
              </div>
            </div>
          </Section>

          {/* ── Untertitel ── */}
          <Section title="Untertitel">

            {/* Sprache */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: T.muted, marginBottom: 8 }}>Sprache</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {LANGUAGES.map((opt) => (
                  <button key={opt.v} onClick={() => setSubtitleLanguage(opt.v)} style={{
                    flex: 1, padding: '9px', borderRadius: 9999,
                    border: `1px solid ${subtitleLanguage === opt.v ? T.accent : T.border}`,
                    background: subtitleLanguage === opt.v ? T.accentBg : 'transparent',
                    color: subtitleLanguage === opt.v ? T.accent : T.muted,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                  }}>{opt.l}</button>
                ))}
              </div>
            </div>

            {/* Farbe + Schrift */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: T.muted, marginBottom: 8 }}>Farbe</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px' }}>
                  <input type="color" value={subtitleColor} onChange={(e) => setSubtitleColor(e.target.value)}
                    style={{ width: 28, height: 28, border: 'none', borderRadius: 6, padding: 0, background: 'transparent' }} />
                  <span style={{ color: T.text, fontSize: 14, fontFamily: 'monospace' }}>{subtitleColor.toUpperCase()}</span>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: T.muted, marginBottom: 8 }}>Schrift</label>
                <select value={subtitleFont} onChange={(e) => setSubtitleFont(e.target.value)}
                  style={{ width: '100%', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, padding: '10px 14px', fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                  {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            {/* Position */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: T.muted, marginBottom: 8 }}>Position</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {POSITIONS.map((opt) => (
                  <button key={opt.v} onClick={() => setSubtitlePosition(opt.v)} style={{
                    flex: 1, padding: '9px', borderRadius: 9999,
                    border: `1px solid ${subtitlePosition === opt.v ? T.accent : T.border}`,
                    background: subtitlePosition === opt.v ? T.accentBg : 'transparent',
                    color: subtitlePosition === opt.v ? T.accent : T.muted,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                  }}>{opt.l}</button>
                ))}
              </div>
            </div>

            {/* Animation */}
            <div>
              <label style={{ display: 'block', fontSize: 13, color: T.muted, marginBottom: 8 }}>Animations-Stil</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ANIMATIONS.map((opt) => (
                  <button key={opt.v} onClick={() => setSubtitleAnimation(opt.v)} style={{
                    padding: '8px 16px', borderRadius: 9999,
                    border: `1px solid ${subtitleAnimation === opt.v ? T.accent : T.border}`,
                    background: subtitleAnimation === opt.v ? T.accentBg : 'transparent',
                    color: subtitleAnimation === opt.v ? T.accent : T.muted,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                  }}>{opt.l}</button>
                ))}
              </div>
            </div>
          </Section>

          {/* Vorschau */}
          <div style={{ background: T.subtle, borderRadius: 12, padding: '16px 20px', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flexShrink: 0, width: format === '9:16' ? 36 : 64, height: format === '9:16' ? 64 : 36, background: T.surface, borderRadius: 4, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: T.muted }}>
              {format}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, color: T.text, fontWeight: 600 }}>Zusammenfassung</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
                Format {format} · Stil-Abweichung {styleDeviation}/5 · Untertitel {subtitleLanguage.toUpperCase()} · {subtitleFont} · {POSITIONS.find(p => p.v === subtitlePosition)?.l} · {ANIMATIONS.find(a => a.v === subtitleAnimation)?.l}
              </p>
            </div>
          </div>

          {/* Fehler */}
          {error && (
            <div style={{ marginBottom: 20, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px', color: '#ef4444', fontSize: 14 }}>
              ⚠ {error}
            </div>
          )}

          {/* CTA */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => router.push('/')} style={{
              padding: '17px 24px', borderRadius: 9999,
              background: 'transparent', color: T.muted,
              border: `1px solid ${T.border}`, fontSize: 15, fontWeight: 700,
              cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap',
            }}>
              ← Zurück
            </button>
            <button onClick={saveSetup} disabled={saving} style={{
              flex: 1, padding: '17px', borderRadius: 9999,
              background: T.accent,
              color: T.onAccent,
              opacity: saving ? 0.5 : 1,
              border: 'none', fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px',
              cursor: saving ? 'not-allowed' : 'pointer', transition: 'all .2s',
            }}>
              {saving ? 'Wird gespeichert…' : `Weiter zu den ${sceneCount} Szenen →`}
            </button>
          </div>
        </main>

      </div>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: '#B598E2', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 16px' }}>
        {title}
      </h2>
      <div style={{ background: T.card, border: '1px solid #1e1e1e', borderRadius: 16, padding: '24px' }}>
        {children}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: T.muted, fontSize: 14 }}>Lade Projekt…</div>
    </div>
  );
}

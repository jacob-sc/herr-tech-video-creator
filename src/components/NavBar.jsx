import { useRouter } from 'next/router';
import { T } from '../lib/theme';
import { useTheme } from '../lib/theme-context';
import { useSession } from '../lib/use-session';

/**
 * Zentrale Navigationsleiste.
 *
 * Links (immer): "← herrtechgpt"-Button + Logo
 * Rechts: variable Props via `rightSlot` (z.B. Pills, Stats) + Theme-Toggle + "Projekte"
 *
 * Wir zeigen KEINEN Abmelden-Button mehr — Account-Management laeuft via herrtechgpt.
 * Der User landet via SSO ein, wenn er ausloggt + neu einloggt ueberschreiben die
 * Cookies automatisch beim naechsten Kachel-Klick.
 *
 * Default-Back-URL: world.herr.tech (Live). Ueberschreibbar via HTVC_BACK_URL cookie.
 */
export default function NavBar({ rightSlot, showProjectsButton = true, currentPath }) {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const { data: session } = useSession();

  const backHref = readBackCookie() || 'https://world.herr.tech/dashboard/ki-toolbox';
  const isAdmin = session?.user?.role === 'admin';

  return (
    <nav style={{
      padding: '0 24px',
      height: 60,
      borderBottom: `1px solid ${T.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      background: T.bg,
      zIndex: 100,
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <a
          href={backHref}
          title="Zurück zu Herr Tech World"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 9999,
            border: `1px solid ${T.border}`, background: T.surface,
            color: T.muted, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
            transition: 'all .15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = T.borderLight; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border; }}>
          <span style={{ fontSize: 14, lineHeight: 1 }}>←</span> World
        </a>
        <img
          src="/herr-tech-logo.png"
          alt="HERR TECH"
          style={{ height: 18, objectFit: 'contain', opacity: 0.9, cursor: 'pointer' }}
          onClick={() => router.push('/projects')}
        />
        {currentPath && (
          <span style={{ color: T.muted, fontSize: 12, display: 'none' }} className="nav-breadcrumb">
            / {currentPath}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {rightSlot}
        {isAdmin && (
          <a
            href="/admin"
            title="Admin-Bereich (Video Creator)"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 9999,
              border: `1px solid ${T.accent}`,
              background: 'transparent',
              color: T.accent, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
              letterSpacing: 0.3,
              transition: 'all .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = T.accent; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.accent; }}>
            <span aria-hidden style={{ fontSize: 10 }}>●</span> Admin
          </a>
        )}
        <ThemeToggle theme={theme} onClick={toggle} />
        {showProjectsButton && (
          <button
            onClick={() => router.push('/projects')}
            style={{
              background: 'transparent',
              border: `1px solid ${T.border}`,
              borderRadius: 9999,
              color: T.muted,
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 14px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = T.borderLight; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border; }}>
            Projekte
          </button>
        )}
      </div>
    </nav>
  );
}

function ThemeToggle({ theme, onClick }) {
  const isDark = theme === 'dark';
  return (
    <button
      onClick={onClick}
      title={isDark ? 'Zu hellem Modus wechseln' : 'Zu dunklem Modus wechseln'}
      aria-label="Theme umschalten"
      style={{
        width: 32, height: 32,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent',
        border: `1px solid ${T.border}`,
        borderRadius: 9999,
        color: T.muted,
        cursor: 'pointer',
        transition: 'all .15s',
        padding: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = T.borderLight; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border; }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {isDark ? (
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </>
        )}
      </svg>
    </button>
  );
}

function readBackCookie() {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)htvc-back=([^;]+)/);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return null; }
}


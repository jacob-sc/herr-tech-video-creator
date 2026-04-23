/**
 * Theme-Tokens als CSS-Variable-Strings. Zur Laufzeit schaltet das
 * `data-theme`-Attribut auf <html> zwischen dunklem und hellem Palette-Set
 * in globals.css um — hier wird nichts pro Theme ausgetauscht.
 *
 * Drop-in-Ersatz fuer das alte inline-`T = { ... }` in jeder Seite.
 */

export const T = {
  bg:        'var(--bg)',
  surface:   'var(--surface)',
  card:      'var(--card)',
  cardHover: 'var(--card-hover)',
  border:    'var(--border)',
  borderLight: 'var(--border-light)',
  subtle:    'var(--subtle)',
  text:      'var(--text)',
  muted:     'var(--muted)',
  accent:    'var(--accent)',
  accentHover: 'var(--accent-hover)',
  accentBg:  'var(--accent-bg)',
  accentBrd: 'var(--accent-brd)',
  onAccent:  'var(--on-accent)',
  green:     'var(--green)',
  greenBg:   'var(--green-bg)',
  greenBrd:  'var(--green-brd)',
  red:       'var(--red)',
  redBg:     'var(--red-bg)',
  redBrd:    'var(--red-brd)',
  amber:     'var(--amber)',
};

export const THEME_COOKIE = 'htvc-theme';

export function readThemeCookie() {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)htvc-theme=(light|dark)/);
  return m ? m[1] : null;
}

export function writeThemeCookie(theme) {
  if (typeof document === 'undefined') return;
  // 1 Jahr, Cookie ist nicht sensitiv
  document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax; Secure`;
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

export function resolveInitialTheme() {
  if (typeof window === 'undefined') return 'dark';
  const cookie = readThemeCookie();
  if (cookie === 'light' || cookie === 'dark') return cookie;
  // OS-Preference als Fallback
  const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
  return prefersLight ? 'light' : 'dark';
}

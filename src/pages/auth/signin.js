import Head from 'next/head';

export default function Signin() {
  return (
    <>
      <Head><title>Anmelden · Herr Tech Video Creator</title></Head>
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: 460, padding: 32 }}>
          <img src="/herr-tech-logo.png" alt="HERR TECH" style={{ height: 22, marginBottom: 32, opacity: 0.9 }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 12px' }}>Anmeldung über herrtechgpt</h1>
          <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
            Der Video Creator nutzt deinen herrtechgpt-Login. Öffne die Plattform, gehe zur KI-Toolbox und klick auf „KI Video Creator".
          </p>
          <a href="https://world.herr.tech/dashboard/ki-toolbox" style={{ display: 'inline-block', padding: '10px 20px', borderRadius: 9999, background: '#B598E2', color: '#000', fontSize: 13, fontWeight: 700 }}>
            Zur Plattform →
          </a>
          <p style={{ color: '#444', fontSize: 11, marginTop: 20 }}>
            Interner Test? <a href="https://staging.herr.tech/dashboard/ki-toolbox" style={{ color: '#666', textDecoration: 'underline' }}>Staging öffnen</a>
          </p>
        </div>
      </main>
    </>
  );
}

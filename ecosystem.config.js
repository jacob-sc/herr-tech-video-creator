// ── Lokale Entwicklung ───────────────────────────────────────────────────────
const devApp = {
  name: 'herr-tech',
  script: 'node_modules/.bin/next',
  args: 'dev --port 3000',
  cwd: '/Users/jacob/code/herr-tech/herr-tech-video-creator',
  interpreter: '/Users/jacob/.nvm/versions/node/v22.17.1/bin/node',
  env: {
    NODE_ENV: 'development',
    PATH: '/Users/jacob/.nvm/versions/node/v22.17.1/bin:' + process.env.PATH,
  },
  watch: false,
  autorestart: true,
  restart_delay: 2000,
  max_restarts: 20,
  log_file: '/tmp/herr-tech.log',
  error_file: '/tmp/herr-tech-error.log',
  out_file: '/tmp/herr-tech-out.log',
};

// ── Produktion (Hetzner VPS) ─────────────────────────────────────────────────
const prodApp = {
  name: 'herr-tech-video-creator',
  script: 'node_modules/.bin/next',
  args: 'start',
  cwd: '/var/www/herr-tech-video-creator',
  exec_mode: 'fork',   // NICHT cluster — file-based Storage ist nicht cluster-safe
  instances: 1,
  max_memory_restart: '1500M',
  env: {
    NODE_ENV: 'production',
    PORT: 3000,
  },
  error_file: '/var/log/pm2/herr-tech-error.log',
  out_file: '/var/log/pm2/herr-tech-out.log',
  log_date_format: 'YYYY-MM-DD HH:mm:ss',
};

module.exports = {
  apps: [devApp, prodApp],
};

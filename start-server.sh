#!/bin/bash
# Herr Tech Video Creator — Server starten/neustarten
PM2=/Users/jacob/.nvm/versions/node/v22.17.1/bin/pm2
NODE=/Users/jacob/.nvm/versions/node/v22.17.1/bin/node

echo "🚀 Starte Herr Tech Server auf Port 3000..."

# Stoppe falls läuft
$NODE $PM2 stop herr-tech 2>/dev/null

# Starte neu
$NODE $PM2 start /Users/jacob/claude/herr-tech/apps/herr-tech-video-creator/ecosystem.config.js

echo ""
echo "✅ Server läuft unter http://localhost:3000"
echo ""
echo "Logs anzeigen:  tail -f /tmp/herr-tech-out.log"
echo "Server stoppen: $NODE $PM2 stop herr-tech"

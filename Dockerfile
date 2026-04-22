# syntax=docker/dockerfile:1.6
# Video-Creator-Worker für Hetzner
# - Node 22 (matching herrtechgpt)
# - FFmpeg für Audio-Extraktion, Screenshots, Remotion-Encoding
# - yt-dlp für YouTube/Instagram/TikTok-Downloads
# - Chromium für Remotion Headless-Rendering

# ─── Builder ──────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# ─── Runtime ──────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
    fonts-liberation \
    fonts-noto-color-emoji \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    chromium \
  && rm -rf /var/lib/apt/lists/*

# yt-dlp via pip (aktueller als Debian-Paket, Auto-Updates via docker pull)
RUN pip3 install --break-system-packages --no-cache-dir --upgrade yt-dlp

# Built app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src ./src
COPY --from=builder /app/next.config.js ./next.config.js

# Persistente Volumes (Hetzner: docker-compose mountet named volumes)
RUN mkdir -p /app/tmp/projects /app/uploads /app/out
VOLUME ["/app/tmp/projects", "/app/uploads", "/app/out"]

EXPOSE 3000
ENV NODE_ENV=production \
    PORT=3000 \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    REMOTION_CHROME_EXECUTABLE=/usr/bin/chromium

CMD ["npm", "start"]

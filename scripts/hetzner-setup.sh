#!/usr/bin/env bash
# Einmaliges Setup eines frischen Hetzner-VPS (Ubuntu 24.04 / Debian 12).
# Als root ausführen: `bash hetzner-setup.sh`
#
# Danach:
#   1. SSH-Key für deploy-User hinzufügen: /home/deploy/.ssh/authorized_keys
#   2. Repo klonen: cd /opt && git clone <repo> video-creator-worker
#   3. .env anlegen (siehe .env.example)
#   4. docker compose up -d --build

set -euo pipefail

echo "==> System-Update"
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

echo "==> Basis-Tools"
apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    git \
    ufw \
    fail2ban \
    unattended-upgrades

echo "==> Docker installieren"
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
fi
apt-get install -y docker-compose-plugin

echo "==> Firewall (SSH + HTTP + HTTPS)"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Deploy-User anlegen"
if ! id -u deploy &>/dev/null; then
    useradd -m -s /bin/bash -G docker deploy
fi
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys

echo "==> App-Verzeichnis"
install -d -o deploy -g deploy /opt/video-creator-worker

echo "==> Automatische Security-Updates aktivieren"
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> SSH-Hardening (Root-Login + Password-Auth aus)"
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh

cat <<EOF

✓ Setup abgeschlossen.

Nächste Schritte (auf diesem Server):
  1. SSH-Key hinzufügen:
     echo 'ssh-ed25519 AAAA...' >> /home/deploy/.ssh/authorized_keys

  2. Als deploy weitermachen:
     su - deploy
     cd /opt/video-creator-worker
     git clone <REPO_URL> .
     cp .env.example .env && nano .env
     docker compose up -d --build

  3. DNS-A-Record auf diese Server-IP zeigen lassen, dann
     Caddy holt automatisch das SSL-Zertifikat.

EOF

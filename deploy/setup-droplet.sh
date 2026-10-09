#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 droplet for BBB (run as root over SSH). Safe to re-run.
#   curl -fsSL https://raw.githubusercontent.com/MishaelJulian/BBB/main/deploy/setup-droplet.sh | bash
set -euo pipefail

apt-get update -y
apt-get install -y ca-certificates curl git ufw sqlite3 unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades   # automatic security patches

# Docker (official convenience script)
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh

# Firewall: SSH + web only (proxy checklist item 2)
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# SSH: keys only
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload ssh || systemctl reload sshd || true

# App code and data directories (api data owned by uid 10001, auth data by uid 1000)
mkdir -p /srv/bbb
[ -d /srv/bbb/app/.git ] || git clone https://github.com/MishaelJulian/BBB.git /srv/bbb/app
mkdir -p /srv/bbb/data /srv/bbb/auth /srv/bbb/assets/uploads/meetups /srv/bbb/assets/generated_pdfs /srv/bbb/backups
# First run only: seed the archive from the repository copy (production becomes the source of truth after this).
[ -f /srv/bbb/data/book_club_archivist.db ] || cp /srv/bbb/app/book_club_archivist.db /srv/bbb/data/
[ -d /srv/bbb/app/assets/generated_pdfs ] && cp -n /srv/bbb/app/assets/generated_pdfs/* /srv/bbb/assets/generated_pdfs/ 2>/dev/null || true
chown -R 10001:10001 /srv/bbb/data /srv/bbb/assets   # api container user
chown -R 1000:1000 /srv/bbb/auth                     # auth container user (node)
chmod 700 /srv/bbb/auth /srv/bbb/backups             # auth.db and its backups hold personal data

# Nightly backup at 02:30 IST (21:00 UTC), kept 30 days on the droplet; a founder pulls copies off-box.
cat >/etc/cron.d/bbb-backup <<'CRON'
0 21 * * * root cd /srv/bbb/app && python3 scripts/backup_db.py --dest /srv/bbb/backups --keep-days 30 /srv/bbb/data/book_club_archivist.db /srv/bbb/auth/auth.db >> /var/log/bbb-backup.log 2>&1
CRON

echo "Setup done. Next: create /srv/bbb/app/deploy/.env.prod (see deploy/README.md), then start the stack."

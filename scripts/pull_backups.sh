#!/usr/bin/env bash
# Run on a founder's laptop: copy the server's nightly backups off-box (D33, founders' choice).
#   BBB_SERVER=root@203.0.113.7 scripts/pull_backups.sh   (BBB_DROPLET still works)
# Cron example (daily 09:00):  0 9 * * * BBB_SERVER=root@203.0.113.7 /path/to/BBB/scripts/pull_backups.sh
set -euo pipefail
: "${BBB_SERVER:=${BBB_DROPLET:-}}"
: "${BBB_SERVER:?set BBB_SERVER=user@server-ip}"
DEST="${BBB_BACKUP_DIR:-$HOME/bbb_backups/server}"
mkdir -p "$DEST"
chmod 700 "$DEST"   # auth.db copies hold personal data
rsync -az --ignore-existing "$BBB_SERVER:/srv/bbb/backups/" "$DEST/"
latest=$(ls -t "$DEST"/book_club_archivist_*.db 2>/dev/null | head -1)
[ -n "$latest" ] && python3 -c "import sqlite3,sys; print('integrity', sqlite3.connect(sys.argv[1]).execute('pragma integrity_check').fetchone()[0], sys.argv[1])" "$latest"

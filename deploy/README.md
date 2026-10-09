# Deploying BBB (runbook)

Target: frontend on **Vercel** (Hobby, non-commercial), API + login service + Caddy on a **DigitalOcean droplet in Bangalore**. Design and reasons: `docs/architecture/bbb-library-architecture.md`. Plan and status: `docs/plans/launch_30h.md`.

## 1. Droplet (once)

1. Create the droplet: Ubuntu 24.04 LTS, Basic, Regular, 1 GB / 25 GB, region **BLR1**, SSH key only.
2. From your laptop: `ssh root@<droplet-ip>`, then run:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/MishaelJulian/BBB/main/deploy/setup-droplet.sh | bash
   ```
   This installs Docker, the firewall (22, 80, 443 only), automatic security updates and the nightly backup cron; clones the repo to `/srv/bbb/app`; seeds `/srv/bbb/data/book_club_archivist.db` from the repo copy.
3. Create the secrets file (never commit it):
   ```bash
   cd /srv/bbb/app/deploy && cp .env.prod.example .env.prod && chmod 600 .env.prod && nano .env.prod
   ```
   - `ORIGIN_SECRET`: `openssl rand -hex 32` (the same value goes into Vercel, step 2.3)
   - `BETTER_AUTH_SECRET`: `openssl rand -base64 32`
   - `PUBLIC_SITE_URL`: the Vercel address, e.g. `https://bbb-library.vercel.app`
   - `SITE_ADDRESS`: the droplet IP with dashes plus `.sslip.io`, e.g. `203-0-113-7.sslip.io` (later: `api.<club domain>`)
4. Start: `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`
5. Check: `curl -s https://<SITE_ADDRESS>/health` must return **403** (direct access refused). That is correct.
6. Create the first admin (prints a temporary password; change it on `/account` after the first login):
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod exec auth node server.mjs user create <email> "<Name>" admin
   ```
   Same command with `presenter` for presenters. Forgotten password: `... exec auth node server.mjs user reset <email>`.

## 2. Vercel (once)

1. Sign in at vercel.com with the GitHub account that owns the repo; **Add New Project**, import `MishaelJulian/BBB`.
2. **Root Directory:** `frontend`. Framework: Next.js (auto).
3. **Environment Variables** (Production):
   - `BACKEND_INTERNAL_URL` = `https://<SITE_ADDRESS>`
   - `AUTH_INTERNAL_URL` = `https://<SITE_ADDRESS>`
   - `ORIGIN_SECRET` = the same value as on the droplet
4. Deploy. Open the Vercel address: the home page and Library Room should load real books.

## 3. Launch checks (launch gate)

- [ ] Library Room shows books on Android Chrome and iPhone Safari; a book opens; Tab reaches the spines.
- [ ] `/admin` sends you to `/login`; after sign-in the admin page loads; sign out works.
- [ ] `https://<SITE_ADDRESS>/health` returns 403 from outside (origin lock).
- [ ] In Chrome DevTools → Security, the connection shows `X25519MLKEM768` (post-quantum key exchange).
- [ ] `curl -sI https://<vercel-address>/api/admin/meetups` returns 401 and no `x-vercel-cache: HIT`.
- [ ] A meetup PDF downloads (meetup #99's PDF is 10.6 MB; if Vercel's 4.5 MB limit blocks it, record it and use the fallback in `docs/plans/launch_30h.md`).
- [ ] Privacy page contact line filled in.
- [ ] Backups: after the first night, `ls /srv/bbb/backups` shows both databases; on your laptop run `BBB_DROPLET=root@<ip> scripts/pull_backups.sh`.
- [ ] Restore drill: copy the newest backup to a scratch folder and open it (`sqlite3 <file> 'pragma integrity_check'`).

## 4. Updating

```bash
ssh root@<droplet-ip>
cd /srv/bbb/app && git pull && cd deploy && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```
Vercel redeploys on every push to `main`. Back up first if the update touches the database: `python3 /srv/bbb/app/scripts/backup_db.py --dest /srv/bbb/backups /srv/bbb/data/book_club_archivist.db /srv/bbb/auth/auth.db`.

## 5. Important

- After launch, **the droplet's database is the archive of record.** The copy in git is the starting snapshot; changes made in the admin page live on the droplet and in its backups.
- Never run `archive reset-db` or `import-full --reset` against `/srv/bbb/data`.
- Secrets live in `deploy/.env.prod` on the droplet, in Vercel's settings, and encrypted in git with SOPS + age (section 6).

## 6. Secrets in git with SOPS + age (D7)

Each admin and the droplet hold their own age key; the encrypted file in git can be opened by any of them. Adding or removing someone = editing `.sops.yaml` and running `sops updatekeys`.

1. Each founder, once (install: `sudo apt install age` and `sops` from github.com/getsops/sops releases):
   ```bash
   mkdir -p ~/.config/sops/age && age-keygen -o ~/.config/sops/age/keys.txt
   grep 'public key' ~/.config/sops/age/keys.txt     # send this public key (age1...) to the repo
   ```
2. On the droplet, the same `age-keygen` command (as root); note its public key.
3. Put every public key into `.sops.yaml` (repository root), replacing the placeholders.
4. Encrypt the production secrets and commit only the encrypted file:
   ```bash
   sops --encrypt deploy/.env.prod > deploy/env.prod.sops && git add deploy/env.prod.sops .sops.yaml
   ```
5. On the droplet, recreate the plain file when needed: `sops --decrypt deploy/env.prod.sops > deploy/.env.prod && chmod 600 deploy/.env.prod`.

# How bbbdemo.vercel.app is built, and how to make this repo the source of it

Written 2026-10-21, after the meetup #100 story deploy. It records what was measured, not what was assumed: the live hosts, the Vercel projects behind them, the repo and branch each one watches, and the one dashboard step that moves bbbdemo onto `MishaelJulian/BBB`.

## 1. What serves what

| Host | Vercel project (team) | Git repo it watches | Production branch | Notes |
|---|---|---|---|---|
| `bbbdemo.vercel.app` | `bbb-vercel-frontend` (`bbb-f1e5`) | `dhilipa01/BBB-Vercel` (private, the co-founder's copy) | `main` | the live demo |
| `bbb-library.vercel.app` | `bbb-library` (`mishaeljulians-projects`) | `MishaelJulian/BBB` (this repo) | `demo/vercel` | same site, second project |
| API (`/api/*`) | Render service `srv-db51bug473hc739h4u1g` | deploy hook on `MishaelJulian/BBB` | `main` | the frontend proxies to it |

Both Vercel projects build the same tree; only the repository they are connected to and the production branch differ. The frontend repo, the deploy repo and this repo share one commit history, so the same commit can be pushed to either and both projects build it.

The two repos are not out of sync. Compared ref by ref (2026-10-21), the only commits in `dhilipa01/BBB-Vercel` that were missing from this repo were the dependency bump branch `dependabot/npm_and_yarn/frontend/npm-79e4b2624b` and one empty commit. The `v1.0` tag, the dependabot branches and the whole history are in both.

## 2. Why pushes stopped reaching bbbdemo (and what fixed it)

The `bbb-vercel-frontend` project watches the branch **`main`** in `dhilipa01/BBB-Vercel`. That branch no longer existed there: the branch had been renamed to `demo/vercel`. So pushes to `demo/vercel` raised no build, and the project stayed frozen on `efcd088` (2026-10-21 11:03 UTC) while this repo moved on.

The fix: push the commit to `main` in that repo. The build then ran and `bbbdemo.vercel.app` went live with the meetup #100 story.

```powershell
git push https://github.com/dhilipa01/BBB-Vercel.git <commit>:main
```

Until step 3 below is done, that command is still how bbbdemo is published, and `<commit>` has to be pushed to `main` there (not only to `demo/vercel`).

## 3. Move bbbdemo onto this repo (three clicks, no code change)

This repo already has everything the project needs: branch `main` and branch `demo/vercel` both point at the current commit, and the project builds from the repository root with the `frontend` directory as its root directory.

In the Vercel dashboard, project `bbb-vercel-frontend`:

1. **Settings → Git → Disconnect** `dhilipa01/BBB-Vercel`.
2. **Settings → Git → Connect** `MishaelJulian/BBB`.
3. **Settings → Git → Production Branch**: `main` (or `demo/vercel` — whichever you want to be the one that publishes).

Environment variables, the root directory, the build command, the framework preset and the domain `bbbdemo.vercel.app` all belong to the project, not to the repository, so they survive the switch.

After that the whole deploy is:

```powershell
git push origin main
```

### Environment variables the project needs

Set on the Vercel project (Production and Preview). `NEXT_PUBLIC_APP_VERSION` and `NEXT_PUBLIC_BUILD_ID` are set by `frontend/next.config.ts` and must not be set by hand.

| Variable | Why |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project; also added to the CSP `img-src`/`connect-src` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | sign-in, sign-up, the session cookie |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side reads of meetups, books, members, PDFs |
| `NEXT_PUBLIC_PHOTO_BASE` | base URL of the public `club-photos` bucket; the archive photos 404 without it |
| `DATABASE_URL` | Postgres via the **pooler in session mode, port 5432** (port 6543 hangs every server-rendered page) |
| `NEXT_PUBLIC_SITE_URL` | canonical URL, sitemap, robots |
| `NEXT_PUBLIC_API_URL` | where the browser reaches the API |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | the Cloudflare captcha on sign-in and sign-up |
| `CRON_SECRET` | the daily cron route `/api/cron/daily` |
| `NEXT_PUBLIC_OAUTH_PROVIDERS`, `NEXT_PUBLIC_APP_VERSION`, `PDF_OUT`, `PDF_NUMBERS`, `DB_POOL_MAX` | optional |

## 4. The dependency bump that sits in the other repo

`dhilipa01/BBB-Vercel` had one dependabot branch this repo did not have: `dependabot/npm_and_yarn/frontend/npm-79e4b2624b` (16 updates). It is now on this repo too, unmerged on purpose, because it is a major-version jump: Next 15 → 16.4, React 19 → 19.3, TypeScript 5.5 → 7, framer-motion 11 → 14, tailwind-merge 2 → 3, plus the matching lockfile. It has never been built or tested against this code. Treat it as a piece of work, not a merge.

## 5. The everyday checklist before a push

1. `cd frontend && npx tsc --noEmit && npm run build` — both must be clean.
2. Commit. CI runs on `main` and on pull requests to `main` (backend, frontend, CodeQL).
3. `git push origin main` — this runs CI, deploys the API (Render) and makes a preview of `bbb-library.vercel.app`.
4. `git push origin main:demo/vercel` — this publishes `bbb-library.vercel.app` as production.
5. Until section 3 is done: `git push https://github.com/dhilipa01/BBB-Vercel.git main:main` — this publishes `bbbdemo.vercel.app`.
6. Check `https://bbbdemo.vercel.app/meetups/100` (the meetup #100 page carries the story, its 26 photos and the video; a quick way to see the newest build is the build id in the footer, `build <sha>`).

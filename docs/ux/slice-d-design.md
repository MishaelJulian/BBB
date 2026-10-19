# Slice D design note: recovery, reset, session lengths (2026-10-19)

Founder decisions are fixed (wave0-decisions.md lines 541-548, 586-592). This note records HOW.

## 1. Recovery phrase
- 12 words, each `crypto.randomInt(2048)` over the BIP39 English list (embedded as `src/lib/recovery/wordlist.ts`, sha256 of the source file 2f5eed53...dbda, no npm dependency). 12 x 11 = 132 bits, above the 128-bit target. It is NOT a checksummed BIP39 mnemonic and must never be loaded into a wallet.
- Stored only as `scrypt$N$r$p$salt$hash` (node:crypto scrypt, N=32768, r=8, p=1, 16-byte random salt, 32-byte hash) in table `recovery_phrases` (one row per login). The words are shown once and never logged, never in URLs, never in storage.
- Comparison with `timingSafeEqual`. Input is normalised (lower-case, whitespace split, each word must be in the list) so typing is forgiving.
- Made: right after sign-up or first sign-in (page `/recovery?first=1`), and again from Account (needs the password). A new phrase replaces the old one.
- First phrase without a password is only allowed when the login has never had one AND the session started less than 30 minutes ago; otherwise the password is asked (a stolen token must not be able to plant a recovery phrase).

## 2. Forgot password (`POST /api/auth/forgot`)
One request carries email + (12 words OR admin code) + new password (the mockup's two screens collect the same fields; the server verifies at the second step so there is no half-open server state). Steps: rate limits -> find login by email -> verify secret (always run scrypt, even for unknown emails, pad to a minimum of 700 ms) -> consume the secret atomically -> set the password with the Supabase Admin API (`PUT /auth/v1/admin/users/:id`, `SUPABASE_SERVICE_ROLE_KEY`, server only) -> issue a NEW phrase (old one dies) -> `auth_security.valid_after = now` (every older session stops working) -> audit rows. If the Admin API fails after the secret was consumed, the consumption is rolled back (compensation) so the user can retry.
- One generic failure message for: unknown email, no phrase, wrong words, wrong/expired/used/revoked code. Rate-limit answers are also generic ("Too many tries") and use buckets that exist for unknown emails too, so existence is not revealed.
- Limits via `hit_rate_limit`: per IP 15 / hour; per email hash 5 / 15 min and 10 / 24 h (these are the lockout: counted for every email, existing or not). Every attempt writes an audit row (`auth.reset.*`, never the secret, email stored as sha256 prefix for failures).
- Password and words only ever travel in the POST body over HTTPS.

## 3. Admin reset code
`POST /api/admin/members/:id/reset-code` (requireAdmin, linked accounts only). Same Crockford 10-char code as invites, hashed as sha256("reset:" + code) so a claim code can never be used as a reset code. One use, 24 hours (wave0 line 546), shown once. Issuing a new one revokes older unused ones. Table `reset_codes`. Appears in the Codes tool as "Reset code" next to claim links (same list, one combined list as decided) and in All changes (audit action `member.reset_code`, "Not possible" to undo, nothing to undo). Revoke from the Codes tool works for both kinds.

## 4. Session lengths enforced in our code
Allowances (from sign-in time): admin 24 h always, member 30 d, member with "Keep me signed in" 90 d. Role comes from `app_metadata.role` only.

How the sign-in time is read. Supabase access tokens carry `session_id` and `amr: [{method, timestamp}]`; the `amr` timestamp is when the login method was used and is NOT changed by a token refresh (a refresh changes `iat`/`exp` only). `caller()` already asks Supabase (`/auth/v1/user`) to validate the token, so the payload is trustworthy; we then base64url-decode the same JWT payload (no signature work needed, GoTrue just vouched for it).
Start time used = the EARLIEST of: the amr timestamp(s) and our own row in `session_prefs` (written at sign-in by `POST /api/session/start`, keyed by session_id, and lazily on first sight of an unknown session). `iat` is never used (refresh would slide it). Using the minimum means that even if some Supabase version slid the amr timestamp on refresh, our own row, written at the real sign-in, still caps the session.
"Keep me signed in" is stored per session (`session_prefs.keep`), only settable in the first 10 minutes of the session, ignored for admins. The sign-in screen's checkbox (off by default, wording from login.html) calls `/api/session/start {keep}` right after sign-in.
Enforcement:
- Server `caller()`: age > allowance -> throws `HttpError(401, "Your previous session has expired. Sign in again.")` with error code `session_expired`, and best-effort revokes that Supabase session (`POST /auth/v1/logout?scope=local`). Also rejects when the session started before `auth_security.valid_after` for that login (set on password reset).
- Client: `authFetch` signs out and goes to `/login?expired=1` on a `session_expired` answer; `useMe` checks the same arithmetic locally from the stored token before calling `/api/me`.
- If the Slice D tables do not exist yet (migration not applied) `caller()` falls back to the JWT-only check instead of locking everybody out. Apply migrations before pushing.

What an attacker can and cannot do:
- Stolen access token (valid up to Supabase's JWT lifetime, 1 h): usable for our API until it expires or the allowance ends, whichever first; cannot change role or extend anything.
- Stolen refresh token: can mint new access tokens at Supabase, but each carries the original sign-in time, so our API rejects them once the allowance (24 h / 30 d / 90 d) is over. They cannot raise a session to "keep" after the first 10 minutes. A session that has been seen past its allowance is also revoked at Supabase (best effort).
- Replay of a reset code: consumed atomically (`update ... where used_at is null`), second use fails. Replay of an old phrase after a reset: hash replaced, fails.
- Brute force: phrase 132 bits; codes 50 bits with 10 tries/day/email and 15/h/IP.
- After a password reset all sessions that started before it are rejected (`valid_after`).
- Not covered: a thief holding a still-valid token can use the account until its allowance ends (no server-side per-token revocation beyond the above); Supabase Auth itself (its own rate limits and refresh-token rotation) stays as configured.

## 5. Portability
New tables use only text, integer, bigint (epoch seconds written by app code) and boolean as integer 0/1 where booleans are needed; no triggers, no RLS logic, no Postgres-only types. They still get `enable row level security` and `revoke all ... from anon, authenticated` like the existing ones. The auth lookups of the user by email use `auth.users` through SQL (as the delete-account route already does).

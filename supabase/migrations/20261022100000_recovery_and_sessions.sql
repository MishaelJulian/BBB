-- Slice D: recovery phrase, admin reset codes, session lengths. Files only: apply by hand in the Supabase SQL editor
-- BEFORE pushing the code (the code tolerates the tables being absent for session checks, but the new routes need them). 2026-10-22.
-- Portable on purpose (the project may move to SQLite/D1): text, integer and bigint (Unix seconds written by the app) only; no triggers.
begin;

-- One row per login: the salted scrypt hash of its 12-word recovery phrase. The words themselves are never stored.
create table if not exists recovery_phrases (
  user_id text primary key,
  phrase_hash text not null,        -- scrypt$N$r$p$salt$hash
  created_at bigint not null
);

-- Admin-issued one-time reset codes (24 hours). Only a hash is stored; the code is shown once to the admin.
create table if not exists reset_codes (
  id text primary key,
  user_id text not null,            -- the login the code resets
  member_id text not null,
  code_hash text not null unique,
  created_by text,
  created_at bigint not null,
  expires_at bigint not null,
  used_at bigint,
  revoked_at bigint
);
create index if not exists ix_reset_codes_user on reset_codes (user_id);
create index if not exists ix_reset_codes_created on reset_codes (created_at);

-- Per login: sessions that started before valid_after are refused (set when a password is reset).
create table if not exists auth_security (
  user_id text primary key,
  valid_after bigint not null default 0
);

-- Per Supabase session: when it really started and whether "Keep me signed in" was chosen (1) or not (0).
create table if not exists session_prefs (
  session_id text primary key,
  user_id text not null,
  started_at bigint not null,
  keep integer not null default 0
);
create index if not exists ix_session_prefs_started on session_prefs (started_at);

alter table recovery_phrases enable row level security;
alter table reset_codes enable row level security;
alter table auth_security enable row level security;
alter table session_prefs enable row level security;
revoke all on recovery_phrases, reset_codes, auth_security, session_prefs from anon, authenticated;

commit;

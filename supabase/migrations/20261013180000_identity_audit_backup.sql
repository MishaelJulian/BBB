-- Identity (claim a member record with an invite code), an audit log of every write, and a nightly 3-slot backup. 2026-10-13.

-- A member record can be linked to exactly one login, and a login to exactly one member.
alter table members add column auth_user_id uuid unique references auth.users (id) on delete set null;

-- One-time invite codes. Only the SHA-256 hash is stored; the code itself is shown once to the admin who creates it.
create table member_invites (
  id uuid primary key default gen_random_uuid(),
  member_id varchar(36) not null references members (id) on delete cascade,
  code_hash text not null unique,
  created_by uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  used_by uuid,
  used_at timestamptz
);
create index ix_member_invites_member on member_invites (member_id);

-- Who changed what: written by the route handlers for every admin or member write.
create table audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  actor_email text,
  action text not null,
  table_name text,
  row_id text,
  before jsonb,
  after jsonb
);
create index ix_audit_log_at on audit_log (at desc);

alter table member_invites enable row level security;
alter table audit_log enable row level security;
revoke all on member_invites, audit_log from anon, authenticated;

-- Nightly backup: copies the data tables into schema "backup", rotating through 3 slots by day of year.
-- Restore one table with: delete from public.<t>; insert into public.<t> select * from backup.<t>_<slot>;  (mind foreign-key order)
create schema backup;
revoke all on schema backup from public, anon, authenticated;
create function backup.snapshot() returns text language plpgsql set search_path = public as $$
declare
  t text;
  slot int := extract(doy from now())::int % 3;
  n int := 0;
begin
  foreach t in array array['aliases','authors','book_relations','canonical_books','discussions','identifier_schemes','import_jobs',
    'import_logs','imported_books','media_categories','meetup_attendance','meetups','members','member_invites','publishers',
    'removed_members_archive','resources','series','sources','venues','audit_log'] loop
    execute format('drop table if exists backup.%I', t || '_' || slot);
    execute format('create table backup.%I as table public.%I', t || '_' || slot, t);
    n := n + 1;
  end loop;
  return format('slot %s: %s tables copied at %s', slot, n, now());
end $$;
revoke execute on function backup.snapshot() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('bbb-nightly-backup', '30 20 * * *', $$select backup.snapshot()$$); -- 20:30 UTC = 02:00 IST

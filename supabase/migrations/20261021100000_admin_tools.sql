-- Slice C (admin tools). Files only: apply by hand in the Supabase SQL editor after review. 2026-10-21.
-- Order: this file, then 20261021100100_meetup_photos_bucket.sql.
begin;

-- Codes tool: an invite can be revoked (kept as a row, so the list can say "Revoked", not just "Expired").
alter table member_invites add column if not exists revoked_at timestamptz;

-- Record a meetup: "Presented by" is free text of up to 60 characters (founder, round 33).
alter table meetups add column if not exists presented_by varchar(60);

-- Trash with a 7-day undo. Deleting a meetup or a book copies the row and everything that hangs off it into one JSON
-- snapshot here, then removes the live rows. The public pages never see this table, so no query anywhere needs a
-- "deleted_at" filter (Brandur's approach, round 29). Restore re-inserts from the snapshot while it has not expired.
create table if not exists admin_trash (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('meetup', 'book', 'member')),
  key text not null,                 -- meetup number, book id or member id
  label text not null,               -- what the admin recognises it by
  snapshot jsonb not null,           -- { "table_name": [row, ...], ... } in insert order
  deleted_by uuid,
  deleted_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  restored_at timestamptz
);
create index if not exists ix_admin_trash_open on admin_trash (kind, deleted_at desc) where restored_at is null;
alter table admin_trash enable row level security;
revoke all on admin_trash from anon, authenticated;

commit;

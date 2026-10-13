-- Rules, search, rate limit and access control for the BBB demo. 2026-10-13.
-- SQLite triggers are NOT ported (admin writes are out of the demo); see notes at the bottom.
begin;

-- Partial unique indexes (ported as-is from the SQLite migrations).
create unique index uq_book_series_position on canonical_books (series_id, series_position)
  where series_id is not null and series_position is not null;
-- uq_editions_manual is created (as a partial index) in the schema file.
create unique index uq_series_normalized_title on series (normalized_title)
  where normalized_title is not null;
create unique index ux_members_member_code on members (member_code)
  where member_code is not null;

-- The one trigger rule kept, as a CHECK: a mention points at exactly one of a book or a series.
-- Verified on the SQLite copy: 0 of 3,691 discussions violate it.
alter table discussions add constraint ck_mention_one_target
  check ((canonical_book_id is null) <> (series_id is null));

-- Search: trigram indexes for ilike '%q%' on titles and author names.
create extension if not exists pg_trgm with schema extensions;
create index ix_books_title_trgm on canonical_books using gin (title extensions.gin_trgm_ops);
create index ix_authors_name_trgm on authors using gin (full_name extensions.gin_trgm_ops);

-- Rate limit: Postgres counter table (replaces the in-memory limiter, which cannot work across serverless instances).
-- ponytail: fixed window per bucket; sliding window or token bucket if bursts at window edges matter.
create table rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);
create function hit_rate_limit(p_bucket text, p_window_seconds integer, p_limit integer)
returns boolean language plpgsql set search_path = public as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into rate_limits (bucket, window_start, hits) values (p_bucket, w, 1)
  on conflict (bucket, window_start) do update set hits = rate_limits.hits + 1
  returning hits into n;
  return n <= p_limit;
end $$;
revoke execute on function hit_rate_limit(text, integer, integer) from public, anon, authenticated;

-- Access control: deny by default, then open only the catalog tables to the Data API.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

grant select on authors, canonical_books, series, media_categories, meetups, venues to anon, authenticated;
create policy public_read on authors for select to anon, authenticated using (true);
create policy public_read on canonical_books for select to anon, authenticated using (true);
create policy public_read on series for select to anon, authenticated using (true);
create policy public_read on media_categories for select to anon, authenticated using (true);
create policy public_read on meetups for select to anon, authenticated using (true);
create policy public_read on venues for select to anon, authenticated using (true);
-- Everything else (members, meetup_attendance, removed_members_archive, discussions, sources, resources, import_*) has
-- RLS on, no policy and no grant: unreachable from the browser. Server route handlers read them over the pooled DB connection.

commit;

-- Not ported (14 SQLite triggers): trg_book_delete_unlinks_imports, trg_book_position_*, trg_edition_*, trg_media_category_*,
-- trg_member_status_*, trg_series_*, trg_work_*. They guard writes; the demo is read-only for admin data.

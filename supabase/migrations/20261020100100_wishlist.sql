-- Wishlist (Slice B). 2026-10-20. Apply after 20261020100000_member_picks.sql (no dependency, order only keeps the log tidy).
-- Private by default: members.wishlist_public is false until the member switches it.
begin;

alter table members add column wishlist_public boolean not null default false;

create table wishlist_items (
  id         uuid primary key default gen_random_uuid(),
  member_id  varchar(36) not null references members (id) on delete cascade,
  title      text not null check (length(title) between 1 and 300),
  author     text check (author is null or length(author) <= 200),
  source     text not null default 'manual' check (source in ('manual', 'goodreads')),
  created_at timestamptz not null default now()
);
-- The same book (title + author, ignoring case) once per member.
create unique index ux_wishlist_member_book on wishlist_items (member_id, lower(title), lower(coalesce(author, '')));
create index ix_wishlist_member on wishlist_items (member_id, created_at desc);

alter table wishlist_items enable row level security;
revoke all on wishlist_items from anon, authenticated;

commit;

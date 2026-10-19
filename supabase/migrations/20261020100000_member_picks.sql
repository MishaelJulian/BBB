-- Shared Closet Picks (Slice B). 2026-10-20. Apply once, before 20261020100100_wishlist.sql.
-- A member keeps at most four picks (enforced in the route, inside a transaction that locks the member row).
-- pick_log is the admin History tab: who added or removed what, with the book title and name copied in so the row stays readable.
begin;

create table member_picks (
  member_id  varchar(36) not null references members (id) on delete cascade,
  book_id    varchar(36) not null references canonical_books (id) on delete cascade,
  tag        text not null check (tag in ('Favourite', 'Want to read')),
  created_at timestamptz not null default now(),
  primary key (member_id, book_id)
);
create index ix_member_picks_book on member_picks (book_id);

create table pick_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  member_id   varchar(36) not null,
  member_name text not null,
  action      text not null check (action in ('added', 'removed', 'retagged')),
  book_id     varchar(36) not null,
  book_title  text not null,
  tag         text
);
create index ix_pick_log_at on pick_log (at desc);
create index ix_pick_log_member on pick_log (member_id);

-- Same access model as the rest: only the route handlers (database connection) read or write.
alter table member_picks enable row level security;
alter table pick_log enable row level security;
revoke all on member_picks, pick_log from anon, authenticated;

commit;

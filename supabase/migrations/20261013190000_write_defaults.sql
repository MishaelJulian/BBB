-- Defaults the Python models supplied in code, so inserts from the route handlers cannot omit a required column. 2026-10-13.
do $$
declare t text;
begin
  foreach t in array array['authors','venues','members','canonical_books','meetups','discussions','meetup_attendance','resources'] loop
    execute format('alter table public.%I alter column id set default gen_random_uuid()::text', t);
    execute format('alter table public.%I alter column created_at set default now()', t);
    execute format('alter table public.%I alter column updated_at set default now()', t);
  end loop;
end $$;
alter table removed_members_archive alter column removed_at set default now();
alter table canonical_books alter column language set default 'en';
alter table canonical_books alter column media_type set default 'book';
alter table discussions alter column confidence_score set default 1.0;
alter table discussions alter column media_type set default 'book';
alter table venues alter column city set default 'Bengaluru';
alter table meetups alter column format set default 'IN_PERSON';

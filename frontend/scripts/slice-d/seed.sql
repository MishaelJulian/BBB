-- LOCAL throwaway database only (slice_d). Mirrors the stub-auth users and links one member to qa-other so reset codes can be issued.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a2', 'qa-admin@bbb.test'),
  ('00000000-0000-0000-0000-0000000000a1', 'qa-member@bbb.test'),
  ('00000000-0000-0000-0000-0000000000a3', 'qa-other@bbb.test')
on conflict (id) do update set email = excluded.email;
update members set auth_user_id = '00000000-0000-0000-0000-0000000000a3' where id = 'c9bcb3ef-5b29-47e6-8e48-abdf6a205533' and auth_user_id is null;

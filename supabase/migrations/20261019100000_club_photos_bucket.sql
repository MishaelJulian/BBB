-- Public bucket for the meetup #100 photos on Home and the meetup page. Public read comes from the bucket flag;
-- there are deliberately no write policies, so only the dashboard / service role can upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('club-photos', 'club-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

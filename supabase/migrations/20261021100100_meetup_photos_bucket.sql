-- Public bucket for meetup group photos uploaded from the admin tool (server route, service role key).
-- Public read comes from the bucket flag; there are deliberately no write policies, so only the service role can upload.
-- 4.5 MB matches the Vercel request body limit.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meetup-photos', 'meetup-photos', true, 4718592, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

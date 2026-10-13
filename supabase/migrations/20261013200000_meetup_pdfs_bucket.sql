-- Public bucket for the published meetup PDFs. Public read comes from the bucket flag;
-- there are deliberately no write policies, so only the dashboard / service role can upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meetup-pdfs', 'meetup-pdfs', true, 20971520, array['application/pdf'])
on conflict (id) do nothing;

-- Point the 12 published meetup PDFs at the public Storage bucket (files uploaded by hand first).
update meetups
set pdf_url = 'https://fdvjykrwckhovfocnnyy.supabase.co/storage/v1/object/public/meetup-pdfs/bbb_meetup_' || meetup_number || '.pdf'
where pdf_url like '/assets/generated_pdfs/%';

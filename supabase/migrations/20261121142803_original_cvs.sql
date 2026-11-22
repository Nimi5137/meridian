insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('career-documents','career-documents',false,5242880,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
create policy career_document_read on storage.objects for select to authenticated using(bucket_id='career-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy career_document_insert on storage.objects for insert to authenticated with check(bucket_id='career-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy career_document_delete on storage.objects for delete to authenticated using(bucket_id='career-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create table public.original_cvs (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, storage_path text not null unique, filename text not null, size_bytes integer not null check(size_bytes between 1 and 5242880), created_at timestamptz not null default now());
create index original_cvs_user_idx on public.original_cvs(user_id,created_at desc);
alter table public.original_cvs enable row level security;
create policy originals_read on public.original_cvs for select to authenticated using(user_id=(select auth.uid()));
create policy originals_insert on public.original_cvs for insert to authenticated with check(user_id=(select auth.uid()) and split_part(storage_path,'/',1)=(select auth.uid())::text);

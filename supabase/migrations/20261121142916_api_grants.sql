-- Explicit API privileges; RLS remains the row-level authorization boundary.
grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.jobs to authenticated;
grant select, insert, update, delete on public.applications to authenticated;
grant select on public.application_events to authenticated;
grant select, insert on public.application_documents to authenticated;
grant select, insert on public.original_cvs to authenticated;

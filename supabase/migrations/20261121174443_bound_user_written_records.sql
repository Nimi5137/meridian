-- Limit untrusted direct-API writes as well as UI writes. NOT VALID protects legacy rows from migration failure; new writes and updates are checked.
alter table public.profiles add constraint profiles_field_limits check (length(full_name)<=120 and length(headline)<=200 and length(location)<=200 and length(summary)<=6000 and length(skills)<=3000 and length(desired_roles)<=2000 and length(work_preferences)<=2000) not valid;
alter table public.applications add constraint applications_notes_limit check(length(notes)<=6000) not valid;
alter table public.original_cvs add constraint original_cv_text_limits check(length(filename)<=200 and length(storage_path)<=1024) not valid;
alter table public.application_documents add constraint application_document_provider_limits check(coalesce(length(provider),0)<=160 and coalesce(length(model),0)<=160) not valid;
alter table public.profile_imports add constraint profile_import_bounds check(octet_length(proposed::text)<=65536 and length(provider)<=160 and length(model)<=160) not valid;
alter table public.job_matches add constraint job_matches_bounds check(octet_length(analysis::text)<=65536 and length(provider)<=160 and length(model)<=160) not valid;

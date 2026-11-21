-- Run only as a privileged operator on disposable staging data. All changes roll back.
begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000011'),('00000000-0000-4000-8000-000000000012');
insert into public.profiles(user_id,full_name,summary) values ('00000000-0000-4000-8000-000000000011','Original','Preserve me');
insert into public.original_cvs(id,user_id,storage_path,filename,size_bytes) values ('00000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000011/test.pdf','test.pdf',1);
insert into public.profile_imports(id,user_id,original_cv_id,proposed,provider,model) values ('00000000-0000-4000-8000-000000000014','00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000013','{"full_name":"Proposed","headline":"","location":"","summary":"New summary","skills":""}','test','test');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000012';
do $$ begin if exists(select 1 from public.profile_imports) or public.apply_profile_import('00000000-0000-4000-8000-000000000014',null,array['full_name'])<>'not_found' then raise exception 'Import isolation failed'; end if; end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000011';
do $$ declare v timestamptz; begin select updated_at into v from public.profiles; if public.apply_profile_import('00000000-0000-4000-8000-000000000014','2000-01-01',array['full_name'])<>'changed' then raise exception 'Version guard failed'; end if; if public.apply_profile_import('00000000-0000-4000-8000-000000000014',v,array['full_name'])<>'applied' then raise exception 'Import failed'; end if; if (select full_name from public.profiles)<>'Proposed' or (select summary from public.profiles)<>'Preserve me' then raise exception 'Unselected value changed'; end if; end $$;
rollback;

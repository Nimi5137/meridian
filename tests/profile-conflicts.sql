-- Run as a privileged operator on disposable staging only. All changes roll back.
begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000131'),('00000000-0000-4000-8000-000000000132');
insert into public.original_cvs(id,user_id,storage_path,filename,size_bytes) values('00000000-0000-4000-8000-000000000133','00000000-0000-4000-8000-000000000131','00000000-0000-4000-8000-000000000131/cv.pdf','cv.pdf',1);
insert into public.profile_imports(id,user_id,original_cv_id,proposed,provider,model) values('00000000-0000-4000-8000-000000000134','00000000-0000-4000-8000-000000000131','00000000-0000-4000-8000-000000000133','{"full_name":"From CV","headline":"","location":"","summary":"CV summary","skills":""}','test','test');
set local role authenticated;set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000131';
do $$ declare p jsonb:='{"full_name":"Original","headline":"","location":"","summary":"Keep","skills":"","desired_roles":"","work_preferences":""}'; a jsonb; b jsonb; v timestamptz;begin
 a:=public.save_profile_if_unchanged(null,p);v:=(a->>'version')::timestamptz;
 if public.apply_profile_import('00000000-0000-4000-8000-000000000134',v,array['full_name'])<>'applied' then raise exception 'Import failed';end if;
 if (select source from public.profile_field_sources where field='full_name')<>'cv_import' or (select import_id from public.profile_field_sources where field='full_name')<>'00000000-0000-4000-8000-000000000134' then raise exception 'Missing CV provenance';end if;
 if (select source from public.profile_field_sources where field='summary')<>'manual' or (select summary from public.profiles)<>'Keep' then raise exception 'Unselected field changed';end if;
 b:=public.save_profile_if_unchanged(v,p);if b->>'outcome'<>'changed' or b->'profile'->>'full_name'<>'From CV' then raise exception 'Stale save not blocked';end if;
 v:=(b->'profile'->>'updated_at')::timestamptz;b:=public.save_profile_if_unchanged(v,p);if b->>'outcome'<>'saved' or (select source from public.profile_field_sources where field='full_name')<>'manual' then raise exception 'Manual update failed';end if;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000132';
do $$ begin if exists(select 1 from public.profile_field_sources) then raise exception 'Source metadata leaked';end if;if public.apply_profile_import('00000000-0000-4000-8000-000000000134',null,array['full_name'])<>'not_found' then raise exception 'Cross-user import';end if;end $$;
reset role;delete from auth.users where id='00000000-0000-4000-8000-000000000131';do $$ begin if exists(select 1 from public.profile_field_sources where user_id='00000000-0000-4000-8000-000000000131') then raise exception 'Cascade failed';end if;end $$;
rollback;

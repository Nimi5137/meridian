-- Synthetic-only checks; all data rolls back.
begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000211');
insert into public.jobs(id,source,source_id,title,company,listing_url) values('00000000-0000-4000-8000-000000000212','test','bounds-test','Role','Company','https://example.org');
do $$ begin
 begin insert into public.profiles(user_id,summary) values('00000000-0000-4000-8000-000000000211',repeat('x',6001)); raise exception 'Oversized profile accepted'; exception when check_violation then null; end;
 insert into public.profiles(user_id,summary) values('00000000-0000-4000-8000-000000000211','Valid');
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join (values('anon'),('authenticated')) r(name) where n.nspname='public' and c.relkind='r' and (has_table_privilege(r.name,c.oid,'TRUNCATE') or has_table_privilege(r.name,c.oid,'TRIGGER') or has_table_privilege(r.name,c.oid,'REFERENCES'))) then raise exception 'Dangerous table privilege present';end if;
end $$;
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000211';
do $$ begin
 begin insert into public.job_matches(user_id,job_id,analysis,provider,model) values('00000000-0000-4000-8000-000000000211','00000000-0000-4000-8000-000000000212',jsonb_build_object('data',repeat('x',65537)),'test','test'); raise exception 'Oversized match accepted'; exception when check_violation then null; end;
 insert into public.job_matches(user_id,job_id,analysis,provider,model) values('00000000-0000-4000-8000-000000000211','00000000-0000-4000-8000-000000000212','{}','test','test');
end $$;
reset role;
rollback;

-- Synthetic records; always execute inside this rollback-only transaction.
begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000201'),('00000000-0000-4000-8000-000000000202');
insert into public.jobs(id,source,source_id,title,company,listing_url) values ('00000000-0000-4000-8000-000000000203','test','interview-test','Role','Company','https://example.org');
insert into public.applications(id,user_id,job_id) values ('00000000-0000-4000-8000-000000000204','00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000203');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000201';
insert into public.interviews(id,user_id,application_id,title,starts_at,timezone) values ('00000000-0000-4000-8000-000000000205','00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000204','Interview','2027-02-04 14:30+00','Europe/Budapest');
do $$ declare old_version uuid; begin
 select version into old_version from public.interviews where id='00000000-0000-4000-8000-000000000205';
 update public.interviews set title='Updated' where id='00000000-0000-4000-8000-000000000205' and version=old_version;
 if not found or exists(select 1 from public.interviews where id='00000000-0000-4000-8000-000000000205' and version=old_version) then raise exception 'Version did not change'; end if;
 update public.interviews set title='Stale write' where id='00000000-0000-4000-8000-000000000205' and version=old_version;
 if found then raise exception 'Stale write accepted'; end if;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000202';
do $$ begin
 if exists(select 1 from public.interviews where id='00000000-0000-4000-8000-000000000205') then raise exception 'Cross-user read'; end if;
 update public.interviews set title='Cross-user' where id='00000000-0000-4000-8000-000000000205'; if found then raise exception 'Cross-user update';end if;
 delete from public.interviews where id='00000000-0000-4000-8000-000000000205'; if found then raise exception 'Cross-user delete';end if;
 begin insert into public.interviews(user_id,application_id,title,starts_at,timezone) values('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000204','Wrong application',now(),'UTC'); raise exception 'Cross-owner insert';exception when foreign_key_violation then null;end;
end $$;
reset role;
delete from public.applications where id='00000000-0000-4000-8000-000000000204';
do $$ begin if exists(select 1 from public.interviews where id='00000000-0000-4000-8000-000000000205') then raise exception 'Application cascade failed'; end if;end $$;
rollback;

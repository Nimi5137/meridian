-- Run as a privileged database operator on a disposable/staging database only.
-- All synthetic data is rolled back. Never use against a database with these UUIDs.
begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into public.profiles(user_id,full_name) values ('00000000-0000-4000-8000-000000000001','test one'),('00000000-0000-4000-8000-000000000002','test two');
insert into public.jobs(id,source,source_id,title,company,listing_url) values ('00000000-0000-4000-8000-000000000003','test','test','test','test','https://example.org');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
do $$ begin if (select count(*) from public.profiles) <> 1 or (select full_name from public.profiles limit 1) <> 'test one' then raise exception 'Profile isolation failed'; end if; end $$;
insert into public.applications(id,user_id,job_id) values ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003');
do $$ declare i integer; begin
 if (select count(*) from public.application_events) <> 1 then raise exception 'Missing activity event'; end if;
 begin insert into public.applications(user_id,job_id) values ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003'); raise exception 'Duplicate accepted'; exception when unique_violation then null; end;
 for i in 1..10 loop if not public.consume_ai_request() then raise exception 'Rate limit rejected too early'; end if; end loop;
 if public.consume_ai_request() then raise exception 'Rate limit failed'; end if;
end $$;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
do $$ begin if exists(select 1 from public.applications) or exists(select 1 from public.application_events) then raise exception 'Cross-user visibility'; end if; end $$;
rollback;

-- Run as a privileged operator on disposable staging only; all fixtures roll back.
begin;
insert into auth.users(id) values ('f59c6d04-b8bf-42f0-8d2a-f99bc39b9c11'),('f59c6d04-b8bf-42f0-8d2a-f99bc39b9c12');
set local role authenticated; set local request.jwt.claim.sub='f59c6d04-b8bf-42f0-8d2a-f99bc39b9c11';
select set_config('test.interview_usage',public.begin_ai_usage('interview','groq','test-model')::text,true);
do $$ begin if current_setting('test.interview_usage')='' or not exists(select 1 from public.ai_usage_observations where id=current_setting('test.interview_usage')::uuid and task='interview') then raise exception 'missing usage'; end if; end $$;
set local request.jwt.claim.sub='f59c6d04-b8bf-42f0-8d2a-f99bc39b9c12';
do $$ begin if exists(select 1 from public.ai_usage_observations where id=current_setting('test.interview_usage')::uuid) or public.finish_ai_usage(current_setting('test.interview_usage')::uuid,true,1,1) then raise exception 'cross-user access'; end if; end $$;
set local request.jwt.claim.sub='f59c6d04-b8bf-42f0-8d2a-f99bc39b9c11';
do $$ begin if not public.finish_ai_usage(current_setting('test.interview_usage')::uuid,true,1,1) then raise exception 'completion failed'; end if; end $$;
rollback;

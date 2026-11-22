-- Run as a privileged operator on disposable staging only. All changes roll back.
begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000111'),('00000000-0000-4000-8000-000000000112');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000111';
select set_config('test.usage',public.begin_ai_usage('matching','groq','test-model')::text,true);
do $$ begin if (select count(*) from public.ai_usage_observations)<>1 then raise exception 'Missing usage record';end if;if public.finish_ai_usage(current_setting('test.usage')::uuid,true,-1,2) then raise exception 'Negative token count accepted';end if;end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000112';
do $$ begin if exists(select 1 from public.ai_usage_observations) then raise exception 'Cross-user read';end if;if public.finish_ai_usage(current_setting('test.usage')::uuid,true,10,2) then raise exception 'Cross-user completion';end if;end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000111';
do $$ declare i integer; v uuid;begin if not public.finish_ai_usage(current_setting('test.usage')::uuid,true,10,2) then raise exception 'Completion failed';end if;if public.finish_ai_usage(current_setting('test.usage')::uuid,false,null,null) then raise exception 'Duplicate completion';end if;for i in 1..9 loop v:=public.begin_ai_usage('cv','groq','test-model');if v is null then raise exception 'Premature limit';end if;end loop;if public.begin_ai_usage('cv','groq','test-model') is not null then raise exception 'Limit bypassed';end if;end $$;
reset role;delete from auth.users where id='00000000-0000-4000-8000-000000000111';do $$ begin if exists(select 1 from public.ai_usage_observations where user_id='00000000-0000-4000-8000-000000000111') then raise exception 'Cascade failed';end if;end $$;
rollback;

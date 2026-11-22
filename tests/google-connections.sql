-- Run as a privileged operator on disposable staging only. All changes roll back.
begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000151'),('00000000-0000-4000-8000-000000000152');
set local role service_role;
do $$ declare u uuid:='00000000-0000-4000-8000-000000000151';h text:=repeat('a',64); lease uuid:=gen_random_uuid();begin
 perform public.start_integration_oauth(u,'gmail',h,repeat('x',50));if public.claim_integration_oauth('00000000-0000-4000-8000-000000000152',h) is not null then raise exception 'Cross-user state';end if;
 if public.claim_integration_oauth(u,h)->>'kind'<>'gmail' then raise exception 'Claim failed';end if;if public.claim_integration_oauth(u,h) is not null then raise exception 'State replay';end if;
 if not public.finish_integration_oauth(u,'gmail',h,'person@example.org',repeat('c',50),clock_timestamp()-interval '1 second') then raise exception 'Finish failed';end if;
 if public.claim_integration_refresh(u,'gmail',lease) is null then raise exception 'Refresh claim failed';end if;if public.claim_integration_refresh(u,'gmail',gen_random_uuid()) is not null then raise exception 'Concurrent lease';end if;
 if public.finish_integration_refresh(u,'gmail',gen_random_uuid(),repeat('b',50),clock_timestamp()+interval '1 hour') then raise exception 'Wrong lease accepted';end if;
 if not public.finish_integration_refresh(u,'gmail',lease,repeat('b',50),clock_timestamp()+interval '1 hour') then raise exception 'Refresh completion failed';end if;
 perform public.start_integration_oauth(u,'gmail',h,repeat('x',50));perform public.claim_integration_oauth(u,h);perform public.disconnect_integration(u,'gmail');
 if public.finish_integration_oauth(u,'gmail',h,'person@example.org',repeat('c',50),clock_timestamp()+interval '1 hour') then raise exception 'Disconnected state resumed';end if;
end $$;
rollback;

-- Run as a privileged operator on disposable staging only. All changes roll back.
begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000171'),('00000000-0000-4000-8000-000000000172');
set local role service_role;
do $$ declare u uuid:='00000000-0000-4000-8000-000000000171';h text:=repeat('c',64); lease uuid:=gen_random_uuid();begin
 perform public.start_integration_oauth(u,'outlook',h,repeat('x',50));if public.claim_integration_oauth('00000000-0000-4000-8000-000000000172',h) is not null then raise exception 'Cross-user state';end if;
 if public.claim_integration_oauth(u,h)->>'kind'<>'outlook' then raise exception 'Claim failed';end if;if public.claim_integration_oauth(u,h) is not null then raise exception 'Replay';end if;
 if not public.finish_integration_oauth(u,'outlook',h,'person@example.org',repeat('c',50),clock_timestamp()-interval '1 second') then raise exception 'Finish failed';end if;
 if public.claim_integration_refresh(u,'outlook',lease) is null then raise exception 'Refresh failed';end if;
 if public.finish_integration_refresh(u,'outlook',gen_random_uuid(),repeat('b',50),clock_timestamp()+interval '1 hour') then raise exception 'Wrong lease';end if;
 perform public.disconnect_integration(u,'outlook');if public.finish_integration_refresh(u,'outlook',lease,repeat('b',50),clock_timestamp()+interval '1 hour') then raise exception 'Disconnected token refreshed';end if;
end $$;
reset role;
rollback;

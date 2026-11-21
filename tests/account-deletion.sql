-- Synthetic fixture only; runs inside a rollback transaction. Do not run against a real UUID.
begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000191');
set local role service_role;
do $$
declare u uuid:='00000000-0000-4000-8000-000000000191'; a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid();
begin
 if public.begin_account_deletion(u)<>'started' then raise exception 'Begin failed'; end if;
 if public.begin_account_deletion(u)<>'resuming' then raise exception 'Resume failed'; end if;
 if public.claim_checkout(u) is not null then raise exception 'Checkout not blocked'; end if;
 begin perform public.start_integration_oauth(u,'gmail',repeat('a',64),repeat('b',20)); raise exception 'OAuth not blocked'; exception when raise_exception then if sqlerrm='OAuth not blocked' then raise; end if; end;
 if not public.claim_account_deletion(u,a) or public.claim_account_deletion(u,b) then raise exception 'Lease failure'; end if;
 if public.finish_account_deletion_job(u,a) then raise exception 'Finished while user exists'; end if;
 perform public.release_account_deletion_lease(u,b);
 if public.claim_account_deletion(u,b) then raise exception 'Wrong token released lease'; end if;
 perform public.release_account_deletion_lease(u,a);
 if not public.claim_account_deletion(u,b) then raise exception 'Release failed'; end if;
end $$;
reset role;
delete from auth.users where id='00000000-0000-4000-8000-000000000191';
set local role service_role;
do $$ declare j record; begin
 select * into j from public.account_deletion_jobs where user_id='00000000-0000-4000-8000-000000000191';
 if public.account_user_exists(j.user_id) or not public.finish_account_deletion_job(j.user_id,j.lease_token) then raise exception 'Finalization failed'; end if;
end $$;
reset role;
rollback;

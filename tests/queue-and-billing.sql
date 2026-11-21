-- Run only as a privileged operator on disposable staging data. All changes roll back.
begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000041'),('00000000-0000-4000-8000-000000000042');
insert into public.billing_customers(user_id,stripe_customer_id) values ('00000000-0000-4000-8000-000000000041','cus_test');
insert into public.job_boards(id,source,board,company) values('00000000-0000-4000-8000-000000000031','greenhouse','testingboard','Test');
set local role service_role;
do $$ declare t uuid; task record; begin
 if public.enqueue_due_boards()<>1 or public.enqueue_due_boards()<>0 then raise exception 'enqueue failed'; end if;
 select * into task from public.claim_ingestion_task(); if task.task_id is null then raise exception 'claim failed'; end if;
 if public.finish_ingestion_task(task.task_id,gen_random_uuid(),true,0,null) then raise exception 'wrong lease token accepted'; end if;
 if not public.finish_ingestion_task(task.task_id,task.token,false,0,'test') then raise exception 'finish failed'; end if;
 if exists(select 1 from public.claim_ingestion_task()) then raise exception 'retry not delayed'; end if;
 t:=public.claim_checkout('00000000-0000-4000-8000-000000000041'); if t is null or public.claim_checkout('00000000-0000-4000-8000-000000000041') is not null then raise exception 'checkout reservation failed'; end if;
 perform public.release_checkout('00000000-0000-4000-8000-000000000041',t);
 if not public.record_billing_subscription('evt_new','00000000-0000-4000-8000-000000000041','cus_test','sub_test','active','price_test',null,200) then raise exception 'event failed'; end if;
 if public.record_billing_subscription('evt_new','00000000-0000-4000-8000-000000000041','cus_test','sub_test','canceled','price_test',null,200) then raise exception 'duplicate event accepted'; end if;
 perform public.record_billing_subscription('evt_old','00000000-0000-4000-8000-000000000041','cus_test','sub_test','canceled','price_test',null,100);
 if (select status from public.billing_subscriptions where stripe_subscription_id='sub_test')<>'active' then raise exception 'event ordering failed'; end if;
end $$;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000042';
do $$ begin if exists(select 1 from public.billing_subscriptions) or exists(select 1 from public.billing_customers) then raise exception 'billing isolation failed'; end if; end $$;
rollback;

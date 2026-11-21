-- Run only on a disposable staging database. All data is rolled back.
begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000061');
insert into public.career_entries(user_id,kind,title) values ('00000000-0000-4000-8000-000000000061','project','Test');
insert into public.billing_customers(user_id,stripe_customer_id) values ('00000000-0000-4000-8000-000000000061','cus_delete_test');
insert into public.billing_subscriptions(stripe_subscription_id,user_id,stripe_customer_id,status,price_id) values ('sub_delete_test','00000000-0000-4000-8000-000000000061','cus_delete_test','active','price_test');
delete from auth.users where id='00000000-0000-4000-8000-000000000061';
do $$ begin if exists(select 1 from public.profiles where user_id='00000000-0000-4000-8000-000000000061') or exists(select 1 from public.billing_customers where stripe_customer_id='cus_delete_test') then raise exception 'Account cascade failed'; end if; end $$;
rollback;

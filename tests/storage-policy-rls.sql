-- Disposable, rollback-only metadata policy check on staging. This does NOT call
-- Storage HTTP APIs or create object bytes. Never delete storage metadata via SQL.
begin;
insert into auth.users(id) values ('3c66a751-07f3-49af-90c1-8dc844f8c111'),('3c66a751-07f3-49af-90c1-8dc844f8c112');
set local role authenticated;
set local request.jwt.claim.sub='3c66a751-07f3-49af-90c1-8dc844f8c111';
insert into storage.objects(bucket_id,name) values ('career-documents','3c66a751-07f3-49af-90c1-8dc844f8c111/transaction-check.pdf');
do $$ begin
 if (select count(*) from storage.objects where name='3c66a751-07f3-49af-90c1-8dc844f8c111/transaction-check.pdf')<>1 then raise exception 'owner cannot see metadata';end if;
 begin insert into storage.objects(bucket_id,name) values ('career-documents','3c66a751-07f3-49af-90c1-8dc844f8c112/transaction-check.pdf'); raise exception 'cross-user insert accepted';exception when insufficient_privilege then null;end;
end $$;
set local request.jwt.claim.sub='3c66a751-07f3-49af-90c1-8dc844f8c112';
do $$ begin if exists(select 1 from storage.objects where name='3c66a751-07f3-49af-90c1-8dc844f8c111/transaction-check.pdf') then raise exception 'cross-user read accepted';end if;end $$;
rollback;

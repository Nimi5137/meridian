-- Run as a privileged operator on disposable staging only. All changes roll back.
begin;
insert into public.job_boards(id,source,board,company) values('00000000-0000-4000-8000-000000000091','greenhouse','fenceboard','Test');
set local role service_role;
do $$ declare t record; rows integer; job jsonb:='[{"source":"greenhouse","source_id":"fenceboard:1","title":"Role","company":"Test","location":"","description":"","listing_url":"https://example.org/job","published_at":null,"last_verified_at":"2026-01-01T00:00:00Z"}]'; begin
 perform public.enqueue_due_boards(); select * into t from public.claim_ingestion_task(); if t.task_id is null then raise exception 'claim failed';end if;
 begin perform public.commit_ingestion_batch(t.task_id,gen_random_uuid(),job);raise exception 'Wrong token accepted';exception when raise_exception then if sqlerrm<>'Lease lost' then raise;end if;end;
 rows:=public.commit_ingestion_batch(t.task_id,t.token,job);if rows<>1 then raise exception 'batch failed';end if;perform public.commit_ingestion_batch(t.task_id,t.token,job);
 if (select count(*) from public.jobs where source='greenhouse' and source_id='fenceboard:1')<>1 then raise exception 'Upsert duplicated';end if;
 perform public.finish_ingestion_task(t.task_id,t.token,true,1,null);begin perform public.commit_ingestion_batch(t.task_id,t.token,job);raise exception 'Finished lease accepted';exception when raise_exception then if sqlerrm<>'Lease lost' then raise;end if;end;
end $$;
rollback;

-- Run on disposable staging only; all fixture records are rolled back.
begin;
select set_config('meridian.test_a',gen_random_uuid()::text,true),set_config('meridian.test_b',gen_random_uuid()::text,true),set_config('meridian.test_entry',gen_random_uuid()::text,true);
insert into auth.users(id) values(current_setting('meridian.test_a')::uuid),(current_setting('meridian.test_b')::uuid);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('meridian.test_a'),true);
insert into public.career_entries(id,user_id,kind,title,updated_at) values(current_setting('meridian.test_entry')::uuid,auth.uid(),'project','Synthetic fixture','2000-01-01');
do $$ declare test_id uuid:=current_setting('meridian.test_entry')::uuid; v timestamptz; v2 timestamptz; begin
 select updated_at into v from public.career_entries where career_entries.id=test_id;
 if v<timestamptz '2020-01-01' then raise exception 'insert version was forged'; end if;
 if has_table_privilege('authenticated','public.career_entries','UPDATE') or has_table_privilege('authenticated','public.career_entries','DELETE') then raise exception 'direct mutation still granted'; end if;
 if public.update_career_entry_if_unchanged(test_id,v,'project','Synthetic edit','',null,null,'')<>'updated' then raise exception 'valid update failed'; end if;
 select updated_at into v2 from public.career_entries where career_entries.id=test_id;
 if v2<=v then raise exception 'version did not advance'; end if;
 if public.update_career_entry_if_unchanged(test_id,v,'project','stale','',null,null,'')<>'changed_or_unavailable' then raise exception 'stale update accepted'; end if;
 if public.delete_career_entry_if_unchanged(test_id,v)<>'changed_or_unavailable' then raise exception 'stale delete accepted'; end if;
 if public.update_career_entry_if_unchanged(test_id,v2,'project','bad','', '2024-02-30',null,'')<>'invalid' then raise exception 'bad date accepted'; end if;
 perform set_config('request.jwt.claim.sub',current_setting('meridian.test_b'),true);
 if public.update_career_entry_if_unchanged(test_id,v2,'project','cross user','',null,null,'')<>'changed_or_unavailable' then raise exception 'cross user update accepted'; end if;
 if public.delete_career_entry_if_unchanged(test_id,v2)<>'changed_or_unavailable' then raise exception 'cross user delete accepted'; end if;
 perform set_config('request.jwt.claim.sub',current_setting('meridian.test_a'),true);
 if public.delete_career_entry_if_unchanged(test_id,v2)<>'deleted' then raise exception 'valid delete failed'; end if;
end $$;
reset role;rollback;

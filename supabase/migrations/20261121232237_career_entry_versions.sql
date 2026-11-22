-- Server-owned versions and owner-scoped compare-and-swap mutations.
-- Existing entries are preserved. Callers must migrate from direct UPDATE/DELETE
-- to these functions before this migration is deployed.
create function public.set_career_entry_version() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then new.updated_at:=clock_timestamp();
 else new.updated_at:=greatest(clock_timestamp(),old.updated_at+interval '1 microsecond'); end if;
 return new;
end $$;
create trigger career_entry_version before insert or update on public.career_entries
for each row execute function public.set_career_entry_version();

revoke update,delete on public.career_entries from authenticated;

create function public.update_career_entry_if_unchanged(
 p_id uuid,p_expected timestamptz,p_kind text,p_title text,p_organization text,
 p_start_date text,p_end_date text,p_description text
) returns text language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); start_value date; end_value date; affected integer;
begin
 if uid is null or p_id is null or p_expected is null or not isfinite(p_expected)
    or p_kind is null or p_kind not in ('experience','education','project','certification','volunteering','award','publication')
    or p_title is null or length(btrim(p_title)) not between 1 and 200
    or p_organization is null or length(btrim(p_organization))>200
    or p_description is null or length(btrim(p_description))>6000
    or (p_start_date is not null and p_start_date !~ '^\d{4}-\d{2}-\d{2}$')
    or (p_end_date is not null and p_end_date !~ '^\d{4}-\d{2}-\d{2}$') then return 'invalid'; end if;
 begin
  start_value:=p_start_date::date;end_value:=p_end_date::date;
 exception when invalid_datetime_format or datetime_field_overflow then return 'invalid'; end;
 if start_value is not null and end_value is not null and end_value<start_value then return 'invalid'; end if;
 update public.career_entries set kind=p_kind,title=btrim(p_title),organization=btrim(p_organization),
  start_date=start_value,end_date=end_value,description=btrim(p_description)
 where id=p_id and user_id=uid and updated_at=p_expected;
 get diagnostics affected=row_count;
 return case when affected=1 then 'updated' else 'changed_or_unavailable' end;
end $$;

create function public.delete_career_entry_if_unchanged(p_id uuid,p_expected timestamptz)
returns text language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); affected integer;
begin
 if uid is null or p_id is null or p_expected is null or not isfinite(p_expected) then return 'invalid'; end if;
 delete from public.career_entries where id=p_id and user_id=uid and updated_at=p_expected;
 get diagnostics affected=row_count;
 return case when affected=1 then 'deleted' else 'changed_or_unavailable' end;
end $$;
revoke all on function public.update_career_entry_if_unchanged(uuid,timestamptz,text,text,text,text,text,text) from public;
revoke all on function public.delete_career_entry_if_unchanged(uuid,timestamptz) from public;
grant execute on function public.update_career_entry_if_unchanged(uuid,timestamptz,text,text,text,text,text,text) to authenticated;
grant execute on function public.delete_career_entry_if_unchanged(uuid,timestamptz) to authenticated;

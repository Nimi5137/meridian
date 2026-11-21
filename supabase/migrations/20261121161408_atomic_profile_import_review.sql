revoke update on public.profile_imports from authenticated;
drop policy profile_import_update on public.profile_imports;
create function public.apply_profile_import(p_id uuid, p_expected timestamptz, p_fields text[]) returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); imp public.profile_imports%rowtype; existing public.profiles%rowtype; field text; max_length integer;
begin
 if uid is null or p_fields is null or cardinality(p_fields)=0 or cardinality(p_fields)>5 or not (p_fields <@ array['full_name','headline','location','summary','skills']::text[]) then return 'invalid'; end if;
 select * into imp from public.profile_imports where id=p_id and user_id=uid and status='pending' for update;
 if not found then return 'not_found'; end if;
 foreach field in array p_fields loop
  max_length := case field when 'full_name' then 120 when 'headline' then 200 when 'location' then 200 when 'summary' then 6000 when 'skills' then 3000 end;
  if jsonb_typeof(imp.proposed -> field) is distinct from 'string' or length(trim(imp.proposed ->> field))=0 or length(imp.proposed ->> field)>max_length then return 'invalid'; end if;
 end loop;
 select * into existing from public.profiles where user_id=uid for update;
 if found then
  if p_expected is distinct from existing.updated_at then return 'changed'; end if;
  update public.profiles set full_name=case when 'full_name'=any(p_fields) then imp.proposed->>'full_name' else full_name end, headline=case when 'headline'=any(p_fields) then imp.proposed->>'headline' else headline end, location=case when 'location'=any(p_fields) then imp.proposed->>'location' else location end, summary=case when 'summary'=any(p_fields) then imp.proposed->>'summary' else summary end, skills=case when 'skills'=any(p_fields) then imp.proposed->>'skills' else skills end, updated_at=now() where user_id=uid;
 else
  if p_expected is not null then return 'changed'; end if;
  insert into public.profiles(user_id,full_name,headline,location,summary,skills) values (uid,case when 'full_name'=any(p_fields) then imp.proposed->>'full_name' else '' end,case when 'headline'=any(p_fields) then imp.proposed->>'headline' else '' end,case when 'location'=any(p_fields) then imp.proposed->>'location' else '' end,case when 'summary'=any(p_fields) then imp.proposed->>'summary' else '' end,case when 'skills'=any(p_fields) then imp.proposed->>'skills' else '' end);
 end if;
 update public.profile_imports set status='reviewed',reviewed_at=now() where id=p_id;
 return 'applied';
end $$;
revoke all on function public.apply_profile_import(uuid,timestamptz,text[]) from public;
grant execute on function public.apply_profile_import(uuid,timestamptz,text[]) to authenticated;

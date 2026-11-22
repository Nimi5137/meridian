create or replace function public.save_profile_if_unchanged(p_expected timestamptz,p_profile jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); current_row public.profiles%rowtype; old_values jsonb; field text; max_length integer; created boolean:=false;
begin
 if uid is null or jsonb_typeof(p_profile) is distinct from 'object' or (select count(*) from jsonb_object_keys(p_profile))<>7 then return jsonb_build_object('outcome','invalid'); end if;
 foreach field in array array['full_name','headline','location','summary','skills','desired_roles','work_preferences'] loop
  max_length:=case field when 'full_name' then 120 when 'headline' then 200 when 'location' then 200 when 'summary' then 6000 when 'skills' then 3000 else 2000 end;
  if jsonb_typeof(p_profile->field) is distinct from 'string' or length(p_profile->>field)>max_length then return jsonb_build_object('outcome','invalid'); end if;
 end loop;
 select * into current_row from public.profiles where user_id=uid for update;
 if found then
  if p_expected is distinct from current_row.updated_at then return jsonb_build_object('outcome','changed','profile',to_jsonb(current_row)); end if;
  old_values:=to_jsonb(current_row);
  update public.profiles set full_name=p_profile->>'full_name',headline=p_profile->>'headline',location=p_profile->>'location',summary=p_profile->>'summary',skills=p_profile->>'skills',desired_roles=p_profile->>'desired_roles',work_preferences=p_profile->>'work_preferences' where user_id=uid returning * into current_row;
 else
  if p_expected is not null then return jsonb_build_object('outcome','changed','profile',null); end if;
  insert into public.profiles(user_id,full_name,headline,location,summary,skills,desired_roles,work_preferences) values(uid,p_profile->>'full_name',p_profile->>'headline',p_profile->>'location',p_profile->>'summary',p_profile->>'skills',p_profile->>'desired_roles',p_profile->>'work_preferences') on conflict(user_id) do nothing returning * into current_row;
  if not found then select * into current_row from public.profiles where user_id=uid; return jsonb_build_object('outcome','changed','profile',to_jsonb(current_row)); end if;
  created:=true;old_values:='{}'::jsonb;
 end if;
 foreach field in array array['full_name','headline','location','summary','skills','desired_roles','work_preferences'] loop
  if (created and p_profile->>field<>'') or (not created and old_values->>field is distinct from p_profile->>field) then
   insert into public.profile_field_sources(user_id,field,source,import_id,recorded_at) values(uid,field,'manual',null,clock_timestamp()) on conflict on constraint profile_field_sources_pkey do update set source='manual',import_id=null,recorded_at=excluded.recorded_at;
  end if;
 end loop;
 return jsonb_build_object('outcome','saved','version',current_row.updated_at);
end $$;
create or replace function public.apply_profile_import(p_id uuid,p_expected timestamptz,p_fields text[]) returns text language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); imp public.profile_imports%rowtype; existing public.profiles%rowtype; field text; max_length integer;
begin
 if uid is null or p_fields is null or cardinality(p_fields)=0 or cardinality(p_fields)>5 or not (p_fields <@ array['full_name','headline','location','summary','skills']::text[]) then return 'invalid'; end if;
 select * into imp from public.profile_imports where id=p_id and user_id=uid and status='pending' for update;
 if not found then return 'not_found'; end if;
 foreach field in array p_fields loop
  max_length:=case field when 'full_name' then 120 when 'headline' then 200 when 'location' then 200 when 'summary' then 6000 when 'skills' then 3000 end;
  if jsonb_typeof(imp.proposed->field) is distinct from 'string' or length(trim(imp.proposed->>field))=0 or length(imp.proposed->>field)>max_length then return 'invalid'; end if;
 end loop;
 select * into existing from public.profiles where user_id=uid for update;
 if found then
  if p_expected is distinct from existing.updated_at then return 'changed'; end if;
  update public.profiles set full_name=case when 'full_name'=any(p_fields) then imp.proposed->>'full_name' else full_name end,headline=case when 'headline'=any(p_fields) then imp.proposed->>'headline' else headline end,location=case when 'location'=any(p_fields) then imp.proposed->>'location' else location end,summary=case when 'summary'=any(p_fields) then imp.proposed->>'summary' else summary end,skills=case when 'skills'=any(p_fields) then imp.proposed->>'skills' else skills end where user_id=uid;
 else
  if p_expected is not null then return 'changed'; end if;
  insert into public.profiles(user_id,full_name,headline,location,summary,skills) values(uid,case when 'full_name'=any(p_fields) then imp.proposed->>'full_name' else '' end,case when 'headline'=any(p_fields) then imp.proposed->>'headline' else '' end,case when 'location'=any(p_fields) then imp.proposed->>'location' else '' end,case when 'summary'=any(p_fields) then imp.proposed->>'summary' else '' end,case when 'skills'=any(p_fields) then imp.proposed->>'skills' else '' end) on conflict(user_id) do nothing;
  if not found then return 'changed'; end if;
 end if;
 insert into public.profile_field_sources(user_id,field,source,import_id,recorded_at) select uid,f.field,'cv_import',imp.id,clock_timestamp() from (select distinct unnest(p_fields) as field) f on conflict on constraint profile_field_sources_pkey do update set source='cv_import',import_id=excluded.import_id,recorded_at=excluded.recorded_at;
 update public.profile_imports set status='reviewed',reviewed_at=clock_timestamp() where id=p_id;
 return 'applied';
end $$;

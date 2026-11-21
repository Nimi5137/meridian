-- Guard storage writes, checkout and OAuth while a staged account deletion is in progress.
create table public.account_deletion_guards(user_id uuid primary key references auth.users(id) on delete cascade,deleting boolean not null default false);
create table public.account_deletion_jobs(user_id uuid primary key,created_at timestamptz not null default clock_timestamp());
alter table public.account_deletion_guards enable row level security;
alter table public.account_deletion_jobs enable row level security;
grant select,delete on public.account_deletion_jobs to service_role;
create function public.guard_career_storage_insert() returns trigger language plpgsql security definer set search_path='' as $$
declare owner_id uuid; blocked boolean;
begin
 if new.bucket_id<>'career-documents' then return new; end if;
 begin owner_id:=split_part(new.name,'/',1)::uuid; exception when others then raise exception 'Invalid storage owner'; end;
 insert into public.account_deletion_guards(user_id) values(owner_id) on conflict(user_id) do nothing;
 select deleting into blocked from public.account_deletion_guards where user_id=owner_id for update;
 if blocked is distinct from false then raise exception 'Account unavailable'; end if;
 return new;
end $$;
create trigger career_storage_deletion_guard before insert on storage.objects for each row execute function public.guard_career_storage_insert();
create function public.begin_account_deletion(p_user uuid) returns text language plpgsql security definer set search_path='' as $$
declare blocked boolean;
begin
 if p_user is null then return 'invalid'; end if;
 insert into public.account_deletion_guards(user_id) values(p_user) on conflict(user_id) do nothing;
 select deleting into blocked from public.account_deletion_guards where user_id=p_user for update;
 if blocked then return 'resuming'; end if;
 if exists(select 1 from public.billing_checkout_reservations where user_id=p_user) then return 'checkout_pending'; end if;
 if exists(select 1 from public.billing_customers where user_id=p_user) then return 'billing_present'; end if;
 if exists(select 1 from public.integration_connections where user_id=p_user) then return 'connections_present'; end if;
 if exists(select 1 from public.integration_oauth_pending where user_id=p_user and expires_at>clock_timestamp()) then return 'oauth_pending'; end if;
 update public.account_deletion_guards set deleting=true where user_id=p_user;
 insert into public.account_deletion_jobs(user_id) values(p_user) on conflict(user_id) do nothing;
 return 'started';
end $$;
create function public.my_account_deletion_in_progress() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.account_deletion_guards where user_id=auth.uid() and deleting) $$;
create or replace function public.claim_checkout(p_user uuid) returns uuid language plpgsql security definer set search_path='' as $$ declare result uuid;blocked boolean; begin
 insert into public.account_deletion_guards(user_id) values(p_user) on conflict(user_id) do nothing;
 select deleting into blocked from public.account_deletion_guards where user_id=p_user for update;
 if blocked is distinct from false then return null; end if;
 insert into public.billing_checkout_reservations(user_id,token,expires_at) values(p_user,gen_random_uuid(),now()+interval '35 minutes') on conflict(user_id) do update set token=gen_random_uuid(),expires_at=now()+interval '35 minutes' where public.billing_checkout_reservations.expires_at<now() returning token into result;
 return result;
end $$;
create or replace function public.start_integration_oauth(p_user uuid,p_kind text,p_hash text,p_verifier text) returns void language plpgsql security definer set search_path='' as $$ declare blocked boolean;begin
 insert into public.account_deletion_guards(user_id) values(p_user) on conflict(user_id) do nothing;
 select deleting into blocked from public.account_deletion_guards where user_id=p_user for update;
 if blocked is distinct from false then raise exception 'Account unavailable';end if;
 insert into public.integration_oauth_pending(user_id,kind,state_hash,verifier_ciphertext,expires_at,claimed) values(p_user,p_kind,p_hash,p_verifier,clock_timestamp()+interval '10 minutes',false) on conflict(user_id,kind) do update set state_hash=excluded.state_hash,verifier_ciphertext=excluded.verifier_ciphertext,expires_at=excluded.expires_at,claimed=false;
end $$;
revoke all on function public.begin_account_deletion(uuid),public.my_account_deletion_in_progress() from public;
grant execute on function public.begin_account_deletion(uuid) to service_role;
grant execute on function public.my_account_deletion_in_progress() to authenticated;

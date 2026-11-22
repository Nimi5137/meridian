create or replace function public.finish_integration_oauth(p_user uuid,p_kind text,p_hash text,p_email text,p_ciphertext text,p_expires timestamptz) returns boolean language plpgsql security definer set search_path='' as $$ declare blocked boolean;begin
 insert into public.account_deletion_guards(user_id) values(p_user) on conflict(user_id) do nothing;
 select deleting into blocked from public.account_deletion_guards where user_id=p_user for update;
 if blocked is distinct from false then return false; end if;
 perform 1 from public.integration_oauth_pending where user_id=p_user and kind=p_kind and state_hash=p_hash and claimed and expires_at>clock_timestamp() for update;
 if not found then return false; end if;
 insert into public.integration_connections(user_id,kind,account_email,connected_at) values(p_user,p_kind,p_email,clock_timestamp()) on conflict(user_id,kind) do update set account_email=excluded.account_email,connected_at=excluded.connected_at;
 insert into public.integration_secrets(user_id,kind,ciphertext,access_expires_at,refresh_lease,refresh_until) values(p_user,p_kind,p_ciphertext,p_expires,null,null) on conflict(user_id,kind) do update set ciphertext=excluded.ciphertext,access_expires_at=excluded.access_expires_at,refresh_lease=null,refresh_until=null;
 delete from public.integration_oauth_pending where user_id=p_user and kind=p_kind and state_hash=p_hash;return true;end $$;

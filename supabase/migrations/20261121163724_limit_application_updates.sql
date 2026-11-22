revoke update on public.applications from authenticated;
grant update(status,notes,updated_at) on public.applications to authenticated;

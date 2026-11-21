create table public.application_documents (
 id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, kind text not null check(kind in ('cv','cover_letter')),
 content text not null check(length(content) <= 30000), provider text, model text, input_tokens integer, output_tokens integer,
 created_at timestamptz not null default now()
);
create index application_documents_app_idx on public.application_documents(application_id,created_at desc);
alter table public.application_documents enable row level security;
create policy document_read on public.application_documents for select to authenticated using(user_id = (select auth.uid()));
create policy document_insert on public.application_documents for insert to authenticated with check(user_id = (select auth.uid()) and exists(select 1 from public.applications a where a.id=application_id and a.user_id=(select auth.uid())));
-- Fixed hourly window; inaccessible directly to authenticated users.
create table public.ai_rate_windows (user_id uuid not null references auth.users(id) on delete cascade, window_start timestamptz not null, requests integer not null, primary key(user_id,window_start));
alter table public.ai_rate_windows enable row level security;
create function public.consume_ai_request() returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer; uid uuid := auth.uid(); slot timestamptz := date_trunc('hour',now());
begin
 if uid is null then return false; end if;
 insert into public.ai_rate_windows(user_id,window_start,requests) values(uid,slot,1)
 on conflict(user_id,window_start) do update set requests=public.ai_rate_windows.requests+1 where public.ai_rate_windows.requests < 10
 returning requests into n;
 return n is not null;
end $$;
revoke all on function public.consume_ai_request() from public;
grant execute on function public.consume_ai_request() to authenticated;

-- Manually entered interviews, tied to the owning application.
alter table public.applications add constraint applications_id_user_unique unique(id,user_id);
create table public.interviews(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 application_id uuid not null,
 title text not null check(length(trim(title)) between 1 and 200),
 starts_at timestamptz not null check(starts_at >= '2000-01-01 00:00:00+00'::timestamptz and starts_at < '2101-01-01 00:00:00+00'::timestamptz),
 timezone text not null check(length(timezone) between 1 and 100),
 location text not null default '' check(length(location)<=500),
 notes text not null default '' check(length(notes)<=6000),
 version uuid not null default gen_random_uuid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(application_id,user_id) references public.applications(id,user_id) on delete cascade
);
create index interviews_application_start_idx on public.interviews(application_id,starts_at,id);
create index interviews_user_start_idx on public.interviews(user_id,starts_at,id);
alter table public.interviews enable row level security;
create policy interviews_select on public.interviews for select to authenticated using(user_id=(select auth.uid()));
create policy interviews_insert on public.interviews for insert to authenticated with check(user_id=(select auth.uid()));
create policy interviews_update on public.interviews for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy interviews_delete on public.interviews for delete to authenticated using(user_id=(select auth.uid()));
revoke all on public.interviews from anon,authenticated;
grant select,insert,delete on public.interviews to authenticated;
grant update(title,starts_at,timezone,location,notes) on public.interviews to authenticated;
create function public.touch_interview_version() returns trigger language plpgsql set search_path='' as $$ begin new.version:=gen_random_uuid();new.updated_at:=clock_timestamp();return new;end $$;
create trigger touch_interview_version before update on public.interviews for each row execute function public.touch_interview_version();

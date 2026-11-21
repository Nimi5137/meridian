-- Foundation: user-owned profile and application data, and curated public job listings.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', headline text not null default '', location text not null default '',
  summary text not null default '', skills text not null default '', desired_roles text not null default '',
  work_preferences text not null default '', updated_at timestamptz not null default now()
);
create table public.jobs (
  id uuid primary key default gen_random_uuid(), source text not null, source_id text not null,
  title text not null, company text not null, location text not null default '', description text not null default '',
  listing_url text not null, published_at timestamptz, discovered_at timestamptz not null default now(),
  last_verified_at timestamptz, active boolean not null default true,
  unique(source, source_id)
);
create index jobs_active_published_idx on public.jobs(active, published_at desc);
create index jobs_search_idx on public.jobs using gin (to_tsvector('simple', title || ' ' || company || ' ' || location));
create table public.applications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete restrict,
  status text not null default 'saved' check (status in ('saved','preparing','review_required','action_required','applied','screening','assessment','interview','offer','rejected','withdrawn','expired','archived')),
  notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,job_id)
);
create index applications_user_idx on public.applications(user_id, updated_at desc);
create table public.application_events (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, event text not null, created_at timestamptz not null default now()
);
create index application_events_app_idx on public.application_events(application_id, created_at desc);
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.application_events enable row level security;
create policy profile_select on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy profile_insert on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy profile_update on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy job_read on public.jobs for select to authenticated using (active = true);
create policy app_read on public.applications for select to authenticated using (user_id = (select auth.uid()));
create policy app_insert on public.applications for insert to authenticated with check (user_id = (select auth.uid()));
create policy app_update on public.applications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy app_delete on public.applications for delete to authenticated using (user_id = (select auth.uid()));
create policy events_read on public.application_events for select to authenticated using (user_id = (select auth.uid()));
-- Events are produced transactionally by a trigger; clients cannot forge them.
create function public.record_application_event() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.application_events(application_id,user_id,event) values (new.id,new.user_id,'Saved opportunity');
  elsif old.status is distinct from new.status then
    insert into public.application_events(application_id,user_id,event) values (new.id,new.user_id,'Status changed to ' || new.status);
  end if;
  return new;
end $$;
create trigger application_event after insert or update of status on public.applications for each row execute function public.record_application_event();

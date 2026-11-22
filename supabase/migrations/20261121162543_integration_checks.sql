create table public.integration_checks (id uuid primary key default gen_random_uuid(), integration text not null check(integration in ('groq','openai','anthropic','google')), model text not null check(length(model)<=200), outcome text not null check(outcome in ('success','error')), checked_at timestamptz not null default now(), checked_by uuid references auth.users(id) on delete set null);
create index integration_checks_lookup_idx on public.integration_checks(integration,checked_at desc);
alter table public.integration_checks enable row level security;
grant select,insert on public.integration_checks to service_role;

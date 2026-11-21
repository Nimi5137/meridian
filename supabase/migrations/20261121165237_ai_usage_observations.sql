create table public.ai_usage_observations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 task text not null check(task in ('extraction','matching','cv','cover_letter','readiness')),
 provider text not null check(provider in ('groq','openai','anthropic','google')),
 model text not null check(length(model) between 1 and 160 and model ~ '^[a-zA-Z0-9._:/-]+$'),
 outcome text not null default 'pending' check(outcome in ('pending','provider_completed','provider_failed')),
 input_tokens integer check(input_tokens between 0 and 100000000),
 output_tokens integer check(output_tokens between 0 and 100000000),
 created_at timestamptz not null default now(), finished_at timestamptz
);
create index ai_usage_user_created_idx on public.ai_usage_observations(user_id,created_at desc,id desc);
alter table public.ai_usage_observations enable row level security;
create policy ai_usage_read on public.ai_usage_observations for select to authenticated using(user_id=(select auth.uid()));
grant select on public.ai_usage_observations to authenticated;
create function public.begin_ai_usage(p_task text,p_provider text,p_model text) returns uuid language plpgsql security definer set search_path='' as $$ declare uid uuid:=auth.uid(); result uuid; begin if uid is null then return null; end if; if p_task is null or p_task not in ('extraction','matching','cv','cover_letter','readiness') or p_provider is null or p_provider not in ('groq','openai','anthropic','google') or p_model is null or length(p_model) not between 1 and 160 or p_model !~ '^[a-zA-Z0-9._:/-]+$' then raise exception 'Invalid usage metadata'; end if; if not public.consume_ai_request() then return null; end if; insert into public.ai_usage_observations(user_id,task,provider,model) values(uid,p_task,p_provider,p_model) returning id into result; return result; end $$;
create function public.finish_ai_usage(p_id uuid,p_success boolean,p_input integer,p_output integer) returns boolean language plpgsql security definer set search_path='' as $$ begin if auth.uid() is null or p_id is null or p_success is null or (p_input is not null and p_input not between 0 and 100000000) or (p_output is not null and p_output not between 0 and 100000000) or (not p_success and (p_input is not null or p_output is not null)) then return false; end if; update public.ai_usage_observations set outcome=case when p_success then 'provider_completed' else 'provider_failed' end,input_tokens=p_input,output_tokens=p_output,finished_at=clock_timestamp() where id=p_id and user_id=auth.uid() and outcome='pending'; return found; end $$;
revoke all on function public.begin_ai_usage(text,text,text) from public; revoke all on function public.finish_ai_usage(uuid,boolean,integer,integer) from public;
grant execute on function public.begin_ai_usage(text,text,text),public.finish_ai_usage(uuid,boolean,integer,integer) to authenticated;

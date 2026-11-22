-- Allow the interview coach to use the same owner-scoped quota and usage tracking.
alter table public.ai_usage_observations add constraint ai_usage_task_v2_check check(task in ('extraction','matching','cv','cover_letter','readiness','interview'));
alter table public.ai_usage_observations drop constraint ai_usage_observations_task_check;
alter table public.ai_usage_observations rename constraint ai_usage_task_v2_check to ai_usage_observations_task_check;
create or replace function public.begin_ai_usage(p_task text,p_provider text,p_model text) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result uuid;
begin
 if uid is null then return null; end if;
 if p_task is null or p_task not in ('extraction','matching','cv','cover_letter','readiness','interview') or p_provider is null or p_provider not in ('groq','openai','anthropic','google') or p_model is null or length(p_model) not between 1 and 160 or p_model !~ '^[a-zA-Z0-9._:/-]+$' then raise exception 'Invalid usage metadata'; end if;
 if not public.consume_ai_request() then return null; end if;
 insert into public.ai_usage_observations(user_id,task,provider,model) values(uid,p_task,p_provider,p_model) returning id into result;
 return result;
end $$;

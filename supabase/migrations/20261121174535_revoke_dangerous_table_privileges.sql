-- RLS does not protect TRUNCATE. API roles have no need to alter or maintain tables.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke truncate, references, trigger on tables from anon, authenticated;
do $$ begin if current_setting('server_version_num')::integer>=170000 then execute 'revoke maintain on all tables in schema public from anon, authenticated'; execute 'alter default privileges for role postgres in schema public revoke maintain on tables from anon, authenticated'; end if; end $$;

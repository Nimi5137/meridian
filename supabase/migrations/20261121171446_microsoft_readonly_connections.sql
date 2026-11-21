alter table public.integration_connections drop constraint integration_connections_kind_check;alter table public.integration_connections add constraint integration_connections_kind_check check(kind in ('gmail','google_calendar','outlook','microsoft_calendar'));
alter table public.integration_oauth_pending drop constraint integration_oauth_pending_kind_check;alter table public.integration_oauth_pending add constraint integration_oauth_pending_kind_check check(kind in ('gmail','google_calendar','outlook','microsoft_calendar'));
alter function public.start_google_oauth(uuid,text,text,text) rename to start_integration_oauth;
alter function public.claim_google_oauth(uuid,text) rename to claim_integration_oauth;
alter function public.finish_google_oauth(uuid,text,text,text,text,timestamptz) rename to finish_integration_oauth;
alter function public.claim_google_refresh(uuid,text,uuid) rename to claim_integration_refresh;
alter function public.finish_google_refresh(uuid,text,uuid,text,timestamptz) rename to finish_integration_refresh;
alter function public.disconnect_google(uuid,text) rename to disconnect_integration;

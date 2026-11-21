alter table public.applications drop constraint applications_status_check;
alter table public.applications add constraint applications_status_check check(status in ('saved','preparing','review_required','action_required','applying','applied','screening','assessment','interview','offer','rejected','withdrawn','expired','failed','archived'));

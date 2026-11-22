-- Preserve existing boards while allowing Lever's documented EU instance.
alter table public.job_boards add constraint job_boards_source_v2_check check(source in ('greenhouse','lever','lever_eu','ashby','smartrecruiters'));
alter table public.job_boards drop constraint job_boards_source_check;
alter table public.job_boards rename constraint job_boards_source_v2_check to job_boards_source_check;

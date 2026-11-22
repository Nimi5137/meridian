-- Run as a privileged operator on disposable staging only. All changes roll back.
begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000081'),('00000000-0000-4000-8000-000000000082');
insert into public.jobs(id,source,source_id,title,company,listing_url,active) values ('00000000-0000-4000-8000-000000000083','test','question-test','Role','Employer','https://example.org',false);
insert into public.applications(id,user_id,job_id) values ('00000000-0000-4000-8000-000000000084','00000000-0000-4000-8000-000000000081','00000000-0000-4000-8000-000000000083');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000082';
do $$ begin if exists(select 1 from public.jobs where id='00000000-0000-4000-8000-000000000083') or public.approve_application('00000000-0000-4000-8000-000000000084',null,null,(select questions_version from public.applications where id='00000000-0000-4000-8000-000000000084'))<>'not_found' then raise exception 'Cross-user visibility or approval'; end if; end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000081';
insert into public.application_questions(id,application_id,user_id,question,answer) values('00000000-0000-4000-8000-000000000085','00000000-0000-4000-8000-000000000084','00000000-0000-4000-8000-000000000081','What is your availability?','Next month');
do $$ begin if not exists(select 1 from public.jobs where id='00000000-0000-4000-8000-000000000083') then raise exception 'Saved inactive job missing';end if;begin update public.applications set status='applied' where id='00000000-0000-4000-8000-000000000084';raise exception 'Direct status accepted';exception when raise_exception then if sqlerrm<>'Manual submission confirmation required' then raise;end if;end;if public.approve_application('00000000-0000-4000-8000-000000000084',null,null,(select questions_version from public.applications where id='00000000-0000-4000-8000-000000000084'))<>'unreviewed_questions' then raise exception 'Unreviewed answer accepted';end if;end $$;
update public.application_questions set confirmed=true where id='00000000-0000-4000-8000-000000000085';
do $$ begin if public.approve_application('00000000-0000-4000-8000-000000000084',null,null,(select questions_version from public.applications where id='00000000-0000-4000-8000-000000000084'))<>'approved' then raise exception 'Approval failed';end if;end $$;
update public.application_questions set answer='Two months',confirmed=true where id='00000000-0000-4000-8000-000000000085';
do $$ begin if (select confirmed from public.application_questions where id='00000000-0000-4000-8000-000000000085') then raise exception 'Changed answer remained confirmed'; end if; end $$;
do $$ declare approval uuid;begin select id into approval from public.application_approvals where application_id='00000000-0000-4000-8000-000000000084';if public.record_manual_application('00000000-0000-4000-8000-000000000084',approval,'Confirmation email')<>'approval_outdated' then raise exception 'Question revision not detected';end if;end $$;
-- An expected version from an earlier page cannot approve a changed set of answers.
do $$ declare old_version uuid; current_version uuid; begin
 select questions_version into old_version from public.applications where id='00000000-0000-4000-8000-000000000084';
 update public.application_questions set confirmed=true where id='00000000-0000-4000-8000-000000000085';
 select questions_version into current_version from public.applications where id='00000000-0000-4000-8000-000000000084';
 if public.approve_application('00000000-0000-4000-8000-000000000084',null,null,old_version)<>'questions_changed' then raise exception 'Stale page approved'; end if;
 if public.approve_application('00000000-0000-4000-8000-000000000084',null,null,current_version)<>'approved' then raise exception 'Current version rejected'; end if;
end $$;
rollback;

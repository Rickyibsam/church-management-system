create or replace view public.pastoral_followups_due_report
with (security_invoker = true)
as
select
  pf.church_id,
  pf.id as followup_id,
  pf.request_id,
  pr.subject as case_subject,
  pf.due_at,
  pf.assigned_to,
  pf.completed_at,
  (pf.due_at < now()) as is_overdue
from public.pastoral_followups pf
join public.pastoral_requests pr
  on pr.id=pf.request_id and pr.church_id=pf.church_id
where pf.completed_at is null
  and pf.due_at is not null;

grant select on public.pastoral_followups_due_report to authenticated;

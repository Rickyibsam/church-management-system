drop policy if exists pastoral_followups_church_staff_access on public.pastoral_followups;
create policy pastoral_followups_confidential_access on public.pastoral_followups
for all to authenticated
using (
 private.has_church_role(church_id,array['owner','admin','pastor'])
 or exists(select 1 from public.pastoral_requests pr where pr.id=pastoral_followups.request_id and pr.church_id=pastoral_followups.church_id and pr.assigned_pastor_user_id=auth.uid())
)
with check (
 private.has_church_role(church_id,array['owner','admin','pastor'])
 or exists(select 1 from public.pastoral_requests pr where pr.id=pastoral_followups.request_id and pr.church_id=pastoral_followups.church_id and pr.assigned_pastor_user_id=auth.uid())
);

drop policy if exists pastoral_requests_permission_select on public.pastoral_requests;
create policy pastoral_requests_permission_select on public.pastoral_requests for select to authenticated
using (
  private.has_church_permission(church_id,'pastoral','view')
  or exists(
    select 1 from public.church_members cm
    where cm.church_id=pastoral_requests.church_id
      and cm.user_id=(select auth.uid())
      and cm.status='active'
      and pastoral_requests.assigned_pastor_user_id=(select auth.uid())
  )
);

drop policy if exists pastoral_requests_permission_update on public.pastoral_requests;
create policy pastoral_requests_permission_update on public.pastoral_requests for update to authenticated
using (
  private.has_church_permission(church_id,'pastoral','edit')
  or exists(
    select 1 from public.church_members cm
    where cm.church_id=pastoral_requests.church_id
      and cm.user_id=(select auth.uid())
      and cm.status='active'
      and pastoral_requests.assigned_pastor_user_id=(select auth.uid())
  )
)
with check (
  private.has_church_permission(church_id,'pastoral','edit')
  or exists(
    select 1 from public.church_members cm
    where cm.church_id=pastoral_requests.church_id
      and cm.user_id=(select auth.uid())
      and cm.status='active'
      and pastoral_requests.assigned_pastor_user_id=(select auth.uid())
  )
);

drop policy if exists pastoral_followups_permission_select on public.pastoral_followups;
create policy pastoral_followups_permission_select on public.pastoral_followups for select to authenticated
using (
  private.has_church_permission(church_id,'pastoral','view')
  or exists(
    select 1 from public.pastoral_requests pr
    join public.church_members cm on cm.church_id=pr.church_id
    where pr.id=pastoral_followups.request_id
      and pr.church_id=pastoral_followups.church_id
      and cm.user_id=(select auth.uid())
      and cm.status='active'
      and pr.assigned_pastor_user_id=(select auth.uid())
  )
);

drop policy if exists pastoral_followups_permission_update on public.pastoral_followups;
create policy pastoral_followups_permission_update on public.pastoral_followups for update to authenticated
using (
  private.has_church_permission(church_id,'pastoral','edit')
  or exists(
    select 1 from public.pastoral_requests pr
    join public.church_members cm on cm.church_id=pr.church_id
    where pr.id=pastoral_followups.request_id
      and pr.church_id=pastoral_followups.church_id
      and cm.user_id=(select auth.uid())
      and cm.status='active'
      and pr.assigned_pastor_user_id=(select auth.uid())
  )
)
with check (
  private.has_church_permission(church_id,'pastoral','edit')
  or exists(
    select 1 from public.pastoral_requests pr
    join public.church_members cm on cm.church_id=pr.church_id
    where pr.id=pastoral_followups.request_id
      and pr.church_id=pastoral_followups.church_id
      and cm.user_id=(select auth.uid())
      and cm.status='active'
      and pr.assigned_pastor_user_id=(select auth.uid())
  )
);

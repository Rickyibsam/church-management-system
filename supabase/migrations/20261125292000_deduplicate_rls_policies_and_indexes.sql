drop policy if exists church_branches_member_select on public.church_branches;
drop policy if exists church_branches_permission_select on public.church_branches;
create policy church_branches_select on public.church_branches for select to authenticated
using (
  private.has_church_branch_access(church_id,id)
  or private.has_church_permission(church_id,'branches','view')
);

drop policy if exists profiles_select_self on public.profiles;
drop policy if exists profiles_select_church_admin on public.profiles;
create policy profiles_select_authorized on public.profiles for select to authenticated
using (
  id=(select auth.uid())
  or exists(
    select 1 from public.church_members cm
    where cm.user_id=profiles.id
      and private.has_church_role(cm.church_id,array['owner','admin']::text[])
  )
);

drop index if exists public.idx_fk_attendance_records_attendance_records_service_i_9133fee6;
drop index if exists public.idx_fk_certificate_attachments_certificate_attachments_1deedb5d;
drop index if exists public.idx_fk_church_members_church_members_user_profile_fkey_21f13290;
drop index if exists public.idx_fk_members_members_family_id_fkey_de1e07a6;
drop index if exists public.ministry_members_unique_member;

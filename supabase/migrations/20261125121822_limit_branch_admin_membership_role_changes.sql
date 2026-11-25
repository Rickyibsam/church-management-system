drop policy if exists church_members_admin_update on public.church_members;
create policy church_members_admin_update on public.church_members
for update to authenticated
using (
  private.has_church_role(church_id,array['owner','admin'])
  or (
    private.has_church_role(church_id,array['branch_admin'])
    and private.has_church_branch_access(church_id,branch_id)
    and branch_id is not null and user_id <> (select auth.uid())
    and role not in ('owner','admin','branch_admin','pastor','accountant')
  )
)
with check (
  (
    private.has_church_role(church_id,array['owner','admin'])
    and (role <> 'owner' or private.has_church_role(church_id,array['owner']))
  )
  or (
    private.has_church_role(church_id,array['branch_admin'])
    and private.has_church_branch_access(church_id,branch_id)
    and branch_id is not null and user_id <> (select auth.uid())
    and role not in ('owner','admin','branch_admin','pastor','accountant')
  )
);

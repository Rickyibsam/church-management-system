create policy church_branches_member_select on public.church_branches for select to authenticated
using(private.has_church_branch_access(church_id,id));

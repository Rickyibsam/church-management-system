create or replace function private.has_church_branch_access(p_church_id uuid,p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
 select exists(
  select 1
  from public.church_members cm
  where cm.church_id=p_church_id
    and cm.user_id=auth.uid()
    and cm.status='active'
    and (
      cm.role in ('owner','admin')
      or cm.branch_id is null
      or (p_branch_id is not null and cm.branch_id=p_branch_id)
    )
 );
$function$;
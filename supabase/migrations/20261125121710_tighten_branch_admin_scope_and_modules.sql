create or replace function private.has_church_branch_access(p_church_id uuid,p_branch_id uuid)
returns boolean language sql stable security definer set search_path='' as $function$
 select exists(
  select 1 from public.church_members cm
  where cm.church_id=p_church_id and cm.user_id=auth.uid() and cm.status='active'
   and (
     cm.role in ('owner','admin')
     or (cm.role='branch_admin' and cm.branch_id is not null and p_branch_id=cm.branch_id)
     or (cm.role not in ('owner','admin','branch_admin') and (cm.branch_id is null or p_branch_id is null or cm.branch_id=p_branch_id))
   )
 );
$function$;

create or replace function private.has_church_permission(p_church_id uuid,p_module_key text,p_action_key text)
returns boolean language sql stable security definer set search_path='' as $function$
 select exists(
  select 1 from public.church_members cm
  where cm.church_id=p_church_id and cm.user_id=auth.uid() and cm.status='active'
  and (
    cm.role in ('owner','admin')
    or coalesce(
      (select cmp.allowed from public.church_member_permissions cmp
       where cmp.church_member_id=cm.id and cmp.module_key=p_module_key and cmp.action_key=p_action_key limit 1),
      case
        when cm.role='branch_admin' then
          p_module_key in ('members','families','family_relationships','member_documents','certificates','certificate_documents','attendance','services','events','ministries','assets','inventory')
          and p_action_key in ('view','create','edit','delete','approve','issue')
        when p_module_key in ('members','families','family_relationships','member_documents') then
          (p_action_key in ('view','create','edit') and cm.role in ('pastor','secretary','staff'))
          or (p_action_key='delete' and cm.role='pastor')
        when p_module_key in ('certificates','certificate_documents') then
          (p_action_key in ('view','create','edit') and cm.role in ('pastor','secretary'))
          or (p_action_key in ('approve','issue','delete') and cm.role='pastor')
        when p_module_key in ('attendance','services','events','ministries') then
          (p_action_key in ('view','create','edit') and cm.role in ('pastor','secretary','ministry_leader','staff','volunteer'))
          or (p_action_key in ('delete','approve') and cm.role in ('pastor','secretary'))
        when p_module_key in ('finance','donations','expenses','accounts','budgets') then
          (p_action_key in ('view','create','edit','approve') and cm.role in ('accountant','finance'))
        when p_module_key in ('assets','inventory') then
          (p_action_key in ('view','create','edit') and cm.role in ('staff','accountant','finance','secretary'))
          or (p_action_key in ('delete','approve') and cm.role in ('accountant','finance','pastor'))
        when p_module_key='pastoral' then
          (p_action_key in ('view','create','edit') and cm.role='pastor')
        else false
      end
    )
  )
 );
$function$;

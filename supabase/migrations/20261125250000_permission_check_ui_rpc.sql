create or replace function public.can_church_action(p_church_id uuid,p_module_key text,p_action_key text)
returns boolean
language sql
stable
security invoker
set search_path=''
as $$
  select private.has_church_permission(p_church_id,p_module_key,p_action_key);
$$;
revoke all on function public.can_church_action(uuid,text,text) from public,anon;
grant execute on function public.can_church_action(uuid,text,text) to authenticated;

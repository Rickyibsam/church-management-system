create or replace function private.has_church_permission(p_church_id uuid,p_module_key text,p_action_key text)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(
  select 1 from public.church_members cm
  where cm.church_id=p_church_id and cm.user_id=auth.uid() and cm.status='active'
  and (cm.role in ('owner','admin') or coalesce(
   (select cmp.allowed from public.church_member_permissions cmp where cmp.church_member_id=cm.id and cmp.module_key=p_module_key and cmp.action_key=p_action_key limit 1),
   case
    when p_module_key in ('members','families') then cm.role in ('pastor','secretary','staff')
    when p_module_key in ('certificates','certificate_documents') then cm.role in ('pastor','secretary')
    when p_module_key in ('attendance','services','events','ministries') then cm.role in ('pastor','secretary','ministry_leader','staff','volunteer')
    when p_module_key in ('finance','donations','expenses','accounts','budgets') then cm.role in ('accountant','finance')
    when p_module_key='assets' then cm.role in ('staff','accountant','finance')
    when p_module_key='pastoral' then cm.role='pastor'
    else false
   end
  ))
 );
$$;
grant execute on function private.has_church_permission(uuid,text,text) to authenticated;
do $$
declare t text; pol record; modkey text;
begin
 foreach t in array array['members','families','family_relationships','member_documents','attendance_records','church_services','church_events','ministries','ministry_members','church_branches','church_assets','asset_maintenance','chart_of_accounts','financial_accounts','expenses','donations','donation_pledges','financial_budgets','financial_budget_lines','journal_entries','journal_lines','certificates','certificate_attachments','certificate_document_requirements','certificate_templates'] loop
  if to_regclass('public.'||t) is not null then
   for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy %I on public.%I',pol.policyname,t); end loop;
   modkey := case
    when t='members' or t='member_documents' then 'members'
    when t in ('families','family_relationships') then 'families'
    when t='attendance_records' then 'attendance'
    when t='church_services' then 'services'
    when t='church_events' then 'events'
    when t in ('ministries','ministry_members') then 'ministries'
    when t='church_branches' then 'branches'
    when t in ('church_assets','asset_maintenance') then 'assets'
    when t in ('chart_of_accounts','financial_accounts','journal_entries','journal_lines') then 'accounts'
    when t='expenses' then 'expenses'
    when t in ('donations','donation_pledges') then 'donations'
    when t in ('financial_budgets','financial_budget_lines') then 'budgets'
    when t='certificate_attachments' then 'certificate_documents'
    else 'certificates'
   end;
   execute format('alter table public.%I enable row level security',t);
   execute format('create policy %I on public.%I for select to authenticated using (private.has_church_permission(church_id,%L,''view''))',t||'_permission_select',t,modkey);
   execute format('create policy %I on public.%I for insert to authenticated with check (private.has_church_permission(church_id,%L,''create''))',t||'_permission_insert',t,modkey);
   execute format('create policy %I on public.%I for update to authenticated using (private.has_church_permission(church_id,%L,''edit'')) with check (private.has_church_permission(church_id,%L,''edit''))',t||'_permission_update',t,modkey,modkey);
   execute format('create policy %I on public.%I for delete to authenticated using (private.has_church_permission(church_id,%L,''delete''))',t||'_permission_delete',t,modkey);
  end if;
 end loop;
 if to_regclass('public.certificate_history') is not null then
  for pol in select policyname from pg_policies where schemaname='public' and tablename='certificate_history' loop execute format('drop policy %I on public.certificate_history',pol.policyname); end loop;
  create policy certificate_history_permission_select on public.certificate_history for select to authenticated using (private.has_church_permission(church_id,'certificates','view'));
 end if;
end $$;

create or replace function private.assert_church_backup_target_empty_impl(p_target_church_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_table text;
  v_order text[]:=array[
    'church_branches','church_members','church_member_permissions','certificate_sequences',
    'chart_of_accounts','members','families','family_relationships','member_documents',
    'certificate_templates','certificate_document_requirements','certificates','certificate_attachments','certificate_history',
    'church_services','ministries','ministry_members','church_events','attendance_records',
    'pastoral_requests','pastoral_followups','financial_accounts','financial_budgets','financial_budget_lines',
    'journal_entries','journal_lines','donations','expenses','donation_pledges','donation_pledge_allocations',
    'bank_reconciliation_items','church_assets','asset_maintenance','asset_depreciation_entries',
    'inventory_items','inventory_transactions','audit_exports','notifications','audit_logs'
  ];
  v_baseline text[]:=array['church_branches','church_members','chart_of_accounts','certificate_document_requirements','audit_logs'];
  v_count bigint;
begin
  if auth.uid() is null then raise exception 'Authentication is required to restore a church backup.'; end if;
  if not exists(select 1 from public.church_members cm where cm.church_id=p_target_church_id and cm.user_id=auth.uid() and cm.status='active' and cm.role='owner') then
    raise exception 'Only the active owner of the target church can restore a backup.';
  end if;
  if (select count(*) from public.church_members cm where cm.church_id=p_target_church_id)<>1
     or (select count(*) from public.church_branches b where b.church_id=p_target_church_id)<>1 then
    raise exception 'The target workspace must be newly created and contain only its initial owner and head-office branch.';
  end if;
  foreach v_table in array v_order loop
    if v_table=any(v_baseline) then continue; end if;
    execute format('select count(*) from public.%I where church_id=$1',v_table) into v_count using p_target_church_id;
    if v_count>0 then raise exception 'The target workspace is not empty. Table % already contains records.',v_table; end if;
  end loop;
  if exists(select 1 from storage.objects o where o.bucket_id in ('church-private-documents','church-branding') and (storage.foldername(o.name))[1]=p_target_church_id::text) then
    raise exception 'The target workspace storage folder is not empty. Create a new empty workspace before restoring.';
  end if;
  return true;
end;
$function$;

revoke all on function private.assert_church_backup_target_empty_impl(uuid) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.assert_church_backup_target_empty_impl(uuid) to authenticated;

drop function public.assert_church_backup_target_empty(uuid);
create function public.assert_church_backup_target_empty(p_target_church_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $function$
  select private.assert_church_backup_target_empty_impl(p_target_church_id);
$function$;
revoke all on function public.assert_church_backup_target_empty(uuid) from public,anon;
grant execute on function public.assert_church_backup_target_empty(uuid) to authenticated;

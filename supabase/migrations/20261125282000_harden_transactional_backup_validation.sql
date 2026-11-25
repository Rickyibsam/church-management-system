create or replace function private.restore_church_backup_impl(p_target_church_id uuid,p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_source_church_id uuid;
  v_table text;
  v_rows jsonb;
  v_row jsonb;
  v_count bigint;
  v_total bigint:=0;
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
  v_workspace jsonb;
  v_logo_path text;
begin
  if auth.uid() is null then raise exception 'Authentication is required to restore a church backup.'; end if;
  if p_snapshot->>'format'<>'church-management-system-backup' or p_snapshot->>'version'<>'4' then
    raise exception 'Unsupported backup format. Select a version 4 church backup.';
  end if;
  if coalesce(jsonb_typeof(p_snapshot->'workspace'),'')<>'object'
     or coalesce(jsonb_typeof(p_snapshot->'tables'),'')<>'object'
     or coalesce(jsonb_typeof(p_snapshot->'row_counts'),'')<>'object' then
    raise exception 'The backup file is missing its workspace, table data or row counts.';
  end if;
  v_source_church_id:=(p_snapshot->'workspace'->>'id')::uuid;
  if v_source_church_id=p_target_church_id then raise exception 'Restore requires a different, empty target church workspace.'; end if;
  if not exists(select 1 from public.church_members cm where cm.church_id=p_target_church_id and cm.user_id=auth.uid() and cm.status='active' and cm.role='owner') then
    raise exception 'Only the active owner of the target church can restore a backup.';
  end if;
  if (select count(*) from public.church_members cm where cm.church_id=p_target_church_id)<>1
     or (select count(*) from public.church_branches b where b.church_id=p_target_church_id)<>1 then
    raise exception 'The target workspace must be newly created and contain only its initial owner and head-office branch.';
  end if;
  if coalesce(jsonb_typeof(p_snapshot->'tables'->'church_members'),'')<>'array'
     or not exists(select 1 from jsonb_array_elements(p_snapshot->'tables'->'church_members') cm where cm->>'user_id'=auth.uid()::text and cm->>'role'='owner' and cm->>'status'='active') then
    raise exception 'The backup belongs to a different owner account. Sign in with the original church owner account.';
  end if;

  foreach v_table in array v_order loop
    if coalesce(jsonb_typeof(p_snapshot->'tables'->v_table),'')<>'array' then
      raise exception 'Backup table data is missing or invalid: %.',v_table;
    end if;
    v_count:=jsonb_array_length(p_snapshot->'tables'->v_table);
    if v_count>100000 then raise exception 'Backup table exceeds the restore safety limit: %.',v_table; end if;
    if coalesce((p_snapshot->'row_counts'->>v_table)::bigint,-1)<>v_count then raise exception 'Backup row count validation failed for table %.',v_table; end if;
    v_total:=v_total+v_count;
    if exists(select 1 from jsonb_array_elements(p_snapshot->'tables'->v_table) r where r->>'church_id' is distinct from v_source_church_id::text) then
      raise exception 'Backup contains records from another church in table %.',v_table;
    end if;
  end loop;
  if v_total>100000 then raise exception 'Backup exceeds the 100,000-record transactional restore limit.'; end if;

  foreach v_table in array v_order loop
    if v_table=any(v_baseline) then continue; end if;
    execute format('select count(*) from public.%I where church_id=$1',v_table) into v_count using p_target_church_id;
    if v_count>0 then raise exception 'The target workspace is not empty. Table % already contains records.',v_table; end if;
  end loop;

  v_workspace:=p_snapshot->'workspace';
  v_logo_path:=v_workspace->>'logo_path';
  if v_logo_path is not null and left(v_logo_path,length(v_source_church_id::text)+1)=v_source_church_id::text||'/' then
    v_logo_path:=p_target_church_id::text||substr(v_logo_path,length(v_source_church_id::text)+1);
  end if;
  update public.churches c
     set legal_name=coalesce(v_workspace->>'legal_name',c.legal_name),
         display_name=coalesce(v_workspace->>'display_name',c.display_name),
         country_code=coalesce(v_workspace->>'country_code',c.country_code),
         currency_code=coalesce(v_workspace->>'currency_code',c.currency_code),
         timezone=coalesce(v_workspace->>'timezone',c.timezone),
         preferred_language=coalesce(v_workspace->>'preferred_language',c.preferred_language),
         logo_path=v_logo_path,header_text=v_workspace->>'header_text',footer_text=v_workspace->>'footer_text',
         address=v_workspace->>'address',email=v_workspace->>'email',phone=v_workspace->>'phone',website=v_workspace->>'website',updated_at=now()
   where c.id=p_target_church_id;
  if not found then raise exception 'Target church workspace was not found.'; end if;

  delete from public.church_member_permissions where church_id=p_target_church_id;
  delete from public.church_members where church_id=p_target_church_id;
  delete from public.church_branches where church_id=p_target_church_id;
  delete from public.chart_of_accounts where church_id=p_target_church_id;
  delete from public.certificate_document_requirements where church_id=p_target_church_id;
  delete from public.audit_logs where church_id=p_target_church_id;
  delete from private.family_registration_sequences where church_id=p_target_church_id;
  perform set_config('app.church_backup_restore','on',true);

  foreach v_table in array v_order loop
    if v_table='audit_logs' or v_table='notifications' then execute format('delete from public.%I where church_id=$1',v_table) using p_target_church_id; end if;
    select coalesce(jsonb_agg(private.remap_church_backup_row(r.value,v_source_church_id::text,p_target_church_id::text)),'[]'::jsonb)
      into v_rows from jsonb_array_elements(p_snapshot->'tables'->v_table) r;
    if v_table='chart_of_accounts' then
      select coalesce(jsonb_agg(jsonb_set(value,'{parent_id}','null'::jsonb,true)),'[]'::jsonb) into v_rows from jsonb_array_elements(v_rows);
    elsif v_table='members' then
      select coalesce(jsonb_agg(jsonb_set(value,'{family_id}','null'::jsonb,true)),'[]'::jsonb) into v_rows from jsonb_array_elements(v_rows);
    elsif v_table='families' then
      select coalesce(jsonb_agg(jsonb_set(value,'{family_head_member_id}','null'::jsonb,true)),'[]'::jsonb) into v_rows from jsonb_array_elements(v_rows);
    elsif v_table='certificates' then
      select coalesce(jsonb_agg(jsonb_set(value,'{supersedes_certificate_id}','null'::jsonb,true)),'[]'::jsonb) into v_rows from jsonb_array_elements(v_rows);
    end if;
    if v_table='inventory_transactions' then
      for v_row in select value from jsonb_array_elements(v_rows) order by (value->>'transaction_date')::date,(value->>'created_at')::timestamptz,(value->>'id')::uuid loop
        execute 'insert into public.inventory_transactions select * from jsonb_populate_record(null::public.inventory_transactions,$1)' using v_row;
      end loop;
    else
      execute format('insert into public.%I select * from jsonb_populate_recordset(null::public.%I,$1)',v_table,v_table) using v_rows;
    end if;
    if v_table='families' then
      update public.families f set family_head_member_id=x.family_head_member_id
        from jsonb_to_recordset(p_snapshot->'tables'->'families') as x(id uuid,family_head_member_id uuid)
       where f.id=x.id and f.church_id=p_target_church_id;
    elsif v_table='family_relationships' then
      update public.members m set family_id=x.family_id
        from jsonb_to_recordset(p_snapshot->'tables'->'members') as x(id uuid,family_id uuid)
       where m.id=x.id and m.church_id=p_target_church_id;
    elsif v_table='chart_of_accounts' then
      update public.chart_of_accounts a set parent_id=x.parent_id
        from jsonb_to_recordset(p_snapshot->'tables'->'chart_of_accounts') as x(id uuid,parent_id uuid)
       where a.id=x.id and a.church_id=p_target_church_id;
    elsif v_table='certificates' then
      update public.certificates c set supersedes_certificate_id=x.supersedes_certificate_id
        from jsonb_to_recordset(p_snapshot->'tables'->'certificates') as x(id uuid,supersedes_certificate_id uuid)
       where c.id=x.id and c.church_id=p_target_church_id;
    end if;
  end loop;

  insert into private.family_registration_sequences(church_id,last_value)
  select p_target_church_id,coalesce(max(substring(family_number from '^FAM-([0-9]+)$')::bigint),0)
    from public.families where church_id=p_target_church_id
  having count(*)>0
  on conflict(church_id) do update set last_value=excluded.last_value;

  if exists(select 1 from (
    select sum(quantity_delta) over(partition by item_id,branch_id order by transaction_date,created_at,id rows unbounded preceding) running_quantity
    from public.inventory_transactions where church_id=p_target_church_id
  ) stock_history where running_quantity<0) then raise exception 'Backup inventory history contains a negative stock balance.'; end if;

  perform set_config('app.church_backup_restore','off',true);
  return jsonb_build_object('restored',true,'target_church_id',p_target_church_id,'source_church_id',v_source_church_id,'tables_restored',cardinality(v_order),'records_restored',v_total);
end;
$$;
revoke all on function private.restore_church_backup_impl(uuid,jsonb) from public,anon;
grant execute on function private.restore_church_backup_impl(uuid,jsonb) to authenticated;

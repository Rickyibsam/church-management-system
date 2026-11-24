create or replace function private.reference_belongs_to_church(p_table regclass,p_id uuid,p_church_id uuid)
returns boolean language plpgsql stable security definer set search_path=''
as $$
declare v_exists boolean;
begin
 if p_id is null then return true; end if;
 execute format('select exists(select 1 from %s where id=$1 and church_id=$2)',p_table) into v_exists using p_id,p_church_id;
 return coalesce(v_exists,false);
end;
$$;
revoke all on function private.reference_belongs_to_church(regclass,uuid,uuid) from public;
create or replace function private.enforce_church_reference_integrity()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if tg_table_name='members' then
  if not private.reference_belongs_to_church('public.church_branches'::regclass,new.branch_id,new.church_id) or not private.reference_belongs_to_church('public.families'::regclass,new.family_id,new.church_id) then raise exception 'Member branch and family must belong to the same church.'; end if;
 elsif tg_table_name='families' then
  if not private.reference_belongs_to_church('public.church_branches'::regclass,new.branch_id,new.church_id) or not private.reference_belongs_to_church('public.members'::regclass,new.family_head_member_id,new.church_id) then raise exception 'Family branch and family head must belong to the same church.'; end if;
 elsif tg_table_name='certificates' then
  if not private.reference_belongs_to_church('public.church_branches'::regclass,new.branch_id,new.church_id) or not private.reference_belongs_to_church('public.members'::regclass,new.primary_member_id,new.church_id) or not private.reference_belongs_to_church('public.members'::regclass,new.secondary_member_id,new.church_id) or not private.reference_belongs_to_church('public.families'::regclass,new.family_id,new.church_id) or not private.reference_belongs_to_church('public.certificates'::regclass,new.supersedes_certificate_id,new.church_id) then raise exception 'Certificate references must belong to the same church.'; end if;
 elsif tg_table_name='member_documents' then
  if not private.reference_belongs_to_church('public.members'::regclass,new.member_id,new.church_id) then raise exception 'Member document must reference a member in the same church.'; end if;
 elsif tg_table_name='family_relationships' then
  if not private.reference_belongs_to_church('public.families'::regclass,new.family_id,new.church_id) or not private.reference_belongs_to_church('public.members'::regclass,new.member_id,new.church_id) then raise exception 'Family relationships must reference records in the same church.'; end if;
 elsif tg_table_name='attendance_records' then
  if not private.reference_belongs_to_church('public.church_services'::regclass,new.service_id,new.church_id) or not private.reference_belongs_to_church('public.church_events'::regclass,new.event_id,new.church_id) or not private.reference_belongs_to_church('public.members'::regclass,new.member_id,new.church_id) then raise exception 'Attendance references must belong to the same church.'; end if;
 elsif tg_table_name='pastoral_followups' then
  if not private.reference_belongs_to_church('public.pastoral_requests'::regclass,new.request_id,new.church_id) then raise exception 'Pastoral follow-up must reference a case in the same church.'; end if;
 elsif tg_table_name='financial_accounts' then
  if not private.reference_belongs_to_church('public.chart_of_accounts'::regclass,new.chart_account_id,new.church_id) then raise exception 'Cash/bank account mapping must belong to the same church.'; end if;
 elsif tg_table_name='donations' then
  if not private.reference_belongs_to_church('public.church_branches'::regclass,new.branch_id,new.church_id) or not private.reference_belongs_to_church('public.financial_accounts'::regclass,new.account_id,new.church_id) or not private.reference_belongs_to_church('public.members'::regclass,new.member_id,new.church_id) or not private.reference_belongs_to_church('public.chart_of_accounts'::regclass,new.income_account_id,new.church_id) or not private.reference_belongs_to_church('public.journal_entries'::regclass,new.journal_entry_id,new.church_id) then raise exception 'Donation references must belong to the same church.'; end if;
 elsif tg_table_name='expenses' then
  if not private.reference_belongs_to_church('public.church_branches'::regclass,new.branch_id,new.church_id) or not private.reference_belongs_to_church('public.financial_accounts'::regclass,new.account_id,new.church_id) or not private.reference_belongs_to_church('public.chart_of_accounts'::regclass,new.expense_account_id,new.church_id) or not private.reference_belongs_to_church('public.journal_entries'::regclass,new.journal_entry_id,new.church_id) then raise exception 'Expense references must belong to the same church.'; end if;
 elsif tg_table_name='journal_lines' then
  if not private.reference_belongs_to_church('public.journal_entries'::regclass,new.journal_entry_id,new.church_id) or not private.reference_belongs_to_church('public.chart_of_accounts'::regclass,new.account_id,new.church_id) then raise exception 'Journal line references must belong to the same church.'; end if;
 elsif tg_table_name='financial_budget_lines' then
  if not private.reference_belongs_to_church('public.financial_budgets'::regclass,new.budget_id,new.church_id) or not private.reference_belongs_to_church('public.chart_of_accounts'::regclass,new.account_id,new.church_id) then raise exception 'Budget line references must belong to the same church.'; end if;
 elsif tg_table_name='asset_maintenance' then
  if not private.reference_belongs_to_church('public.church_assets'::regclass,new.asset_id,new.church_id) then raise exception 'Maintenance record must reference an asset in the same church.'; end if;
 elsif tg_table_name='asset_depreciation_entries' then
  if not private.reference_belongs_to_church('public.church_assets'::regclass,new.asset_id,new.church_id) or not private.reference_belongs_to_church('public.journal_entries'::regclass,new.journal_entry_id,new.church_id) then raise exception 'Depreciation entry references must belong to the same church.'; end if;
 elsif tg_table_name='church_member_permissions' then
  if not private.reference_belongs_to_church('public.church_members'::regclass,new.church_member_id,new.church_id) then raise exception 'Permission assignment must reference a member of the same church.'; end if;
 elsif tg_table_name='donation_pledges' then
  if not private.reference_belongs_to_church('public.members'::regclass,new.member_id,new.church_id) then raise exception 'Donation pledge member must belong to the same church.'; end if;
 elsif tg_table_name='church_assets' then
  if not private.reference_belongs_to_church('public.church_branches'::regclass,new.branch_id,new.church_id) or not private.reference_belongs_to_church('public.members'::regclass,new.assigned_to_member_id,new.church_id) or not private.reference_belongs_to_church('public.chart_of_accounts'::regclass,new.asset_account_id,new.church_id) or not private.reference_belongs_to_church('public.chart_of_accounts'::regclass,new.accumulated_depreciation_account_id,new.church_id) or not private.reference_belongs_to_church('public.chart_of_accounts'::regclass,new.depreciation_expense_account_id,new.church_id) or not private.reference_belongs_to_church('public.chart_of_accounts'::regclass,new.disposal_gain_account_id,new.church_id) or not private.reference_belongs_to_church('public.chart_of_accounts'::regclass,new.disposal_loss_account_id,new.church_id) or not private.reference_belongs_to_church('public.financial_accounts'::regclass,new.disposal_cash_account_id,new.church_id) then raise exception 'Asset references must belong to the same church.'; end if;
 elsif tg_table_name='certificate_attachments' then
  if not private.reference_belongs_to_church('public.certificates'::regclass,new.certificate_id,new.church_id) or not private.reference_belongs_to_church('public.certificate_document_requirements'::regclass,new.requirement_id,new.church_id) then raise exception 'Certificate attachment references must belong to the same church.'; end if;
 elsif tg_table_name='certificate_history' then
  if not private.reference_belongs_to_church('public.certificates'::regclass,new.certificate_id,new.church_id) then raise exception 'Certificate history must reference a certificate in the same church.'; end if;
 elsif tg_table_name in ('church_services','church_events','ministries') then
  if not private.reference_belongs_to_church('public.church_branches'::regclass,new.branch_id,new.church_id) then raise exception 'Branch reference must belong to the same church.'; end if;
  if tg_table_name='ministries' and not private.reference_belongs_to_church('public.members'::regclass,new.leader_member_id,new.church_id) then raise exception 'Ministry leader must belong to the same church.'; end if;
 elsif tg_table_name='chart_of_accounts' then
  if not private.reference_belongs_to_church('public.chart_of_accounts'::regclass,new.parent_id,new.church_id) then raise exception 'Parent account must belong to the same church.'; end if;
 end if;
 return new;
end;
$$;
drop trigger if exists validate_family_relationship_tenant on public.family_relationships;
do $$ declare t text; begin
 foreach t in array array['members','families','certificates','member_documents','family_relationships','attendance_records','pastoral_followups','financial_accounts','donations','expenses','journal_lines','financial_budget_lines','asset_maintenance','asset_depreciation_entries','church_member_permissions','donation_pledges','church_assets','certificate_attachments','certificate_history','church_services','church_events','ministries','chart_of_accounts'] loop
  execute format('drop trigger if exists enforce_church_reference_integrity on public.%I',t);
  execute format('create trigger enforce_church_reference_integrity before insert or update on public.%I for each row execute function private.enforce_church_reference_integrity()',t);
 end loop;
end $$;

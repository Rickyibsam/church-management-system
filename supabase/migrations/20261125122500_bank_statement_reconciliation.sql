create table if not exists public.bank_reconciliation_items (
 id uuid primary key default gen_random_uuid(),
 church_id uuid not null references public.churches(id) on delete cascade,
 financial_account_id uuid not null references public.financial_accounts(id),
 journal_line_id uuid references public.journal_lines(id),
 statement_date date not null,
 reference_number text,
 description text not null,
 statement_amount numeric(14,2) not null,
 currency_code char(3) not null default 'PKR',
 status text not null default 'pending' check (status in ('pending','matched','ignored')),
 matched_at timestamptz,
 matched_by uuid references auth.users(id),
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 constraint bank_reconciliation_nonzero_amount check (statement_amount <> 0),
 constraint bank_reconciliation_match_unique unique (journal_line_id)
);
create index if not exists bank_reconciliation_church_account_date_idx on public.bank_reconciliation_items(church_id,financial_account_id,statement_date desc);
alter table public.bank_reconciliation_items enable row level security;
create policy bank_reconciliation_select on public.bank_reconciliation_items for select to authenticated using (private.has_church_permission(church_id,'accounts','view'));
create policy bank_reconciliation_insert on public.bank_reconciliation_items for insert to authenticated with check (private.has_church_permission(church_id,'accounts','create') and exists(select 1 from public.financial_accounts fa where fa.id=financial_account_id and fa.church_id=church_id));
create policy bank_reconciliation_update on public.bank_reconciliation_items for update to authenticated using (private.has_church_permission(church_id,'accounts','edit')) with check (private.has_church_permission(church_id,'accounts','edit') and exists(select 1 from public.financial_accounts fa where fa.id=financial_account_id and fa.church_id=church_id));
create policy bank_reconciliation_delete on public.bank_reconciliation_items for delete to authenticated using (private.has_church_permission(church_id,'accounts','delete'));
create or replace function private.validate_bank_reconciliation_item() returns trigger language plpgsql set search_path='' as $$
declare v_chart_account uuid; v_line_account uuid; v_line_church uuid; v_entry_status text;
begin
 select fa.chart_account_id into v_chart_account from public.financial_accounts fa where fa.id=new.financial_account_id and fa.church_id=new.church_id and fa.is_active;
 if not found then raise exception 'Select an active cash or bank account in this church.'; end if;
 if new.journal_line_id is not null then
  select jl.account_id,jl.church_id,je.status into v_line_account,v_line_church,v_entry_status from public.journal_lines jl join public.journal_entries je on je.id=jl.journal_entry_id where jl.id=new.journal_line_id;
  if not found or v_line_church<>new.church_id then raise exception 'The selected ledger line does not belong to this church.'; end if;
  if v_entry_status<>'posted' then raise exception 'Only posted ledger lines can be reconciled.'; end if;
  if v_chart_account is null or v_line_account<>v_chart_account then raise exception 'The selected ledger line does not belong to this cash or bank account.'; end if;
  new.status:='matched'; new.matched_at:=now(); new.matched_by:=auth.uid();
 else
  if new.status='matched' then raise exception 'A ledger line is required before marking an item as matched.'; end if;
  new.matched_at:=null; new.matched_by:=null;
 end if;
 return new;
end; $$;
create trigger validate_bank_reconciliation_item before insert or update on public.bank_reconciliation_items for each row execute function private.validate_bank_reconciliation_item();
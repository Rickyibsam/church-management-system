alter table public.financial_accounts add column if not exists chart_account_id uuid references public.chart_of_accounts(id) on delete restrict;
alter table public.donations add column if not exists status text not null default 'draft';
alter table public.donations add column if not exists income_account_id uuid references public.chart_of_accounts(id) on delete restrict;
alter table public.donations add column if not exists journal_entry_id uuid references public.journal_entries(id) on delete restrict;
alter table public.donations add column if not exists posted_at timestamptz;
alter table public.donations add column if not exists posted_by uuid references auth.users(id);
alter table public.expenses add column if not exists status text not null default 'draft';
alter table public.expenses add column if not exists expense_account_id uuid references public.chart_of_accounts(id) on delete restrict;
alter table public.expenses add column if not exists journal_entry_id uuid references public.journal_entries(id) on delete restrict;
alter table public.expenses add column if not exists posted_at timestamptz;
alter table public.expenses add column if not exists posted_by uuid references auth.users(id);
alter table public.donations add constraint donations_status_valid check(status in ('draft','posted','voided')) not valid;
alter table public.expenses add constraint expenses_status_valid check(status in ('draft','approved','posted','rejected','voided')) not valid;
create or replace function public.post_donation(p_donation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.donations%rowtype; v_cash_account uuid; v_income_account uuid; v_entry uuid; v_number text;
begin
 select * into v from public.donations where id=p_donation_id for update;
 if not found then raise exception 'Donation not found.'; end if;
 if not private.has_church_permission(v.church_id,'donations','edit') then raise exception 'You are not allowed to post donations.'; end if;
 if v.status='posted' then return jsonb_build_object('success',true,'journal_entry_id',v.journal_entry_id,'receipt_number',v.receipt_number); end if;
 if v.status<>'draft' then raise exception 'Only draft donations can be posted.'; end if;
 select fa.chart_account_id into v_cash_account from public.financial_accounts fa where fa.id=v.account_id and fa.church_id=v.church_id and fa.is_active;
 select coa.id into v_income_account from public.chart_of_accounts coa where coa.id=v.income_account_id and coa.church_id=v.church_id and coa.is_active and coa.account_type='income';
 if v_cash_account is null then raise exception 'Select an active cash or bank account linked to a chart-of-accounts asset.'; end if;
 if v_income_account is null then raise exception 'Select an active income account from this church chart of accounts.'; end if;
 v_number:=coalesce(v.receipt_number,'DON-'||to_char(v.donated_at,'YYYYMMDD')||'-'||upper(substr(replace(v.id::text,'-',''),1,8)));
 insert into public.journal_entries(church_id,entry_number,entry_date,description,status,source_type,source_id,created_by) values(v.church_id,'DON-JE-'||upper(substr(replace(v.id::text,'-',''),1,12)),v.donated_at::date,'Donation receipt '||v_number,'draft','donation',v.id,auth.uid()) returning id into v_entry;
 insert into public.journal_lines(church_id,journal_entry_id,account_id,description,debit,credit,currency_code) values(v.church_id,v_entry,v_cash_account,'Donation received',v.amount,0,v.currency_code),(v.church_id,v_entry,v_income_account,'Donation income',0,v.amount,v.currency_code);
 perform public.post_journal_entry(v_entry); perform set_config('app.donation_post_rpc','on',true);
 update public.donations set status='posted',journal_entry_id=v_entry,receipt_number=v_number,posted_at=now(),posted_by=auth.uid() where id=v.id;
 return jsonb_build_object('success',true,'journal_entry_id',v_entry,'receipt_number',v_number);
end; $$;
revoke all on function public.post_donation(uuid) from public; grant execute on function public.post_donation(uuid) to authenticated;
create or replace function public.approve_expense(p_expense_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.expenses%rowtype;
begin
 select * into v from public.expenses where id=p_expense_id for update;
 if not found then raise exception 'Expense not found.'; end if;
 if not private.has_church_permission(v.church_id,'expenses','edit') then raise exception 'You are not allowed to approve expenses.'; end if;
 if v.status<>'draft' then raise exception 'Only draft expenses can be approved.'; end if;
 perform set_config('app.expense_approve_rpc','on',true); update public.expenses set status='approved',approved_by=auth.uid() where id=v.id;
 return jsonb_build_object('success',true,'expense_id',v.id);
end; $$;
revoke all on function public.approve_expense(uuid) from public; grant execute on function public.approve_expense(uuid) to authenticated;
create or replace function public.post_expense(p_expense_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.expenses%rowtype; v_cash_account uuid; v_expense_account uuid; v_entry uuid;
begin
 select * into v from public.expenses where id=p_expense_id for update;
 if not found then raise exception 'Expense not found.'; end if;
 if not private.has_church_permission(v.church_id,'expenses','edit') then raise exception 'You are not allowed to post expenses.'; end if;
 if v.status='posted' then return jsonb_build_object('success',true,'journal_entry_id',v.journal_entry_id); end if;
 if v.status<>'approved' then raise exception 'Only approved expenses can be posted.'; end if;
 select fa.chart_account_id into v_cash_account from public.financial_accounts fa where fa.id=v.account_id and fa.church_id=v.church_id and fa.is_active;
 select coa.id into v_expense_account from public.chart_of_accounts coa where coa.id=v.expense_account_id and coa.church_id=v.church_id and coa.is_active and coa.account_type='expense';
 if v_cash_account is null then raise exception 'Select an active cash or bank account linked to a chart-of-accounts asset.'; end if;
 if v_expense_account is null then raise exception 'Select an active expense account from this church chart of accounts.'; end if;
 insert into public.journal_entries(church_id,entry_number,entry_date,description,status,source_type,source_id,created_by) values(v.church_id,'EXP-JE-'||upper(substr(replace(v.id::text,'-',''),1,12)),v.spent_at::date,'Expense: '||v.expense_category,'draft','expense',v.id,auth.uid()) returning id into v_entry;
 insert into public.journal_lines(church_id,journal_entry_id,account_id,description,debit,credit,currency_code) values(v.church_id,v_entry,v_expense_account,'Expense recorded',v.amount,0,v.currency_code),(v.church_id,v_entry,v_cash_account,'Cash or bank payment',0,v.amount,v.currency_code);
 perform public.post_journal_entry(v_entry); perform set_config('app.expense_post_rpc','on',true);
 update public.expenses set status='posted',journal_entry_id=v_entry,posted_at=now(),posted_by=auth.uid() where id=v.id;
 return jsonb_build_object('success',true,'journal_entry_id',v_entry);
end; $$;
revoke all on function public.post_expense(uuid) from public; grant execute on function public.post_expense(uuid) to authenticated;
create or replace function private.guard_posted_financial_source() returns trigger language plpgsql set search_path='' as $$
declare v_rpc text;
begin
 if tg_table_name='donations' then v_rpc:='app.donation_post_rpc'; else v_rpc:='app.expense_post_rpc'; end if;
 if tg_op='DELETE' then if old.status in ('posted','voided') then raise exception 'Posted or voided financial records cannot be deleted.'; end if; return old; end if;
 if old.status in ('posted','voided') then raise exception 'Posted or voided financial records are locked.'; end if;
 if tg_table_name='donations' and new.status='posted' and current_setting(v_rpc,true) is distinct from 'on' then raise exception 'Use the Post Donation action.'; end if;
 if tg_table_name='expenses' and new.status='approved' and current_setting('app.expense_approve_rpc',true) is distinct from 'on' then raise exception 'Use the Approve Expense action.'; end if;
 if tg_table_name='expenses' and new.status='posted' and current_setting(v_rpc,true) is distinct from 'on' then raise exception 'Use the Post Expense action.'; end if;
 return new;
end; $$;
drop trigger if exists guard_posted_donation on public.donations; create trigger guard_posted_donation before update or delete on public.donations for each row execute function private.guard_posted_financial_source();
drop trigger if exists guard_posted_expense on public.expenses; create trigger guard_posted_expense before update or delete on public.expenses for each row execute function private.guard_posted_financial_source();
create or replace view public.financial_ledger with (security_invoker=true) as
select d.church_id,d.donated_at as transaction_date,'donation'::text as transaction_type,d.receipt_number as reference_number,coalesce(d.notes,d.donation_type) as description,fa.name as account_name,income.account_name as counter_account_name,d.amount as debit_amount,d.amount as credit_amount,d.currency_code,d.journal_entry_id from public.donations d join public.financial_accounts fa on fa.id=d.account_id and fa.church_id=d.church_id join public.chart_of_accounts income on income.id=d.income_account_id and income.church_id=d.church_id where d.status='posted'
union all
select e.church_id,e.spent_at as transaction_date,'expense'::text as transaction_type,'EXP-'||upper(substr(replace(e.id::text,'-',''),1,8)) as reference_number,e.description,expense.account_name as account_name,fa.name as counter_account_name,e.amount as debit_amount,e.amount as credit_amount,e.currency_code,e.journal_entry_id from public.expenses e join public.financial_accounts fa on fa.id=e.account_id and fa.church_id=e.church_id join public.chart_of_accounts expense on expense.id=e.expense_account_id and expense.church_id=e.church_id where e.status='posted';
grant select on public.financial_ledger to authenticated;

create or replace function public.post_donation(p_donation_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v public.donations%rowtype; v_cash_account uuid; v_income_account uuid; v_entry uuid; v_number text;
begin
 select * into v from public.donations where id=p_donation_id for update;
 if not found then raise exception 'Donation not found.'; end if;
 if not private.has_church_permission(v.church_id,'donations','edit') then raise exception 'You are not allowed to post donations.'; end if;
 if v.status='posted' then return jsonb_build_object('success',true,'journal_entry_id',v.journal_entry_id,'receipt_number',v.receipt_number); end if;
 if v.status<>'draft' then raise exception 'Only draft donations can be posted.'; end if;
 select coa.id into v_cash_account from public.financial_accounts fa join public.chart_of_accounts coa on coa.id=fa.chart_account_id and coa.church_id=fa.church_id where fa.id=v.account_id and fa.church_id=v.church_id and fa.is_active and coa.is_active and coa.account_type='asset';
 select coa.id into v_income_account from public.chart_of_accounts coa where coa.id=v.income_account_id and coa.church_id=v.church_id and coa.is_active and coa.account_type='income';
 if v_cash_account is null then raise exception 'Select an active cash or bank account linked to an active asset account.'; end if;
 if v_income_account is null then raise exception 'Select an active income account from this church chart of accounts.'; end if;
 v_number:=coalesce(v.receipt_number,'DON-'||to_char(v.donated_at,'YYYYMMDD')||'-'||upper(substr(replace(v.id::text,'-',''),1,8)));
 insert into public.journal_entries(church_id,entry_number,entry_date,description,status,source_type,source_id,created_by) values(v.church_id,'DON-JE-'||upper(substr(replace(v.id::text,'-',''),1,12)),v.donated_at::date,'Donation receipt '||v_number,'draft','donation',v.id,auth.uid()) returning id into v_entry;
 insert into public.journal_lines(church_id,journal_entry_id,account_id,description,debit,credit,currency_code) values(v.church_id,v_entry,v_cash_account,'Donation received',v.amount,0,v.currency_code),(v.church_id,v_entry,v_income_account,'Donation income',0,v.amount,v.currency_code);
 perform public.post_journal_entry(v_entry);perform set_config('app.donation_post_rpc','on',true);
 update public.donations set status='posted',journal_entry_id=v_entry,receipt_number=v_number,posted_at=now(),posted_by=auth.uid() where id=v.id;
 return jsonb_build_object('success',true,'journal_entry_id',v_entry,'receipt_number',v_number);
end; $$;
create or replace function public.post_expense(p_expense_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v public.expenses%rowtype; v_cash_account uuid; v_expense_account uuid; v_entry uuid;
begin
 select * into v from public.expenses where id=p_expense_id for update;
 if not found then raise exception 'Expense not found.'; end if;
 if not private.has_church_permission(v.church_id,'expenses','edit') then raise exception 'You are not allowed to post expenses.'; end if;
 if v.status='posted' then return jsonb_build_object('success',true,'journal_entry_id',v.journal_entry_id); end if;
 if v.status<>'approved' then raise exception 'Only approved expenses can be posted.'; end if;
 select coa.id into v_cash_account from public.financial_accounts fa join public.chart_of_accounts coa on coa.id=fa.chart_account_id and coa.church_id=fa.church_id where fa.id=v.account_id and fa.church_id=v.church_id and fa.is_active and coa.is_active and coa.account_type='asset';
 select coa.id into v_expense_account from public.chart_of_accounts coa where coa.id=v.expense_account_id and coa.church_id=v.church_id and coa.is_active and coa.account_type='expense';
 if v_cash_account is null then raise exception 'Select an active cash or bank account linked to an active asset account.'; end if;
 if v_expense_account is null then raise exception 'Select an active expense account from this church chart of accounts.'; end if;
 insert into public.journal_entries(church_id,entry_number,entry_date,description,status,source_type,source_id,created_by) values(v.church_id,'EXP-JE-'||upper(substr(replace(v.id::text,'-',''),1,12)),v.spent_at::date,'Expense: '||v.expense_category,'draft','expense',v.id,auth.uid()) returning id into v_entry;
 insert into public.journal_lines(church_id,journal_entry_id,account_id,description,debit,credit,currency_code) values(v.church_id,v_entry,v_expense_account,'Expense recorded',v.amount,0,v.currency_code),(v.church_id,v_entry,v_cash_account,'Cash or bank payment',0,v.amount,v.currency_code);
 perform public.post_journal_entry(v_entry);perform set_config('app.expense_post_rpc','on',true);
 update public.expenses set status='posted',journal_entry_id=v_entry,posted_at=now(),posted_by=auth.uid() where id=v.id;
 return jsonb_build_object('success',true,'journal_entry_id',v_entry);
end; $$;
create or replace function private.guard_posted_financial_source() returns trigger language plpgsql set search_path='' as $$
declare v_rpc text;
begin
 if tg_table_name='donations' then v_rpc:='app.donation_post_rpc'; else v_rpc:='app.expense_post_rpc'; end if;
 if tg_op='DELETE' then
  if old.status in ('posted','voided') then raise exception 'Posted or voided financial records cannot be deleted.'; end if;
  if tg_table_name='expenses' and old.status='approved' then raise exception 'Approved expenses cannot be deleted.'; end if;
  return old;
 end if;
 if old.status in ('posted','voided') then raise exception 'Posted or voided financial records are locked.'; end if;
 if tg_table_name='expenses' and old.status='approved' and current_setting('app.expense_post_rpc',true) is distinct from 'on' then raise exception 'Approved expenses are locked until they are posted.'; end if;
 if tg_table_name='donations' and new.status in ('posted','voided') and current_setting(v_rpc,true) is distinct from 'on' then raise exception 'Use the authorized donation workflow to change this status.'; end if;
 if tg_table_name='expenses' and new.status='approved' and current_setting('app.expense_approve_rpc',true) is distinct from 'on' then raise exception 'Use the Approve Expense action.'; end if;
 if tg_table_name='expenses' and new.status in ('posted','rejected','voided') and current_setting(v_rpc,true) is distinct from 'on' then raise exception 'Use an authorized expense workflow to change this status.'; end if;
 return new;
end; $$;

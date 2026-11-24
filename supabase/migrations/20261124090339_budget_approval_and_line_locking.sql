create or replace function public.approve_financial_budget(p_budget_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v public.financial_budgets%rowtype;v_count integer;
begin
 select * into v from public.financial_budgets where id=p_budget_id for update;
 if not found then raise exception 'Budget not found.'; end if;
 if not private.has_church_permission(v.church_id,'budgets','edit') then raise exception 'You are not allowed to approve this budget.'; end if;
 if v.status<>'draft' then raise exception 'Only draft budgets can be approved.'; end if;
 select count(*) into v_count from public.financial_budget_lines where budget_id=v.id and church_id=v.church_id;
 if v_count=0 then raise exception 'Add at least one budget line before approval.'; end if;
 perform set_config('app.budget_approve_rpc','on',true);update public.financial_budgets set status='approved' where id=v.id;
 return jsonb_build_object('success',true,'budget_id',v.id);
end;
$$;
revoke all on function public.approve_financial_budget(uuid) from public;grant execute on function public.approve_financial_budget(uuid) to authenticated;
create or replace function private.guard_financial_budget() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then if new.status<>'draft' then raise exception 'New budgets must begin as drafts.'; end if;return new;end if;
 if tg_op='DELETE' then if old.status in ('approved','closed') then raise exception 'Approved or closed budgets cannot be deleted.';end if;return old;end if;
 if old.status in ('approved','closed') then raise exception 'Approved or closed budgets are locked.';end if;
 if new.status='approved' and current_setting('app.budget_approve_rpc',true) is distinct from 'on' then raise exception 'Use the Approve Budget action.';end if;
 return new;
end; $$;
drop trigger if exists guard_financial_budget on public.financial_budgets;
create trigger guard_financial_budget before insert or update or delete on public.financial_budgets for each row execute function private.guard_financial_budget();
create or replace function private.guard_financial_budget_line() returns trigger language plpgsql set search_path='' as $$
declare v_budget_status text;v_budget_church uuid;v_account_church uuid;v_active boolean;
begin
 if tg_op='DELETE' or tg_op='UPDATE' then select status into v_budget_status from public.financial_budgets where id=old.budget_id;if v_budget_status<>'draft' then raise exception 'Budget lines are locked after budget approval.';end if;end if;
 if tg_op='INSERT' or tg_op='UPDATE' then
  select status,church_id into v_budget_status,v_budget_church from public.financial_budgets where id=new.budget_id;
  select church_id,is_active into v_account_church,v_active from public.chart_of_accounts where id=new.account_id;
  if v_budget_status<>'draft' then raise exception 'Budget lines can only be changed while the budget is a draft.';end if;
  if v_budget_church is distinct from new.church_id or v_account_church is distinct from new.church_id or not coalesce(v_active,false) then raise exception 'Budget and active account must belong to the same church.';end if;
  return new;
 end if;
 return old;
end; $$;
drop trigger if exists guard_financial_budget_line on public.financial_budget_lines;
create trigger guard_financial_budget_line before insert or update or delete on public.financial_budget_lines for each row execute function private.guard_financial_budget_line();

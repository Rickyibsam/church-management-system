create or replace function public.post_journal_entry(p_entry_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_church_id uuid; v_status text; v_debit numeric(16,2); v_credit numeric(16,2); v_line_count integer; v_bad_accounts integer;
begin
 select church_id,status into v_church_id,v_status from public.journal_entries where id=p_entry_id for update;
 if v_church_id is null then raise exception 'Journal entry not found.'; end if;
 if not private.has_church_permission(v_church_id,'accounts','edit') then raise exception 'You are not allowed to post journal entries.'; end if;
 if v_status<>'draft' then raise exception 'Only draft journal entries can be posted.'; end if;
 select coalesce(sum(debit),0),coalesce(sum(credit),0),count(*) into v_debit,v_credit,v_line_count from public.journal_lines where journal_entry_id=p_entry_id and church_id=v_church_id;
 if v_line_count<2 or v_debit<=0 or v_debit<>v_credit then raise exception 'Journal entry must contain at least two balanced debit and credit lines.'; end if;
 select count(*) into v_bad_accounts from public.journal_lines jl left join public.chart_of_accounts coa on coa.id=jl.account_id and coa.church_id=v_church_id and coa.is_active where jl.journal_entry_id=p_entry_id and (jl.church_id<>v_church_id or coa.id is null);
 if v_bad_accounts>0 then raise exception 'Every journal line must reference an active account in this church.'; end if;
 perform set_config('app.journal_post_rpc','on',true);
 update public.journal_entries set status='posted',posted_by=auth.uid(),posted_at=now() where id=p_entry_id;
 return jsonb_build_object('success',true,'entry_id',p_entry_id,'debit_total',v_debit,'credit_total',v_credit);
end;
$$;
revoke all on function public.post_journal_entry(uuid) from public;
grant execute on function public.post_journal_entry(uuid) to authenticated;
create or replace function private.guard_posted_journal_entry() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
  if new.status='posted' and current_setting('app.journal_post_rpc',true) is distinct from 'on' then raise exception 'Journal entries must be posted through the approval workflow.'; end if;
  return new;
 elsif tg_op='UPDATE' then
  if old.status='posted' then raise exception 'Posted journal entries are locked and cannot be edited.'; end if;
  if new.status='posted' and current_setting('app.journal_post_rpc',true) is distinct from 'on' then raise exception 'Use the Post Journal action to post this entry.'; end if;
  return new;
 else
  if old.status='posted' then raise exception 'Posted journal entries cannot be deleted.'; end if;
  return old;
 end if;
end;
$$;
drop trigger if exists guard_posted_journal_entry on public.journal_entries;
create trigger guard_posted_journal_entry before insert or update or delete on public.journal_entries for each row execute function private.guard_posted_journal_entry();
create or replace function private.guard_posted_journal_line() returns trigger language plpgsql set search_path='' as $$
declare v_status text;
begin
 if tg_op='DELETE' or tg_op='UPDATE' then
  select status into v_status from public.journal_entries where id=old.journal_entry_id;
  if v_status='posted' then raise exception 'Lines of a posted journal entry are locked.'; end if;
 end if;
 if tg_op='INSERT' or tg_op='UPDATE' then
  select status into v_status from public.journal_entries where id=new.journal_entry_id;
  if v_status='posted' then raise exception 'Lines of a posted journal entry are locked.'; end if;
  return new;
 end if;
 return old;
end;
$$;
drop trigger if exists guard_posted_journal_line on public.journal_lines;
create trigger guard_posted_journal_line before insert or update or delete on public.journal_lines for each row execute function private.guard_posted_journal_line();

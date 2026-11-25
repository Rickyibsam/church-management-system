create or replace function private.notify_donation_posted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status and new.status = 'posted' then
    insert into public.notifications (church_id,user_id,title,body,notification_type)
    select new.church_id,cm.user_id,
      'Donation receipt posted',
      'A donation receipt has been posted to the church accounts.',
      'donations'
    from public.church_members cm
    where cm.church_id=new.church_id
      and cm.status='active'
      and cm.role in ('owner','admin','accountant','finance')
      and cm.user_id is distinct from coalesce(new.posted_by,auth.uid());
  end if;
  return new;
end;
$$;

create or replace function private.notify_expense_posted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status and new.status = 'posted' then
    insert into public.notifications (church_id,user_id,title,body,notification_type)
    select new.church_id,cm.user_id,
      'Expense posted',
      'An approved expense has been posted to the church accounts.',
      'expenses'
    from public.church_members cm
    where cm.church_id=new.church_id
      and cm.status='active'
      and cm.role in ('owner','admin','accountant','finance')
      and cm.user_id is distinct from coalesce(new.posted_by,auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists notify_donation_posted on public.donations;
create trigger notify_donation_posted
after update of status on public.donations
for each row execute function private.notify_donation_posted();

drop trigger if exists notify_expense_posted on public.expenses;
create trigger notify_expense_posted
after update of status on public.expenses
for each row execute function private.notify_expense_posted();

revoke all on function private.notify_donation_posted() from public,anon,authenticated;
revoke all on function private.notify_expense_posted() from public,anon,authenticated;

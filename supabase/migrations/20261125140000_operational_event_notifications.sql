-- Operational notifications for finance and asset lifecycle events.
-- Notifications contain no donor, pastoral, or financial personal details.

create or replace function private.notify_journal_posted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status and new.status = 'posted' then
    insert into public.notifications (church_id, user_id, title, body, notification_type)
    select new.church_id, cm.user_id,
      'Journal entry posted',
      'A journal entry has been posted to the church ledger.',
      'finance'
    from public.church_members cm
    where cm.church_id = new.church_id
      and cm.status = 'active'
      and cm.role in ('owner', 'admin', 'pastor', 'secretary')
      and cm.user_id is distinct from coalesce(new.posted_by, auth.uid());
  end if;
  return new;
end;
$$;

create or replace function private.notify_budget_approved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status and new.status = 'approved' then
    insert into public.notifications (church_id, user_id, title, body, notification_type)
    select new.church_id, cm.user_id,
      'Budget approved',
      'A church financial budget has been approved.',
      'finance'
    from public.church_members cm
    where cm.church_id = new.church_id
      and cm.status = 'active'
      and cm.role in ('owner', 'admin', 'pastor', 'secretary')
      and cm.user_id is distinct from auth.uid();
  end if;
  return new;
end;
$$;

create or replace function private.notify_asset_disposed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.asset_status is distinct from new.asset_status and new.asset_status = 'disposed' then
    insert into public.notifications (church_id, user_id, title, body, notification_type)
    select new.church_id, cm.user_id,
      'Church asset disposed',
      'A church asset has been marked as disposed. Review the asset register for details.',
      'assets'
    from public.church_members cm
    where cm.church_id = new.church_id
      and cm.status = 'active'
      and cm.role in ('owner', 'admin', 'pastor', 'secretary')
      and cm.user_id is distinct from auth.uid();
  end if;
  return new;
end;
$$;

revoke all on function private.notify_journal_posted() from public, anon, authenticated;
revoke all on function private.notify_budget_approved() from public, anon, authenticated;
revoke all on function private.notify_asset_disposed() from public, anon, authenticated;

drop trigger if exists notify_journal_posted on public.journal_entries;
create trigger notify_journal_posted
after update of status on public.journal_entries
for each row execute function private.notify_journal_posted();

drop trigger if exists notify_budget_approved on public.financial_budgets;
create trigger notify_budget_approved
after update of status on public.financial_budgets
for each row execute function private.notify_budget_approved();

drop trigger if exists notify_asset_disposed on public.church_assets;
create trigger notify_asset_disposed
after update of asset_status on public.church_assets
for each row execute function private.notify_asset_disposed();

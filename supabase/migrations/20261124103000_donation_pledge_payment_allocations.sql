create table if not exists public.donation_pledge_allocations (
 id uuid primary key default gen_random_uuid(),
 church_id uuid not null references public.churches(id) on delete cascade,
 pledge_id uuid not null references public.donation_pledges(id) on delete restrict,
 donation_id uuid not null references public.donations(id) on delete restrict,
 amount numeric(14,2) not null check (amount > 0),
 allocated_at timestamptz not null default now(),
 allocated_by uuid not null references auth.users(id),
 unique (pledge_id, donation_id)
);
create index if not exists donation_pledge_allocations_church_pledge_idx
 on public.donation_pledge_allocations(church_id, pledge_id, allocated_at desc);
create index if not exists donation_pledge_allocations_church_donation_idx
 on public.donation_pledge_allocations(church_id, donation_id);
alter table public.donation_pledge_allocations enable row level security;
drop policy if exists donation_pledge_allocations_select on public.donation_pledge_allocations;
create policy donation_pledge_allocations_select on public.donation_pledge_allocations
 for select to authenticated using (
  private.has_church_permission(church_id,'donations','view')
  and private.has_church_branch_access(church_id, null)
);
create or replace function private.guard_donation_pledge_status()
returns trigger language plpgsql set search_path = '' as $$
begin
 if new.status is distinct from old.status
    and current_setting('app.pledge_allocation_rpc', true) is distinct from 'on' then
  raise exception 'Pledge status is calculated from recorded payments and cannot be edited directly.';
 end if;
 return new;
end;
$$;
drop trigger if exists donation_pledge_status_guard on public.donation_pledges;
create trigger donation_pledge_status_guard
 before update of status on public.donation_pledges
 for each row execute function private.guard_donation_pledge_status();
create or replace function public.allocate_donation_to_pledge(
 p_pledge_id uuid,
 p_donation_id uuid,
 p_amount numeric
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 v_user uuid := auth.uid();
 v_pledge public.donation_pledges%rowtype;
 v_donation public.donations%rowtype;
 v_pledge_allocated numeric(14,2);
 v_donation_allocated numeric(14,2);
 v_status text;
begin
 if v_user is null then raise exception 'Authentication is required.'; end if;
 if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount,2) then
  raise exception 'Allocation amount must be greater than zero and have no more than two decimal places.';
 end if;
 select * into v_pledge from public.donation_pledges where id=p_pledge_id for update;
 if not found then raise exception 'Donation pledge not found.'; end if;
 if not private.has_church_permission(v_pledge.church_id,'donations','edit') then
  raise exception 'You are not allowed to allocate donation payments.';
 end if;
 if not private.has_church_branch_access(v_pledge.church_id, null) then
  raise exception 'You do not have access to this church branch.';
 end if;
 if v_pledge.status='cancelled' then raise exception 'Cancelled pledges cannot receive payments.'; end if;
 select * into v_donation from public.donations where id=p_donation_id for update;
 if not found or v_donation.church_id<>v_pledge.church_id then
  raise exception 'Donation receipt was not found in this church.';
 end if;
 if v_donation.status<>'posted' then raise exception 'Only posted donation receipts can be allocated.'; end if;
 if v_donation.currency_code<>v_pledge.currency_code then
  raise exception 'Donation and pledge currencies must match.';
 end if;
 select coalesce(sum(amount),0) into v_pledge_allocated
 from public.donation_pledge_allocations where pledge_id=v_pledge.id;
 select coalesce(sum(amount),0) into v_donation_allocated
 from public.donation_pledge_allocations where donation_id=v_donation.id;
 if v_pledge_allocated+p_amount>v_pledge.amount then
  raise exception 'Allocation exceeds the outstanding pledge balance.';
 end if;
 if v_donation_allocated+p_amount>v_donation.amount then
  raise exception 'Allocation exceeds the unallocated donation receipt balance.';
 end if;
 insert into public.donation_pledge_allocations(church_id,pledge_id,donation_id,amount,allocated_by)
 values(v_pledge.church_id,v_pledge.id,v_donation.id,p_amount,v_user);
 v_pledge_allocated:=v_pledge_allocated+p_amount;
 v_status:=case when v_pledge_allocated>=v_pledge.amount then 'fulfilled'
                when v_pledge_allocated>0 then 'partially_paid' else 'open' end;
 perform set_config('app.pledge_allocation_rpc','on',true);
 update public.donation_pledges set status=v_status where id=v_pledge.id;
 return jsonb_build_object('success',true,'allocation_id',(select id from public.donation_pledge_allocations where pledge_id=v_pledge.id and donation_id=v_donation.id),'allocated_total',v_pledge_allocated,'outstanding_amount',v_pledge.amount-v_pledge_allocated,'status',v_status);
end;
$$;
revoke all on function public.allocate_donation_to_pledge(uuid,uuid,numeric) from public, anon;
grant execute on function public.allocate_donation_to_pledge(uuid,uuid,numeric) to authenticated;
revoke insert, update, delete on public.donation_pledge_allocations from anon, authenticated;
grant select on public.donation_pledge_allocations to authenticated;

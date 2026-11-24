alter table public.donation_pledge_allocations
 drop constraint if exists donation_pledge_allocations_pledge_id_donation_id_key;
create or replace function private.guard_donation_pledge_status()
returns trigger language plpgsql set search_path = '' as $$
begin
 if new.status is distinct from old.status
    and current_setting('app.pledge_allocation_rpc', true) is distinct from 'on' then
  raise exception 'Pledge status is calculated from recorded payments and cannot be edited directly.';
 end if;
 if (new.amount is distinct from old.amount or new.currency_code is distinct from old.currency_code)
    and exists(select 1 from public.donation_pledge_allocations a where a.pledge_id=old.id) then
  raise exception 'Pledge amount and currency cannot change after a payment has been allocated.';
 end if;
 return new;
end;
$$;
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
 v_allocation_id uuid;
 v_member_branch uuid;
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
 select m.branch_id into v_member_branch from public.members m where m.id=v_pledge.member_id and m.church_id=v_pledge.church_id;
 if not private.has_church_branch_access(v_pledge.church_id,v_member_branch) then
  raise exception 'You do not have access to this church branch.';
 end if;
 if v_pledge.status='cancelled' then raise exception 'Cancelled pledges cannot receive payments.'; end if;
 select * into v_donation from public.donations where id=p_donation_id for update;
 if not found or v_donation.church_id<>v_pledge.church_id then
  raise exception 'Donation receipt was not found in this church.';
 end if;
 if not private.has_church_branch_access(v_donation.church_id,v_donation.branch_id) then
  raise exception 'You do not have access to the donation receipt branch.';
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
 values(v_pledge.church_id,v_pledge.id,v_donation.id,p_amount,v_user)
 returning id into v_allocation_id;
 v_pledge_allocated:=v_pledge_allocated+p_amount;
 v_status:=case when v_pledge_allocated>=v_pledge.amount then 'fulfilled'
                when v_pledge_allocated>0 then 'partially_paid' else 'open' end;
 perform set_config('app.pledge_allocation_rpc','on',true);
 update public.donation_pledges set status=v_status where id=v_pledge.id;
 return jsonb_build_object('success',true,'allocation_id',v_allocation_id,'allocated_total',v_pledge_allocated,'outstanding_amount',v_pledge.amount-v_pledge_allocated,'status',v_status);
end;
$$;
revoke all on function public.allocate_donation_to_pledge(uuid,uuid,numeric) from public, anon;
grant execute on function public.allocate_donation_to_pledge(uuid,uuid,numeric) to authenticated;
drop policy if exists donation_pledge_allocations_select on public.donation_pledge_allocations;
create policy donation_pledge_allocations_select on public.donation_pledge_allocations
 for select to authenticated using (
  private.has_church_permission(church_id,'donations','view')
  and exists (
   select 1
   from public.donation_pledges p
   join public.donations d on d.id=donation_pledge_allocations.donation_id
   where p.id=donation_pledge_allocations.pledge_id
     and p.church_id=donation_pledge_allocations.church_id
     and d.church_id=donation_pledge_allocations.church_id
     and private.has_church_branch_access(p.church_id,
       (select m.branch_id from public.members m where m.id=p.member_id and m.church_id=p.church_id))
     and private.has_church_branch_access(d.church_id,d.branch_id)
  )
 );
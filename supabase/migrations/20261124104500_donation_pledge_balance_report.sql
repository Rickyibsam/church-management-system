create or replace view public.donation_pledge_balance_report
with (security_invoker = true) as
select
 p.id as pledge_id,
 p.church_id,
 p.donor_name,
 p.member_id,
 p.amount as pledged_amount,
 p.currency_code,
 p.pledged_on,
 p.due_on,
 p.status,
 coalesce(a.allocated_amount,0)::numeric(14,2) as allocated_amount,
 greatest(p.amount-coalesce(a.allocated_amount,0),0)::numeric(14,2) as outstanding_amount
from public.donation_pledges p
left join (
 select pledge_id, church_id, sum(amount)::numeric(14,2) as allocated_amount
 from public.donation_pledge_allocations
 group by pledge_id,church_id
) a on a.pledge_id=p.id and a.church_id=p.church_id;
revoke all on public.donation_pledge_balance_report from anon;
grant select on public.donation_pledge_balance_report to authenticated;
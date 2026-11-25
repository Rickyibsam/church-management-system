create or replace view public.bank_reconciliation_summary
with (security_invoker = true)
as
select
  bri.church_id,
  bri.financial_account_id,
  fa.name as account_name,
  bri.currency_code,
  count(*)::bigint as statement_line_count,
  count(*) filter (where bri.status = 'matched')::bigint as matched_line_count,
  count(*) filter (where bri.status = 'pending')::bigint as pending_line_count,
  count(*) filter (where bri.status = 'ignored')::bigint as ignored_line_count,
  coalesce(sum(bri.statement_amount),0)::numeric(14,2) as statement_net_amount,
  coalesce(sum(bri.statement_amount) filter (where bri.status = 'matched'),0)::numeric(14,2) as matched_net_amount,
  coalesce(sum(bri.statement_amount) filter (where bri.status = 'pending'),0)::numeric(14,2) as pending_net_amount,
  min(bri.statement_date) as first_statement_date,
  max(bri.statement_date) as last_statement_date
from public.bank_reconciliation_items bri
join public.financial_accounts fa
  on fa.id = bri.financial_account_id
 and fa.church_id = bri.church_id
group by bri.church_id, bri.financial_account_id, fa.name, bri.currency_code;

grant select on public.bank_reconciliation_summary to authenticated;

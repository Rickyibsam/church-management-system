create or replace view public.account_activity_summary with (security_invoker=true) as
select je.church_id,date_trunc('month',je.entry_date)::date as month_start,jl.account_id,coa.account_code,coa.account_name,coa.account_type,jl.currency_code,sum(jl.debit) as debit_total,sum(jl.credit) as credit_total,count(*) as line_count
from public.journal_entries je join public.journal_lines jl on jl.journal_entry_id=je.id and jl.church_id=je.church_id join public.chart_of_accounts coa on coa.id=jl.account_id and coa.church_id=je.church_id
where je.status='posted'
group by je.church_id,date_trunc('month',je.entry_date)::date,jl.account_id,coa.account_code,coa.account_name,coa.account_type,jl.currency_code;
create or replace view public.budget_performance_report with (security_invoker=true) as
select b.church_id,b.name as budget_name,b.fiscal_year,bl.period_month,coa.account_code,coa.account_name,coa.account_type,b.currency_code,bl.planned_amount,
coalesce(case when coa.account_type='income' then aa.credit_total-aa.debit_total else aa.debit_total-aa.credit_total end,0) as actual_amount,
bl.planned_amount-coalesce(case when coa.account_type='income' then aa.credit_total-aa.debit_total else aa.debit_total-aa.credit_total end,0) as variance
from public.financial_budget_lines bl join public.financial_budgets b on b.id=bl.budget_id and b.church_id=bl.church_id join public.chart_of_accounts coa on coa.id=bl.account_id and coa.church_id=bl.church_id
left join public.account_activity_summary aa on aa.church_id=bl.church_id and aa.account_id=bl.account_id and aa.month_start=make_date(b.fiscal_year,bl.period_month,1) and aa.currency_code=b.currency_code;
grant select on public.account_activity_summary,public.budget_performance_report to authenticated;

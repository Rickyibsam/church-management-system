-- Tighten public RPC execution grants while retaining authenticated workflows.
-- QR verification is intentionally public and remains executable by anon.
revoke all on function public.approve_expense(uuid) from public, anon;
revoke all on function public.approve_financial_budget(uuid) from public, anon;
revoke all on function public.dispose_church_asset(uuid,date,numeric,uuid) from public, anon;
revoke all on function public.post_asset_depreciation(uuid,date) from public, anon;
revoke all on function public.post_donation(uuid) from public, anon;
revoke all on function public.post_expense(uuid) from public, anon;
revoke all on function public.post_journal_entry(uuid) from public, anon;
revoke all on function public.reissue_certificate(uuid,text) from public, anon;

grant execute on function public.approve_expense(uuid) to authenticated;
grant execute on function public.approve_financial_budget(uuid) to authenticated;
grant execute on function public.dispose_church_asset(uuid,date,numeric,uuid) to authenticated;
grant execute on function public.post_asset_depreciation(uuid,date) to authenticated;
grant execute on function public.post_donation(uuid) to authenticated;
grant execute on function public.post_expense(uuid) to authenticated;
grant execute on function public.post_journal_entry(uuid) to authenticated;
grant execute on function public.reissue_certificate(uuid,text) to authenticated;

-- Sequence rows are accessed only inside trusted, permission-checked RPCs.
revoke all on table public.certificate_sequences from anon, authenticated;

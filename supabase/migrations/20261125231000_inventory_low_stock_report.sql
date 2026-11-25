create or replace view public.inventory_low_stock
with (security_invoker=true)
as select * from public.inventory_stock_summary where is_low_stock;
grant select on public.inventory_low_stock to authenticated;

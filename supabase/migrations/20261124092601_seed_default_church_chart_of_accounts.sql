create or replace function private.seed_default_church_accounts()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_cash_account uuid;
begin
 insert into public.chart_of_accounts(church_id,account_code,account_name,account_type,is_active) values
 (new.id,'1000','Cash on Hand','asset',true),(new.id,'1010','Bank Accounts','asset',true),(new.id,'1100','Accounts Receivable','asset',true),(new.id,'1500','Property & Equipment','asset',true),(new.id,'1590','Accumulated Depreciation','asset',true),
 (new.id,'2000','Accounts Payable','liability',true),(new.id,'3000','Church Funds / Equity','equity',true),
 (new.id,'4000','Tithes & Offerings','income',true),(new.id,'4100','General Donations','income',true),(new.id,'4200','Other Income','income',true),
 (new.id,'5000','Salaries & Staff Costs','expense',true),(new.id,'5100','Utilities','expense',true),(new.id,'5200','Repairs & Maintenance','expense',true),(new.id,'5300','Ministry & Outreach','expense',true),(new.id,'5400','Depreciation Expense','expense',true),(new.id,'5500','Other Expenses','expense',true)
 on conflict(church_id,account_code) do nothing;
 select id into v_cash_account from public.chart_of_accounts where church_id=new.id and account_code='1000';
 if not exists(select 1 from public.financial_accounts where church_id=new.id and name='Cash on Hand') then
  insert into public.financial_accounts(church_id,name,account_type,currency_code,opening_balance,is_active,chart_account_id) values(new.id,'Cash on Hand','cash',new.currency_code,0,true,v_cash_account);
 end if;
 return new;
end;
$$;
drop trigger if exists seed_default_church_accounts on public.churches;
create trigger seed_default_church_accounts after insert on public.churches for each row execute function private.seed_default_church_accounts();
insert into public.chart_of_accounts(church_id,account_code,account_name,account_type,is_active)
select c.id,v.account_code,v.account_name,v.account_type,true from public.churches c cross join (values
 ('1000','Cash on Hand','asset'),('1010','Bank Accounts','asset'),('1100','Accounts Receivable','asset'),('1500','Property & Equipment','asset'),('1590','Accumulated Depreciation','asset'),('2000','Accounts Payable','liability'),('3000','Church Funds / Equity','equity'),('4000','Tithes & Offerings','income'),('4100','General Donations','income'),('4200','Other Income','income'),('5000','Salaries & Staff Costs','expense'),('5100','Utilities','expense'),('5200','Repairs & Maintenance','expense'),('5300','Ministry & Outreach','expense'),('5400','Depreciation Expense','expense'),('5500','Other Expenses','expense')
) as v(account_code,account_name,account_type) on conflict(church_id,account_code) do nothing;
insert into public.financial_accounts(church_id,name,account_type,currency_code,opening_balance,is_active,chart_account_id)
select c.id,'Cash on Hand','cash',c.currency_code,0,true,coa.id from public.churches c join public.chart_of_accounts coa on coa.church_id=c.id and coa.account_code='1000'
where not exists(select 1 from public.financial_accounts fa where fa.church_id=c.id and fa.name='Cash on Hand');

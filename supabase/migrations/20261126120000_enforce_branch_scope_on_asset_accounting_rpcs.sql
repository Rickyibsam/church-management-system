CREATE OR REPLACE FUNCTION public.dispose_church_asset(p_asset_id uuid, p_disposal_date date, p_proceeds numeric, p_cash_account_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v public.church_assets%rowtype;v_cash uuid;v_asset uuid;v_accum uuid;v_gain uuid;v_loss uuid;v_entry uuid;v_book numeric(14,2);v_gain_loss numeric(14,2);v_currency char(3);
begin
 select * into v from public.church_assets where id=p_asset_id for update;
 if not found then raise exception 'Asset not found.'; end if;
 if not private.has_church_permission(v.church_id,'assets','approve') or not private.has_church_permission(v.church_id,'accounts','edit') then raise exception 'You are not allowed to dispose of assets.'; end if;
 if not private.has_church_branch_access(v.church_id,v.branch_id) then raise exception 'You do not have access to this asset branch.'; end if;
 if v.asset_status<>'active' then raise exception 'Only active assets can be disposed.'; end if;
 if p_proceeds<0 or p_disposal_date<coalesce(v.purchase_date,p_disposal_date) then raise exception 'Invalid disposal date or proceeds.'; end if;
 if v.purchase_cost<=0 then raise exception 'Asset purchase cost must be greater than zero before disposal.'; end if;
 select coa.id into v_cash from public.financial_accounts fa join public.chart_of_accounts coa on coa.id=fa.chart_account_id and coa.church_id=fa.church_id where fa.id=p_cash_account_id and fa.church_id=v.church_id and fa.is_active and coa.is_active and coa.account_type='asset';
 select coa.id into v_asset from public.chart_of_accounts coa where coa.id=v.asset_account_id and coa.church_id=v.church_id and coa.account_type='asset' and coa.is_active;
 select coa.id into v_accum from public.chart_of_accounts coa where coa.id=v.accumulated_depreciation_account_id and coa.church_id=v.church_id and coa.account_type='asset' and coa.is_active;
 select currency_code into v_currency from public.churches where id=v.church_id;
 if v_cash is null or v_asset is null or v_accum is null then raise exception 'Configure valid cash, asset and accumulated depreciation accounts.'; end if;
 v_book:=greatest(0,v.purchase_cost-v.accumulated_depreciation);v_gain_loss:=p_proceeds-v_book;
 if v_gain_loss>0 then select id into v_gain from public.chart_of_accounts where id=v.disposal_gain_account_id and church_id=v.church_id and account_type='income' and is_active;
 elsif v_gain_loss<0 then select id into v_loss from public.chart_of_accounts where id=v.disposal_loss_account_id and church_id=v.church_id and account_type='expense' and is_active; end if;
 if v_gain_loss>0 and v_gain is null then raise exception 'Configure an asset disposal gain income account.'; end if;
 if v_gain_loss<0 and v_loss is null then raise exception 'Configure an asset disposal loss expense account.'; end if;
 insert into public.journal_entries(church_id,entry_number,entry_date,description,status,source_type,source_id,created_by)
 values(v.church_id,'ASD-DISP-'||upper(substr(replace(v.id::text,'-',''),1,10)),p_disposal_date,'Asset disposal: '||v.name,'draft','asset_disposal',v.id,auth.uid()) returning id into v_entry;
 if p_proceeds>0 then insert into public.journal_lines(church_id,journal_entry_id,account_id,description,debit,credit,currency_code) values(v.church_id,v_entry,v_cash,'Disposal proceeds',p_proceeds,0,v_currency); end if;
 if v.accumulated_depreciation>0 then insert into public.journal_lines(church_id,journal_entry_id,account_id,description,debit,credit,currency_code) values(v.church_id,v_entry,v_accum,'Remove accumulated depreciation',v.accumulated_depreciation,0,v_currency); end if;
 insert into public.journal_lines(church_id,journal_entry_id,account_id,description,debit,credit,currency_code) values(v.church_id,v_entry,v_asset,'Remove asset cost',0,v.purchase_cost,v_currency);
 if v_gain_loss>0 then insert into public.journal_lines(church_id,journal_entry_id,account_id,description,debit,credit,currency_code) values(v.church_id,v_entry,v_gain,'Gain on disposal',0,v_gain_loss,v_currency);
 elsif v_gain_loss<0 then insert into public.journal_lines(church_id,journal_entry_id,account_id,description,debit,credit,currency_code) values(v.church_id,v_entry,v_loss,'Loss on disposal',abs(v_gain_loss),0,v_currency); end if;
 perform public.post_journal_entry(v_entry);
 perform set_config('app.asset_disposal_rpc','on',true);
 update public.church_assets set asset_status='disposed',disposal_date=p_disposal_date,disposal_proceeds=p_proceeds,disposal_gain_loss=v_gain_loss,disposal_cash_account_id=p_cash_account_id where id=v.id;
 return jsonb_build_object('success',true,'journal_entry_id',v_entry,'book_value',v_book,'gain_loss',v_gain_loss);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.post_asset_depreciation(p_asset_id uuid, p_period_end date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v public.church_assets%rowtype;v_months integer;v_depreciable numeric(14,2);v_expected numeric(14,2);v_amount numeric(14,2);v_asset_account uuid;v_accum_account uuid;v_expense_account uuid;v_entry uuid;v_start date;v_currency char(3);
begin
 select * into v from public.church_assets where id=p_asset_id for update;
 if not found then raise exception 'Asset not found.'; end if;
 if not private.has_church_permission(v.church_id,'assets','approve') or not private.has_church_permission(v.church_id,'accounts','edit') then raise exception 'You are not allowed to post asset depreciation.'; end if;
 if not private.has_church_branch_access(v.church_id,v.branch_id) then raise exception 'You do not have access to this asset branch.'; end if;
 if v.asset_status<>'active' then raise exception 'Only active assets can be depreciated.'; end if;
 if v.depreciation_method<>'straight_line' or coalesce(v.useful_life_months,0)<=0 then raise exception 'Configure straight-line depreciation and useful life first.'; end if;
 if p_period_end<>(date_trunc('month',p_period_end)+interval '1 month - 1 day')::date then raise exception 'Depreciation period must be the last day of a month.'; end if;
 v_start:=coalesce(v.depreciation_start_date,v.purchase_date);
 if v_start is null or p_period_end<v_start then raise exception 'Depreciation period cannot be before the depreciation start date.'; end if;
 if exists(select 1 from public.asset_depreciation_entries where asset_id=v.id and period_end=p_period_end) then raise exception 'Depreciation is already posted for this period.'; end if;
 v_depreciable:=greatest(0,v.purchase_cost-v.salvage_value);
 v_months:=least(v.useful_life_months,greatest(0,((extract(year from p_period_end)-extract(year from v_start))*12+(extract(month from p_period_end)-extract(month from v_start))+1)::integer));
 v_expected:=least(v_depreciable,round(v_depreciable*v_months/v.useful_life_months,2));
 v_amount:=round(v_expected-v.accumulated_depreciation,2);
 if v_amount<=0 then raise exception 'No remaining depreciation is due for this asset.'; end if;
 select coa.id into v_asset_account from public.chart_of_accounts coa where coa.id=v.asset_account_id and coa.church_id=v.church_id and coa.account_type='asset' and coa.is_active;
 select coa.id into v_accum_account from public.chart_of_accounts coa where coa.id=v.accumulated_depreciation_account_id and coa.church_id=v.church_id and coa.account_type='asset' and coa.is_active;
 select coa.id into v_expense_account from public.chart_of_accounts coa where coa.id=v.depreciation_expense_account_id and coa.church_id=v.church_id and coa.account_type='expense' and coa.is_active;
 select currency_code into v_currency from public.churches where id=v.church_id;
 if v_asset_account is null or v_accum_account is null or v_expense_account is null then raise exception 'Configure valid asset, accumulated depreciation and depreciation expense accounts.'; end if;
 insert into public.journal_entries(church_id,entry_number,entry_date,description,status,source_type,source_id,created_by)
 values(v.church_id,'ASD-JE-'||upper(substr(replace(v.id::text,'-',''),1,8))||'-'||to_char(p_period_end,'YYYYMM'),p_period_end,'Asset depreciation: '||v.name,'draft','asset_depreciation',v.id,auth.uid()) returning id into v_entry;
 insert into public.journal_lines(church_id,journal_entry_id,account_id,description,debit,credit,currency_code)
 values(v.church_id,v_entry,v_expense_account,'Depreciation expense - '||v.name,v_amount,0,v_currency),
       (v.church_id,v_entry,v_accum_account,'Accumulated depreciation - '||v.name,0,v_amount,v_currency);
 perform public.post_journal_entry(v_entry);
 insert into public.asset_depreciation_entries(church_id,asset_id,period_end,amount,journal_entry_id,created_by) values(v.church_id,v.id,p_period_end,v_amount,v_entry,auth.uid());
 update public.church_assets set accumulated_depreciation=v_expected where id=v.id;
 return jsonb_build_object('success',true,'journal_entry_id',v_entry,'depreciation_amount',v_amount,'accumulated_depreciation',v_expected);
end;
$function$
;
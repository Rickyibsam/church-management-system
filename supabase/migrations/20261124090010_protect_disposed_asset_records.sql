create or replace function private.guard_disposed_asset()
returns trigger language plpgsql set search_path=''
as $$
begin
 if tg_op='INSERT' then
  if new.asset_status='disposed' and current_setting('app.asset_disposal_rpc',true) is distinct from 'on' then raise exception 'Assets must be disposed through the authorized disposal workflow.'; end if;
  return new;
 end if;
 if tg_op='DELETE' then
  if old.asset_status='disposed' then raise exception 'Disposed assets cannot be deleted.'; end if;
  return old;
 end if;
 if old.asset_status='disposed' then raise exception 'Disposed asset records are locked.'; end if;
 if new.asset_status='disposed' and current_setting('app.asset_disposal_rpc',true) is distinct from 'on' then raise exception 'Use the authorized asset disposal workflow.'; end if;
 return new;
end;
$$;
drop trigger if exists guard_disposed_asset on public.church_assets;
create trigger guard_disposed_asset before insert or update or delete on public.church_assets for each row execute function private.guard_disposed_asset();
alter table public.church_assets add constraint church_assets_salvage_not_over_cost check(salvage_value<=purchase_cost) not valid;
alter table public.church_assets add constraint church_assets_depreciation_not_over_depreciable check(accumulated_depreciation<=purchase_cost-salvage_value) not valid;

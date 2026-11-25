create or replace function private.notify_inventory_low_stock()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  v_item public.inventory_items%rowtype;
  v_balance numeric(14,3);
  v_before numeric(14,3);
  v_branch_name text;
begin
  select * into v_item from public.inventory_items where id=new.item_id and church_id=new.church_id;
  if not found or v_item.reorder_level<=0 then return new; end if;
  select coalesce(sum(quantity_delta),0) into v_balance from public.inventory_transactions
   where church_id=new.church_id and item_id=new.item_id and branch_id=new.branch_id;
  v_before:=v_balance-new.quantity_delta;
  if v_before>v_item.reorder_level and v_balance<=v_item.reorder_level then
    select name into v_branch_name from public.church_branches where id=new.branch_id;
    insert into public.notifications(church_id,user_id,title,body,notification_type)
    select new.church_id,cm.user_id,'Inventory reached reorder level',
      'Inventory for '||v_item.item_name||' at '||coalesce(v_branch_name,'a church branch')||' has reached its configured reorder level.',
      'inventory'
    from public.church_members cm
    where cm.church_id=new.church_id and cm.status='active'
      and cm.role in ('owner','admin','pastor','secretary','staff')
      and (cm.branch_id is null or cm.branch_id=new.branch_id)
      and cm.user_id is distinct from coalesce(new.created_by,auth.uid());
  end if;
  return new;
end;
$$;
revoke all on function private.notify_inventory_low_stock() from public,anon,authenticated;

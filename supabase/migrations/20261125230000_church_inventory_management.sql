create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  branch_id uuid references public.church_branches(id) on delete set null,
  sku text not null,
  item_name text not null,
  category text,
  unit_of_measure text not null default 'each',
  reorder_level numeric(14,3) not null default 0 check (reorder_level >= 0),
  is_active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_items_church_sku_key unique(church_id,sku),
  constraint inventory_items_name_nonempty check (length(btrim(item_name))>0),
  constraint inventory_items_unit_nonempty check (length(btrim(unit_of_measure))>0),
  constraint inventory_items_id_church_key unique(id,church_id)
);

create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  item_id uuid not null,
  branch_id uuid not null references public.church_branches(id),
  transaction_type text not null check (transaction_type in ('receipt','issue','adjustment')),
  quantity_delta numeric(14,3) not null check (quantity_delta<>0),
  transaction_date date not null default current_date,
  reference_number text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint inventory_transactions_item_church_fkey
    foreign key(item_id,church_id) references public.inventory_items(id,church_id) on delete restrict,
  constraint inventory_transactions_type_sign_check check (
    (transaction_type='receipt' and quantity_delta>0)
    or (transaction_type='issue' and quantity_delta<0)
    or transaction_type='adjustment'
  )
);

create index if not exists inventory_items_church_branch_idx on public.inventory_items(church_id,branch_id);
create index if not exists inventory_transactions_church_item_branch_date_idx on public.inventory_transactions(church_id,item_id,branch_id,transaction_date desc);
create index if not exists inventory_transactions_branch_date_idx on public.inventory_transactions(church_id,branch_id,transaction_date desc);

alter table public.inventory_items enable row level security;
alter table public.inventory_transactions enable row level security;

drop policy if exists inventory_items_branch_scope on public.inventory_items;
create policy inventory_items_branch_scope on public.inventory_items as restrictive for all to authenticated
using (private.has_church_branch_access(church_id,branch_id))
with check (private.has_church_branch_access(church_id,branch_id));

drop policy if exists inventory_items_permission_select on public.inventory_items;
create policy inventory_items_permission_select on public.inventory_items for select to authenticated
using (private.has_church_permission(church_id,'inventory','view'));
drop policy if exists inventory_items_permission_insert on public.inventory_items;
create policy inventory_items_permission_insert on public.inventory_items for insert to authenticated
with check (private.has_church_permission(church_id,'inventory','create'));
drop policy if exists inventory_items_permission_update on public.inventory_items;
create policy inventory_items_permission_update on public.inventory_items for update to authenticated
using (private.has_church_permission(church_id,'inventory','edit'))
with check (private.has_church_permission(church_id,'inventory','edit'));
drop policy if exists inventory_items_permission_delete on public.inventory_items;
create policy inventory_items_permission_delete on public.inventory_items for delete to authenticated
using (private.has_church_permission(church_id,'inventory','delete'));

drop policy if exists inventory_transactions_branch_scope on public.inventory_transactions;
create policy inventory_transactions_branch_scope on public.inventory_transactions as restrictive for all to authenticated
using (private.has_church_branch_access(church_id,branch_id))
with check (private.has_church_branch_access(church_id,branch_id));
drop policy if exists inventory_transactions_permission_select on public.inventory_transactions;
create policy inventory_transactions_permission_select on public.inventory_transactions for select to authenticated
using (private.has_church_permission(church_id,'inventory','view'));
drop policy if exists inventory_transactions_permission_insert on public.inventory_transactions;
create policy inventory_transactions_permission_insert on public.inventory_transactions for insert to authenticated
with check (private.has_church_permission(church_id,'inventory','create'));

create or replace function private.validate_inventory_transaction()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  v_item public.inventory_items%rowtype;
  v_balance numeric(14,3);
begin
  select * into v_item from public.inventory_items
   where id=new.item_id and church_id=new.church_id for update;
  if not found or not v_item.is_active then
    raise exception 'Select an active inventory item from this church.';
  end if;
  if v_item.branch_id is not null and v_item.branch_id<>new.branch_id then
    raise exception 'This inventory item is restricted to a different branch.';
  end if;
  if not exists(select 1 from public.church_branches b where b.id=new.branch_id and b.church_id=new.church_id) then
    raise exception 'Select a branch belonging to this church.';
  end if;
  select coalesce(sum(t.quantity_delta),0) into v_balance
    from public.inventory_transactions t
   where t.church_id=new.church_id and t.item_id=new.item_id and t.branch_id=new.branch_id;
  if v_balance+new.quantity_delta<0 then
    raise exception 'This transaction would reduce inventory below zero.';
  end if;
  if new.created_by is null then new.created_by:=auth.uid(); end if;
  return new;
end;
$$;

drop trigger if exists validate_inventory_transaction on public.inventory_transactions;
create trigger validate_inventory_transaction before insert on public.inventory_transactions
for each row execute function private.validate_inventory_transaction();

create or replace function private.prevent_inventory_transaction_mutation()
returns trigger language plpgsql set search_path=''
as $$
begin
  raise exception 'Inventory transactions are immutable. Enter a correcting adjustment instead.';
end;
$$;
drop trigger if exists prevent_inventory_transaction_mutation on public.inventory_transactions;
create trigger prevent_inventory_transaction_mutation before update or delete on public.inventory_transactions
for each row execute function private.prevent_inventory_transaction_mutation();

create or replace view public.inventory_stock_summary
with (security_invoker=true)
as
select i.church_id,i.id as item_id,i.sku,i.item_name,i.category,i.unit_of_measure,
       b.id as branch_id,b.name as branch_name,i.reorder_level,
       coalesce(sum(t.quantity_delta),0)::numeric(14,3) as quantity_on_hand,
       (coalesce(sum(t.quantity_delta),0)<=i.reorder_level and i.reorder_level>0) as is_low_stock
from public.inventory_items i
join public.church_branches b on b.church_id=i.church_id and (i.branch_id is null or i.branch_id=b.id)
left join public.inventory_transactions t on t.church_id=i.church_id and t.item_id=i.id and t.branch_id=b.id
group by i.church_id,i.id,i.sku,i.item_name,i.category,i.unit_of_measure,b.id,b.name,i.reorder_level;

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
      and cm.user_id is distinct from coalesce(new.created_by,auth.uid());
  end if;
  return new;
end;
$$;
drop trigger if exists notify_inventory_low_stock on public.inventory_transactions;
create trigger notify_inventory_low_stock after insert on public.inventory_transactions
for each row execute function private.notify_inventory_low_stock();

revoke all on function private.validate_inventory_transaction() from public,anon,authenticated;
revoke all on function private.prevent_inventory_transaction_mutation() from public,anon,authenticated;
revoke all on function private.notify_inventory_low_stock() from public,anon,authenticated;

create or replace function private.has_church_permission(p_church_id uuid,p_module_key text,p_action_key text)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(
  select 1 from public.church_members cm
  where cm.church_id=p_church_id and cm.user_id=auth.uid() and cm.status='active'
  and (
    cm.role in ('owner','admin')
    or coalesce(
      (select cmp.allowed from public.church_member_permissions cmp
        where cmp.church_member_id=cm.id and cmp.module_key=p_module_key and cmp.action_key=p_action_key limit 1),
      case
        when p_module_key in ('members','families','family_relationships','member_documents') then
          (p_action_key in ('view','create','edit') and cm.role in ('pastor','secretary','staff'))
          or (p_action_key='delete' and cm.role='pastor')
        when p_module_key in ('certificates','certificate_documents') then
          (p_action_key in ('view','create','edit') and cm.role in ('pastor','secretary'))
          or (p_action_key in ('approve','issue','delete') and cm.role='pastor')
        when p_module_key in ('attendance','services','events','ministries') then
          (p_action_key in ('view','create','edit') and cm.role in ('pastor','secretary','ministry_leader','staff','volunteer'))
          or (p_action_key in ('delete','approve') and cm.role in ('pastor','secretary'))
        when p_module_key in ('finance','donations','expenses','accounts','budgets') then
          (p_action_key in ('view','create','edit','approve') and cm.role in ('accountant','finance'))
        when p_module_key in ('assets','inventory') then
          (p_action_key in ('view','create','edit') and cm.role in ('staff','accountant','finance','secretary'))
          or (p_action_key in ('delete','approve') and cm.role in ('accountant','finance','pastor'))
        when p_module_key='pastoral' then
          (p_action_key in ('view','create','edit') and cm.role='pastor')
        else false
      end
    )
  )
 );
$$;
revoke all on function private.has_church_permission(uuid,text,text) from public,anon;
grant execute on function private.has_church_permission(uuid,text,text) to authenticated;

grant select,insert,update,delete on public.inventory_items to authenticated;
grant select,insert on public.inventory_transactions to authenticated;
grant select on public.inventory_stock_summary to authenticated;

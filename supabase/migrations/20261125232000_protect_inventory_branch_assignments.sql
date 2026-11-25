alter table public.inventory_items
  drop constraint if exists inventory_items_branch_id_fkey;
alter table public.inventory_items
  add constraint inventory_items_branch_id_fkey
  foreign key(branch_id) references public.church_branches(id) on delete restrict;

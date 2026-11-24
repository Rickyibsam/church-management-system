create or replace function private.enforce_assigned_church_user_integrity()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if tg_table_name='pastoral_requests' then
  if new.assigned_pastor_user_id is not null and not exists(select 1 from public.church_members cm where cm.church_id=new.church_id and cm.user_id=new.assigned_pastor_user_id and cm.status='active') then raise exception 'Assigned pastor must be an active member of this church.'; end if;
 elsif tg_table_name='pastoral_followups' then
  if new.assigned_to is not null and not exists(select 1 from public.church_members cm where cm.church_id=new.church_id and cm.user_id=new.assigned_to and cm.status='active') then raise exception 'Assigned user must be an active member of this church.'; end if;
 elsif tg_table_name='church_members' then
  if new.branch_id is not null and not exists(select 1 from public.church_branches b where b.id=new.branch_id and b.church_id=new.church_id) then raise exception 'Member branch must belong to the same church.'; end if;
 elsif tg_table_name='notifications' then
  if not exists(select 1 from public.church_members cm where cm.church_id=new.church_id and cm.user_id=new.user_id) then raise exception 'Notification user must belong to the same church.'; end if;
 end if;
 return new;
end;
$$;
do $$ declare t text; begin
 foreach t in array array['pastoral_requests','pastoral_followups','church_members','notifications'] loop
  execute format('drop trigger if exists enforce_assigned_church_user_integrity on public.%I',t);
  execute format('create trigger enforce_assigned_church_user_integrity before insert or update on public.%I for each row execute function private.enforce_assigned_church_user_integrity()',t);
 end loop;
end $$;

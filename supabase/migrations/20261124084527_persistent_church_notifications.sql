create or replace function private.notify_certificate_status_change()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if new.status is distinct from old.status then
  insert into public.notifications(church_id,user_id,title,body,notification_type)
  select new.church_id,cm.user_id,'Certificate status updated','Certificate '||new.registration_number||' changed to '||replace(new.status,'_',' ')||'.','certificate'
  from public.church_members cm where cm.church_id=new.church_id and cm.status='active' and cm.role in ('owner','admin','pastor','secretary') and cm.user_id is distinct from auth.uid();
 end if;
 return new;
end;
$$;
drop trigger if exists notify_certificate_status_change on public.certificates;
create trigger notify_certificate_status_change after update of status on public.certificates for each row execute function private.notify_certificate_status_change();
create or replace function private.activate_church_memberships_after_email_confirmation()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_membership record;
begin
 if new.email_confirmed_at is not null and old.email_confirmed_at is null then
  for v_membership in update public.church_members set status='active' where user_id=new.id and status='invited' returning church_id
  loop
   insert into public.notifications(church_id,user_id,title,body,notification_type) values(v_membership.church_id,new.id,'Church invitation accepted','Your church workspace access is now active.','membership');
  end loop;
 end if;
 return new;
end;
$$;
drop trigger if exists activate_church_memberships_after_email_confirmation on auth.users;
create trigger activate_church_memberships_after_email_confirmation after update of email_confirmed_at on auth.users for each row execute function private.activate_church_memberships_after_email_confirmation();
create index if not exists notifications_user_created_idx on public.notifications(user_id,created_at desc);

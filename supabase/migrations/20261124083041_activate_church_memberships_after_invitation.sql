create or replace function private.activate_church_memberships_after_email_confirmation()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if new.email_confirmed_at is not null and old.email_confirmed_at is null then
  update public.church_members set status='active' where user_id=new.id and status='invited';
 end if;
 return new;
end;
$$;
drop trigger if exists activate_church_memberships_after_email_confirmation on auth.users;
create trigger activate_church_memberships_after_email_confirmation after update of email_confirmed_at on auth.users for each row execute function private.activate_church_memberships_after_email_confirmation();

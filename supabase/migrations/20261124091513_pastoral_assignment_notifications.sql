create or replace function private.notify_pastoral_case_assignment()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if new.assigned_pastor_user_id is not null and (tg_op='INSERT' or new.assigned_pastor_user_id is distinct from old.assigned_pastor_user_id or new.status is distinct from old.status) then
  insert into public.notifications(church_id,user_id,title,body,notification_type) values(new.church_id,new.assigned_pastor_user_id,'Pastoral care case assigned or updated','A confidential pastoral care case requires your attention.','pastoral');
 end if;
 return new;
end;
$$;
drop trigger if exists notify_pastoral_case_assignment on public.pastoral_requests;
create trigger notify_pastoral_case_assignment after insert or update of assigned_pastor_user_id,status on public.pastoral_requests for each row execute function private.notify_pastoral_case_assignment();
create or replace function private.notify_pastoral_followup_assignment()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if new.assigned_to is not null and (tg_op='INSERT' or new.assigned_to is distinct from old.assigned_to) then
  insert into public.notifications(church_id,user_id,title,body,notification_type) values(new.church_id,new.assigned_to,'Pastoral follow-up assigned','A confidential pastoral follow-up has been assigned to you.','pastoral');
 end if;
 return new;
end;
$$;
drop trigger if exists notify_pastoral_followup_assignment on public.pastoral_followups;
create trigger notify_pastoral_followup_assignment after insert or update of assigned_to on public.pastoral_followups for each row execute function private.notify_pastoral_followup_assignment();

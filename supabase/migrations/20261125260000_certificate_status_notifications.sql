create or replace function private.notify_certificate_status_change()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  v_title text;
  v_body text;
begin
  if old.status is not distinct from new.status then return new; end if;
  if new.status not in ('submitted','under_review','approved','issued','rejected','cancelled') then return new; end if;

  v_title:=case new.status
    when 'submitted' then 'Certificate application submitted'
    when 'under_review' then 'Certificate application under review'
    when 'approved' then 'Certificate application approved'
    when 'issued' then 'Certificate issued'
    when 'rejected' then 'Certificate application requires correction'
    else 'Certificate application cancelled'
  end;
  v_body:=case new.status
    when 'submitted' then 'A certificate application has been submitted and is awaiting review.'
    when 'under_review' then 'A certificate application has moved into review.'
    when 'approved' then 'A certificate application has been approved.'
    when 'issued' then 'A certificate has been issued and is ready for collection or delivery.'
    when 'rejected' then 'A certificate application was returned for correction. Check the application record for reviewer instructions.'
    else 'A certificate application has been cancelled.'
  end;

  insert into public.notifications(church_id,user_id,title,body,notification_type)
  select new.church_id,cm.user_id,v_title,v_body,'certificates'
    from public.church_members cm
   where cm.church_id=new.church_id
     and cm.status='active'
     and cm.role in ('owner','admin','pastor','secretary')
     and (cm.branch_id is null or new.branch_id is null or cm.branch_id=new.branch_id)
     and cm.user_id is distinct from auth.uid()
     and cm.user_id is distinct from new.applicant_user_id;

  if new.applicant_user_id is not null and new.applicant_user_id is distinct from auth.uid()
     and exists(select 1 from public.church_members cm where cm.church_id=new.church_id and cm.user_id=new.applicant_user_id and cm.status='active') then
    insert into public.notifications(church_id,user_id,title,body,notification_type)
    values(new.church_id,new.applicant_user_id,v_title,v_body,'certificates');
  end if;
  return new;
end;
$$;

drop trigger if exists notify_certificate_status_change on public.certificates;
create trigger notify_certificate_status_change
after update of status on public.certificates
for each row execute function private.notify_certificate_status_change();

revoke all on function private.notify_certificate_status_change() from public,anon,authenticated;

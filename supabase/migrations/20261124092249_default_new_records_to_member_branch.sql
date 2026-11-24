create or replace function private.set_default_church_branch()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_member_branch uuid;
begin
 if new.branch_id is null then
  select cm.branch_id into v_member_branch from public.church_members cm where cm.church_id=new.church_id and cm.user_id=auth.uid() and cm.status='active' limit 1;
  if v_member_branch is null then select b.id into v_member_branch from public.church_branches b where b.church_id=new.church_id and b.is_head_office=true limit 1; end if;
  new.branch_id:=v_member_branch;
 end if;
 return new;
end;
$$;
do $$ declare t text;begin
 foreach t in array array['members','families','certificates','church_services','church_events','ministries','donations','expenses','church_assets'] loop
  execute format('drop trigger if exists set_default_church_branch on public.%I',t);
  execute format('create trigger set_default_church_branch before insert on public.%I for each row execute function private.set_default_church_branch()',t);
 end loop;
end $$;
do $$ declare t text;begin
 foreach t in array array['members','families','certificates','church_services','church_events','ministries','donations','expenses','church_assets'] loop
  execute format('update public.%I x set branch_id=b.id from public.church_branches b where x.church_id=b.church_id and b.is_head_office=true and x.branch_id is null',t);
 end loop;
end $$;

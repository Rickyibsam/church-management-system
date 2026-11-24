create unique index if not exists ministry_members_unique_member on public.ministry_members(ministry_id,member_id);
create or replace function private.enforce_ministry_member_tenant()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if not private.reference_belongs_to_church('public.ministries'::regclass,new.ministry_id,new.church_id) or not private.reference_belongs_to_church('public.members'::regclass,new.member_id,new.church_id) then raise exception 'Ministry and member must belong to the same church workspace.'; end if;
 return new;
end;
$$;
drop trigger if exists enforce_ministry_member_tenant on public.ministry_members;
create trigger enforce_ministry_member_tenant before insert or update on public.ministry_members for each row execute function private.enforce_ministry_member_tenant();

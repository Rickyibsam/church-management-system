create or replace function private.validate_family_relationship_tenant()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_family_church uuid;v_member_church uuid;
begin
 select church_id into v_family_church from public.families where id=new.family_id;
 select church_id into v_member_church from public.members where id=new.member_id;
 if v_family_church is distinct from new.church_id or v_member_church is distinct from new.church_id then raise exception 'Family and member must belong to the same church workspace.'; end if;
 return new;
end;
$$;
drop trigger if exists validate_family_relationship_tenant on public.family_relationships;
create trigger validate_family_relationship_tenant before insert or update on public.family_relationships for each row execute function private.validate_family_relationship_tenant();

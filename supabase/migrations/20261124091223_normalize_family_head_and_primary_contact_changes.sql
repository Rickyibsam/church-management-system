create or replace function private.normalize_family_relationship()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if new.relationship='head' then update public.family_relationships set relationship='member' where family_id=new.family_id and relationship='head' and id<>new.id; end if;
 if new.is_primary_contact then update public.family_relationships set is_primary_contact=false where family_id=new.family_id and is_primary_contact and id<>new.id; end if;
 return new;
end;
$$;
drop trigger if exists normalize_family_relationship on public.family_relationships;
create trigger normalize_family_relationship before insert or update on public.family_relationships for each row execute function private.normalize_family_relationship();
create or replace function private.sync_family_head_from_relationship()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if tg_op='UPDATE' and old.relationship='head' and (new.relationship<>'head' or new.family_id<>old.family_id or new.member_id<>old.member_id) then update public.families set family_head_member_id=null where id=old.family_id and church_id=old.church_id and family_head_member_id=old.member_id; end if;
 if new.relationship='head' then update public.families set family_head_member_id=new.member_id where id=new.family_id and church_id=new.church_id; end if;
 return new;
end;
$$;
drop trigger if exists sync_family_head_from_relationship on public.family_relationships;
create trigger sync_family_head_from_relationship after insert or update on public.family_relationships for each row execute function private.sync_family_head_from_relationship();
create or replace function private.clear_family_head_after_relationship_delete()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if old.relationship='head' then update public.families set family_head_member_id=null where id=old.family_id and church_id=old.church_id and family_head_member_id=old.member_id; end if;
 return old;
end;
$$;
drop trigger if exists clear_family_head_after_relationship_delete on public.family_relationships;
create trigger clear_family_head_after_relationship_delete after delete on public.family_relationships for each row execute function private.clear_family_head_after_relationship_delete();

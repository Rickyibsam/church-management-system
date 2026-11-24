create unique index if not exists family_relationships_one_head_per_family on public.family_relationships(family_id) where relationship='head';
create unique index if not exists family_relationships_one_primary_contact on public.family_relationships(family_id) where is_primary_contact;
create or replace function private.sync_family_head_from_relationship()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if new.relationship='head' then update public.families set family_head_member_id=new.member_id where id=new.family_id and church_id=new.church_id; end if;
 return new;
end;
$$;
drop trigger if exists sync_family_head_from_relationship on public.family_relationships;
create trigger sync_family_head_from_relationship after insert or update of relationship,member_id,family_id on public.family_relationships for each row execute function private.sync_family_head_from_relationship();

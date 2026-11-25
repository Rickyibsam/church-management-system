-- Generate immutable, church-scoped family registration codes.
create or replace function private.assign_family_registration_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next bigint;
begin
  if tg_op = 'UPDATE' then
    if new.family_number is distinct from old.family_number then
      raise exception 'Family registration codes are system-generated and cannot be changed.';
    end if;
    return new;
  end if;

  if new.family_number is null or btrim(new.family_number) = '' then
    perform pg_advisory_xact_lock(hashtextextended(new.church_id::text, 0));
    select coalesce(max(substring(f.family_number from '^FAM-([0-9]+)$')::bigint), 0) + 1
      into v_next
      from public.families f
     where f.church_id = new.church_id
       and f.family_number ~ '^FAM-[0-9]+$';
    new.family_number := 'FAM-' || lpad(v_next::text, 6, '0');
  end if;
  return new;
end;
$$;

do $$
declare
  v_church record;
  v_next bigint;
  v_family record;
begin
  for v_church in select distinct church_id from public.families loop
    perform pg_advisory_xact_lock(hashtextextended(v_church.church_id::text, 0));
    select coalesce(max(substring(f.family_number from '^FAM-([0-9]+)$')::bigint), 0) + 1
      into v_next
      from public.families f
     where f.church_id = v_church.church_id
       and f.family_number ~ '^FAM-[0-9]+$';
    for v_family in
      select id from public.families
       where church_id = v_church.church_id
         and (family_number is null or btrim(family_number) = '')
       order by created_at, id
    loop
      update public.families
         set family_number = 'FAM-' || lpad(v_next::text, 6, '0')
       where id = v_family.id;
      v_next := v_next + 1;
    end loop;
  end loop;
end;
$$;

drop trigger if exists assign_family_registration_code on public.families;
create trigger assign_family_registration_code
before insert or update of family_number on public.families
for each row execute function private.assign_family_registration_code();

revoke all on function private.assign_family_registration_code() from public, anon, authenticated;

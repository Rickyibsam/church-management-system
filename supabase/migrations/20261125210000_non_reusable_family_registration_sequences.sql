create table if not exists private.family_registration_sequences (
  church_id uuid primary key references public.churches(id) on delete cascade,
  last_value bigint not null default 0 check (last_value >= 0)
);

insert into private.family_registration_sequences(church_id,last_value)
select f.church_id,
       coalesce(max(substring(f.family_number from '^FAM-([0-9]+)$')::bigint),0)
  from public.families f
 group by f.church_id
on conflict(church_id) do update
set last_value=greatest(private.family_registration_sequences.last_value,excluded.last_value);

create or replace function private.assign_family_registration_code()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_next bigint;
begin
  if tg_op='UPDATE' then
    if new.family_number is distinct from old.family_number then
      raise exception 'Family registration codes are system-generated and cannot be changed.';
    end if;
    return new;
  end if;

  insert into private.family_registration_sequences(church_id,last_value)
  values(new.church_id,1)
  on conflict(church_id) do update
    set last_value=private.family_registration_sequences.last_value+1
  returning last_value into v_next;

  new.family_number:='FAM-'||lpad(v_next::text,6,'0');
  return new;
end;
$$;

revoke all on function private.assign_family_registration_code() from public,anon,authenticated;

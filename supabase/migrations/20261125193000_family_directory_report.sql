create or replace view public.family_directory_report
with (security_invoker = true)
as
select
  f.church_id,
  f.id as family_id,
  f.family_number as family_code,
  f.family_name,
  f.phone,
  f.address,
  count(fr.id)::bigint as linked_member_count,
  count(fr.id) filter (where fr.relationship in ('child','son','daughter'))::bigint as child_count,
  max(concat_ws(' ',m.first_name,m.middle_name,m.last_name))
    filter (where fr.is_primary_contact) as primary_contact_name
from public.families f
left join public.family_relationships fr
  on fr.church_id=f.church_id and fr.family_id=f.id
left join public.members m
  on m.church_id=fr.church_id and m.id=fr.member_id
group by f.church_id,f.id,f.family_number,f.family_name,f.phone,f.address;

grant select on public.family_directory_report to authenticated;

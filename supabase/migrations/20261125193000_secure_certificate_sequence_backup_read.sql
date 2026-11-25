grant select on table public.certificate_sequences to authenticated;
drop policy if exists certificate_sequences_owner_admin_read on public.certificate_sequences;
create policy certificate_sequences_owner_admin_read
on public.certificate_sequences
for select
to authenticated
using (private.has_church_role(church_id,array['owner','admin']::text[]));

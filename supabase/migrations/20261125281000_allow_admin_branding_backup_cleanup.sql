drop policy if exists church_branding_admin_delete on storage.objects;
create policy church_branding_admin_delete
on storage.objects for delete to authenticated
using (
  bucket_id='church-branding'
  and exists(
    select 1 from public.church_members cm
    where cm.church_id::text=(storage.foldername(name))[1]
      and cm.user_id=auth.uid()
      and cm.status='active'
      and cm.role in ('owner','admin')
  )
);

alter table public.church_members drop constraint if exists church_members_user_profile_fkey;
alter table public.church_members add constraint church_members_user_profile_fkey foreign key(user_id) references public.profiles(id) on delete cascade;
create policy profiles_select_church_admin on public.profiles for select to authenticated using(exists(select 1 from public.church_members cm where cm.user_id=profiles.id and private.has_church_role(cm.church_id,array['owner','admin'])));

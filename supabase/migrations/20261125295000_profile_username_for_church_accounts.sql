alter table public.profiles add column if not exists username text;
create or replace function private.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name,username)
 values(new.id,nullif(trim(new.raw_user_meta_data->>'display_name'),''),nullif(trim(new.raw_user_meta_data->>'username'),''))
 on conflict(id) do update set
  display_name=coalesce(public.profiles.display_name,excluded.display_name),
  username=coalesce(public.profiles.username,excluded.username);
 return new;
end;
$$;
revoke all on function private.handle_new_auth_user() from public,anon,authenticated;
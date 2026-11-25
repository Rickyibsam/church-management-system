create sequence if not exists public.church_code_seq start 1 increment 1;
alter table public.churches add column if not exists church_code text;
create or replace function private.assign_church_code()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.church_code is null or btrim(new.church_code) = '' then
    new.church_code := 'CH-' || lpad(nextval('public.church_code_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;
revoke all on function private.assign_church_code() from public, anon, authenticated;
drop trigger if exists churches_assign_church_code on public.churches;
create trigger churches_assign_church_code before insert on public.churches
for each row execute function private.assign_church_code();
update public.churches set church_code = 'CH-' || lpad(nextval('public.church_code_seq')::text, 6, '0') where church_code is null;
create unique index if not exists churches_church_code_unique on public.churches(church_code);
alter table public.churches alter column church_code set not null;
create table if not exists public.church_login_accounts (
 id uuid primary key default gen_random_uuid(),
 church_id uuid not null references public.churches(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 username text not null,
 username_normalized text generated always as (lower(btrim(username))) stored,
 auth_email text not null unique,
 branch_id uuid references public.church_branches(id) on delete set null,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 created_by uuid references auth.users(id) on delete set null,
 constraint church_login_username_format check (username ~ '^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$'),
 constraint church_login_username_unique unique(church_id, username_normalized),
 constraint church_login_user_unique unique(church_id, user_id)
);
create index if not exists church_login_accounts_username_idx on public.church_login_accounts(username_normalized);
alter table public.church_login_accounts enable row level security;
revoke all on public.church_login_accounts from public, anon, authenticated;
grant all on public.church_login_accounts to service_role;
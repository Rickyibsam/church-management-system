create table if not exists public.platform_support_accounts (
  singleton boolean primary key default true check (singleton = true),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null unique,
  auth_email text not null unique,
  created_at timestamptz not null default now()
);
alter table public.platform_support_accounts enable row level security;
revoke all on table public.platform_support_accounts from anon, authenticated;
grant all on table public.platform_support_accounts to service_role;

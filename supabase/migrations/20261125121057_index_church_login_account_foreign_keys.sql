create index if not exists church_login_accounts_branch_id_idx on public.church_login_accounts(branch_id);
create index if not exists church_login_accounts_created_by_idx on public.church_login_accounts(created_by);
create index if not exists church_login_accounts_user_id_idx on public.church_login_accounts(user_id);

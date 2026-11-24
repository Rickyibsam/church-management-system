drop trigger if exists guard_posted_donation on public.donations;
create trigger guard_posted_donation before insert or update or delete on public.donations for each row execute function private.guard_posted_financial_source();
drop trigger if exists guard_posted_expense on public.expenses;
create trigger guard_posted_expense before insert or update or delete on public.expenses for each row execute function private.guard_posted_financial_source();

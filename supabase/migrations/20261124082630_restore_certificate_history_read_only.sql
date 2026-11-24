do $$ declare pol record; begin
 if to_regclass('public.certificate_history') is not null then
  for pol in select policyname from pg_policies where schemaname='public' and tablename='certificate_history' loop
   execute format('drop policy %I on public.certificate_history',pol.policyname);
  end loop;
  create policy certificate_history_permission_select on public.certificate_history for select to authenticated using (private.has_church_permission(church_id,'certificates','view'));
 end if;
end $$;

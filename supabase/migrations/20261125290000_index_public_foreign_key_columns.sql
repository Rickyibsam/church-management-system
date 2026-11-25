do $$
declare
  r record;
  v_index_name text;
begin
  for r in
    select c.conrelid,
           c.conname,
           string_agg(format('%I',a.attname),', ' order by k.ord) as column_list,
           string_agg(a.attname,'_' order by k.ord) as column_name_part,
           c.conrelid::regclass::text as table_name
      from pg_constraint c
      join pg_namespace n on n.oid=c.connamespace
      cross join lateral unnest(c.conkey) with ordinality as k(attnum,ord)
      join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum
     where c.contype='f' and n.nspname='public'
     group by c.conrelid,c.conname
  loop
    v_index_name:=left('idx_fk_'||replace(r.table_name,'.','_')||'_'||r.conname,54)||'_'||substr(md5(r.conname||r.table_name),1,8);
    execute format('create index if not exists %I on %s (%s)',v_index_name,r.conrelid::regclass,r.column_list);
  end loop;
end;
$$;

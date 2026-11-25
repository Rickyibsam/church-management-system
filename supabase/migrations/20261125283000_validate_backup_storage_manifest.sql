do $$
declare
  v_definition text;
  v_anchor text:='  if v_total>100000 then raise exception ''Backup exceeds the 100,000-record transactional restore limit.''; end if;';
  v_add text := $add$
  if coalesce(jsonb_typeof(p_snapshot->'storage_manifest'),'')<>'array' then
    raise exception 'Backup storage manifest is missing or invalid.';
  end if;
  if coalesce((p_snapshot->>'storage_file_count')::bigint,-1)<>jsonb_array_length(p_snapshot->'storage_manifest') then
    raise exception 'Backup storage file count does not match its manifest.';
  end if;
  if coalesce((p_snapshot->>'storage_total_bytes')::bigint,-1)<>
     coalesce((select sum((m.value->>'size')::bigint) from jsonb_array_elements(p_snapshot->'storage_manifest') m(value)),0) then
    raise exception 'Backup storage byte count does not match its manifest.';
  end if;
  if exists(
    select 1 from jsonb_array_elements(p_snapshot->'storage_manifest') m(value)
    where m.value->>'bucket' not in ('church-private-documents','church-branding')
       or left(m.value->>'path',length(p_target_church_id::text)+1)<>p_target_church_id::text||'/'
       or coalesce((m.value->>'size')::bigint,-1)<0
       or (m.value->>'bucket'='church-branding' and (m.value->>'size')::bigint>5242880)
       or (m.value->>'bucket'='church-private-documents' and (m.value->>'size')::bigint>10485760)
  ) then raise exception 'Backup storage manifest contains an invalid bucket, path or file size.'; end if;
  if (select count(distinct (m.value->>'bucket')||'|'||(m.value->>'path')) from jsonb_array_elements(p_snapshot->'storage_manifest') m(value))<>jsonb_array_length(p_snapshot->'storage_manifest') then
    raise exception 'Backup storage manifest contains duplicate paths.';
  end if;
  select count(*),coalesce(sum((o.metadata->>'size')::bigint),0)
    into v_storage_count,v_storage_bytes
    from storage.objects o
   where o.bucket_id in ('church-private-documents','church-branding')
     and (storage.foldername(o.name))[1]=p_target_church_id::text;
  if v_storage_count<>coalesce((p_snapshot->>'storage_file_count')::bigint,-1)
     or v_storage_bytes<>coalesce((p_snapshot->>'storage_total_bytes')::bigint,-1) then
    raise exception 'Target storage files do not match the backup manifest. No database records were restored.';
  end if;
  if exists(
    select 1 from jsonb_array_elements(p_snapshot->'storage_manifest') m(value)
    where not exists(
      select 1 from storage.objects o
       where o.bucket_id=m.value->>'bucket'
         and o.name=m.value->>'path'
         and coalesce((o.metadata->>'size')::bigint,-1)=(m.value->>'size')::bigint
    )
  ) then raise exception 'One or more backup storage files are missing or have a different size.'; end if;
$add$;
begin
  select pg_get_functiondef('private.restore_church_backup_impl(uuid,jsonb)'::regprocedure) into v_definition;
  if position('p_snapshot->>''version''<>''4''' in v_definition)=0 then
    raise exception 'Expected version 4 restore function was not found.';
  end if;
  if position(v_anchor in v_definition)=0 then raise exception 'Restore validation insertion point not found.'; end if;
  v_definition:=replace(v_definition,'p_snapshot->>''version''<>''4''','p_snapshot->>''version''<>''5''');
  v_definition:=replace(v_definition,'Select a version 4 church backup.','Select a version 5 church backup.');
  v_definition:=replace(v_definition,'  v_logo_path text;','  v_logo_path text;'||E'\n  v_storage_count bigint;\n  v_storage_bytes bigint;');
  v_definition:=replace(v_definition,v_anchor,v_anchor||v_add);
  execute v_definition;
end;
$$;

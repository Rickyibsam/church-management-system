do $migration$
declare
  v_definition text;
  v_old text := 'or left(m.value->>''path'',length(p_target_church_id::text)+1)<>p_target_church_id::text||''/''';
  v_new text := 'or not private.validate_church_backup_storage_path(m.value->>''path'',p_target_church_id::text)';
begin
  select pg_get_functiondef('private.restore_church_backup_impl(uuid,jsonb)'::regprocedure)
    into v_definition;
  if position(v_new in v_definition)>0 then
    return;
  end if;
  if position(v_old in v_definition)=0 then
    raise exception 'Could not safely locate the backup storage path validation clause.';
  end if;
  v_definition:=replace(v_definition,v_old,v_new);
  execute v_definition;
end;
$migration$;

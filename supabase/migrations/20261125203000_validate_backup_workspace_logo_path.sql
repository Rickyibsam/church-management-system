do $migration$
declare
  v_definition text;
  v_old text := 'v_logo_path:=v_workspace->>''logo_path'';';
  v_new text := 'v_logo_path:=nullif(v_workspace->>''logo_path'','''');';
  v_old_block text := 'if v_logo_path is not null and left(v_logo_path,length(v_source_church_id::text)+1)=v_source_church_id::text||''/'' then' || chr(10) ||
    '    v_logo_path:=p_target_church_id::text||substr(v_logo_path,length(v_source_church_id::text)+1);' || chr(10) ||
    '  end if;';
  v_new_block text := 'if v_logo_path is not null then' || chr(10) ||
    '    if not private.validate_church_backup_storage_path(v_logo_path,v_source_church_id::text) then' || chr(10) ||
    '      raise exception ''Backup workspace logo path is outside the source church folder.'';' || chr(10) ||
    '    end if;' || chr(10) ||
    '    v_logo_path:=p_target_church_id::text||substr(v_logo_path,length(v_source_church_id::text)+1);' || chr(10) ||
    '  end if;';
begin
  select pg_get_functiondef('private.restore_church_backup_impl(uuid,jsonb)'::regprocedure)
    into v_definition;
  if position('Backup workspace logo path is outside the source church folder.' in v_definition)>0 then
    return;
  end if;
  if position(v_old in v_definition)=0 or position(v_old_block in v_definition)=0 then
    raise exception 'Could not safely locate workspace logo path remapping code.';
  end if;
  v_definition:=replace(v_definition,v_old,v_new);
  v_definition:=replace(v_definition,v_old_block,v_new_block);
  execute v_definition;
end;
$migration$;

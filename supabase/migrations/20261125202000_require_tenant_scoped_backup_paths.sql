create or replace function private.remap_church_backup_row(
  p_row jsonb,
  p_source_church text,
  p_target_church text
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $function$
declare
  v_pair record;
  v_path text;
begin
  if p_row ? 'church_id' then
    if p_row->>'church_id' is distinct from p_source_church then
      raise exception 'Backup row belongs to a different church workspace.';
    end if;
    p_row := jsonb_set(p_row, '{church_id}', to_jsonb(p_target_church), true);
  end if;

  for v_pair in select key, value from jsonb_each(p_row) loop
    if v_pair.key ilike '%path%' and jsonb_typeof(v_pair.value) = 'string' then
      v_path := v_pair.value #>> '{}';
      if v_path <> '' then
        if v_path ~ '(^|/)(\.|\.\.)(/|$)' then
          raise exception 'Backup contains an unsafe storage path.';
        end if;
        if left(v_path, length(p_source_church) + 1) <> p_source_church || '/' then
          raise exception 'Backup contains a storage path outside the source church workspace.';
        end if;
        p_row := jsonb_set(
          p_row,
          array[v_pair.key],
          to_jsonb(p_target_church || substr(v_path, length(p_source_church) + 1)),
          false
        );
      end if;
    end if;
  end loop;
  return p_row;
end;
$function$;

revoke all on function private.remap_church_backup_row(jsonb,text,text) from public, anon, authenticated;

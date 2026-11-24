create or replace function private.can_access_private_church_document(p_name text,p_action text)
returns boolean language plpgsql stable security definer set search_path=''
as $$
declare v_parts text[];v_church uuid;v_record uuid;v_branch uuid;v_module text;v_permission text;
begin
 v_parts:=storage.foldername(p_name);
 if coalesce(array_length(v_parts,1),0)<2 then return false; end if;
 begin v_church:=v_parts[1]::uuid; exception when others then return false; end;
 if v_parts[2]='certificates' then
  if coalesce(array_length(v_parts,1),0)<3 then return false; end if;
  begin v_record:=v_parts[3]::uuid; exception when others then return false; end;
  select branch_id into v_branch from public.certificates where id=v_record and church_id=v_church;
  if not found then return false; end if;v_module:='certificate_documents';
 elsif v_parts[2]='templates' then
  if coalesce(array_length(v_parts,1),0)<3 then return false; end if;
  begin v_record:=v_parts[3]::uuid; exception when others then return false; end;
  if not exists(select 1 from public.certificate_templates where id=v_record and church_id=v_church) then return false; end if;
  v_branch:=null;v_module:='certificates';
 elsif coalesce(array_length(v_parts,1),0)>=3 and v_parts[3]='member-documents' then
  begin v_record:=v_parts[2]::uuid; exception when others then return false; end;
  select branch_id into v_branch from public.members where id=v_record and church_id=v_church;
  if not found then return false; end if;v_module:='members';
 else return false;
 end if;
 if not private.has_church_branch_access(v_church,v_branch) then return false; end if;
 if v_module='certificates' and v_parts[2]='templates' then v_permission:=case when p_action='view' then 'view' else 'edit' end;
 else v_permission:=case when p_action='view' then 'view' when p_action='create' then 'create' else 'edit' end;end if;
 return private.has_church_permission(v_church,v_module,v_permission);
end;
$$;

create or replace function public.reissue_certificate(p_certificate_id uuid,p_reason text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_old public.certificates%rowtype;v_new_id uuid;v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if nullif(trim(p_reason),'') is null then raise exception 'A correction or reissue reason is required' using errcode='22023'; end if;
 select * into v_old from public.certificates where id=p_certificate_id for update;
 if not found then raise exception 'Certificate not found' using errcode='P0002'; end if;
 if v_old.status<>'issued' then raise exception 'Only issued certificates can be reissued' using errcode='22023'; end if;
 if not private.has_church_permission(v_old.church_id,'certificates','create') then raise exception 'You are not allowed to reissue certificates' using errcode='42501'; end if;
 v_new_id:=public.create_certificate_application(v_old.church_id,v_old.certificate_type,v_old.primary_person_name,v_old.secondary_person_name,v_old.event_date,
  coalesce(v_old.form_data,'{}'::jsonb)||jsonb_build_object('reissue_reason',trim(p_reason),'reissued_from',v_old.registration_number),
  'Reissue of '||v_old.registration_number||': '||trim(p_reason));
 update public.certificates set event_place=v_old.event_place,pastor_name=v_old.pastor_name,primary_member_id=v_old.primary_member_id,secondary_member_id=v_old.secondary_member_id,family_id=v_old.family_id,supersedes_certificate_id=v_old.id where id=v_new_id;
 insert into public.certificate_history(church_id,certificate_id,action,from_status,to_status,details,performed_by)
 values(v_old.church_id,v_old.id,'reissued','issued','issued',jsonb_build_object('replacement_certificate_id',v_new_id,'reason',trim(p_reason)),v_user);
 return v_new_id;
end;
$$;
revoke all on function public.reissue_certificate(uuid,text) from public;
grant execute on function public.reissue_certificate(uuid,text) to authenticated;

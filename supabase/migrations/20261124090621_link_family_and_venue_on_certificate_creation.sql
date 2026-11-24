create or replace function public.create_certificate_application(p_church_id uuid,p_certificate_type text,p_primary_person_name text,p_secondary_person_name text default null,p_event_date date default null,p_form_data jsonb default '{}'::jsonb,p_notes text default null)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_year integer:=extract(year from current_date)::integer;v_next bigint;v_prefix text;v_registration text;v_id uuid;v_family_id uuid;v_event_place text;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_certificate_type not in('marriage','birth','death','baptism','family','membership','dedication','confirmation','ordination','transfer','funeral','recommendation','volunteer') then raise exception 'Unsupported certificate type' using errcode='22023'; end if;
 if nullif(trim(p_primary_person_name),'') is null then raise exception 'Primary person name is required' using errcode='22023'; end if;
 if not private.has_church_permission(p_church_id,'certificates','create') then raise exception 'Not authorized to create certificates for this church' using errcode='42501'; end if;
 v_family_id:=nullif(p_form_data->>'family_id','')::uuid;v_event_place:=nullif(trim(p_form_data->>'event_place'),'');
 if v_family_id is not null and not exists(select 1 from public.families f where f.id=v_family_id and f.church_id=p_church_id) then raise exception 'Selected family does not belong to this church workspace.' using errcode='22023'; end if;
 v_prefix:=case p_certificate_type when 'marriage' then 'MAR' when 'birth' then 'BIR' when 'death' then 'DEA' when 'baptism' then 'BAP' when 'family' then 'FAM' when 'membership' then 'MEM' when 'dedication' then 'DED' when 'confirmation' then 'CON' when 'ordination' then 'ORD' when 'transfer' then 'TRF' when 'funeral' then 'FUN' when 'recommendation' then 'REC' else 'VOL' end;
 insert into public.certificate_sequences(church_id,certificate_type,sequence_year,last_value) values(p_church_id,p_certificate_type,v_year,1)
 on conflict(church_id,certificate_type,sequence_year) do update set last_value=public.certificate_sequences.last_value+1 returning last_value into v_next;
 v_registration:=v_prefix||'-'||v_year::text||'-'||lpad(v_next::text,6,'0');
 insert into public.certificates(church_id,certificate_type,registration_number,status,primary_person_name,secondary_person_name,event_date,event_place,form_data,notes,applicant_user_id,family_id)
 values(p_church_id,p_certificate_type,v_registration,'draft',trim(p_primary_person_name),nullif(trim(p_secondary_person_name),''),p_event_date,v_event_place,coalesce(p_form_data,'{}'::jsonb),p_notes,v_user,v_family_id) returning id into v_id;
 insert into public.certificate_history(church_id,certificate_id,action,to_status,performed_by,details) values(p_church_id,v_id,'created','draft',v_user,jsonb_build_object('registration_number',v_registration));
 return v_id;
end;
$$;

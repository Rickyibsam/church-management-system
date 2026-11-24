create or replace function public.create_certificate_application(p_church_id uuid,p_certificate_type text,p_primary_person_name text,p_secondary_person_name text default null,p_event_date date default null,p_form_data jsonb default '{}'::jsonb,p_notes text default null)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_year integer:=extract(year from current_date)::integer;v_next bigint;v_prefix text;v_registration text;v_id uuid;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_certificate_type not in('marriage','birth','death','baptism','family','membership','dedication','confirmation','ordination','transfer','funeral','recommendation','volunteer') then raise exception 'Unsupported certificate type' using errcode='22023'; end if;
 if nullif(trim(p_primary_person_name),'') is null then raise exception 'Primary person name is required' using errcode='22023'; end if;
 if not private.has_church_permission(p_church_id,'certificates','create') then raise exception 'Not authorized to create certificates for this church' using errcode='42501'; end if;
 v_prefix:=case p_certificate_type when 'marriage' then 'MAR' when 'birth' then 'BIR' when 'death' then 'DEA' when 'baptism' then 'BAP' when 'family' then 'FAM' when 'membership' then 'MEM' when 'dedication' then 'DED' when 'confirmation' then 'CON' when 'ordination' then 'ORD' when 'transfer' then 'TRF' when 'funeral' then 'FUN' when 'recommendation' then 'REC' else 'VOL' end;
 insert into public.certificate_sequences(church_id,certificate_type,sequence_year,last_value) values(p_church_id,p_certificate_type,v_year,1)
 on conflict(church_id,certificate_type,sequence_year) do update set last_value=public.certificate_sequences.last_value+1 returning last_value into v_next;
 v_registration:=v_prefix||'-'||v_year::text||'-'||lpad(v_next::text,6,'0');
 insert into public.certificates(church_id,certificate_type,registration_number,status,primary_person_name,secondary_person_name,event_date,form_data,notes,applicant_user_id)
 values(p_church_id,p_certificate_type,v_registration,'draft',trim(p_primary_person_name),nullif(trim(p_secondary_person_name),''),p_event_date,coalesce(p_form_data,'{}'::jsonb),p_notes,v_user) returning id into v_id;
 insert into public.certificate_history(church_id,certificate_id,action,to_status,performed_by,details) values(p_church_id,v_id,'created','draft',v_user,jsonb_build_object('registration_number',v_registration));
 return v_id;
end;
$$;
create or replace function public.transition_certificate(p_certificate_id uuid,p_target_status text,p_reason text default null)
returns void language plpgsql security definer set search_path=''
as $$
declare v_certificate public.certificates%rowtype;v_user uuid:=auth.uid();v_missing integer;v_country text;v_action text;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_target_status not in('submitted','under_review','approved','issued','rejected','cancelled') then raise exception 'Invalid target status' using errcode='22023'; end if;
 select c.* into v_certificate from public.certificates c where c.id=p_certificate_id for update;
 if not found then raise exception 'Certificate not found' using errcode='P0002'; end if;
 v_action:=case when p_target_status='issued' then 'issue' when p_target_status in('approved','rejected') then 'approve' else 'edit' end;
 if not private.has_church_permission(v_certificate.church_id,'certificates',v_action) then raise exception 'Not authorized to change this certificate status' using errcode='42501'; end if;
 select country_code into v_country from public.churches where id=v_certificate.church_id;
 if p_target_status='submitted' and v_certificate.status not in('draft','documents_pending') then raise exception 'Only drafts can be submitted' using errcode='22023'; end if;
 if p_target_status='under_review' and v_certificate.status<>'submitted' then raise exception 'Only submitted applications can enter review' using errcode='22023'; end if;
 if p_target_status='approved' and v_certificate.status<>'under_review' then raise exception 'Only reviewed applications can be approved' using errcode='22023'; end if;
 if p_target_status in('approved','issued') then
  select count(*) into v_missing from public.certificate_document_requirements req where req.church_id=v_certificate.church_id and req.certificate_type=v_certificate.certificate_type and req.is_active and req.is_required and (req.applicable_country is null or req.applicable_country=v_country)
   and not exists(select 1 from public.certificate_attachments a where a.certificate_id=v_certificate.id and a.requirement_id=req.id and a.verification_status='verified');
  if v_missing>0 then raise exception 'Required supporting documents are missing or not verified' using errcode='22023'; end if;
 end if;
 if p_target_status='issued' and v_certificate.status<>'approved' then raise exception 'Only approved certificates can be issued' using errcode='22023'; end if;
 if p_target_status='rejected' and nullif(trim(p_reason),'') is null then raise exception 'A rejection reason is required' using errcode='22023'; end if;
 update public.certificates set status=p_target_status,reviewed_by=case when p_target_status in('under_review','approved','rejected') then v_user else reviewed_by end,reviewed_at=case when p_target_status in('under_review','approved','rejected') then now() else reviewed_at end,issued_by=case when p_target_status='issued' then v_user else issued_by end,issued_at=case when p_target_status='issued' then now() else issued_at end,updated_at=now() where id=p_certificate_id;
 insert into public.certificate_history(church_id,certificate_id,action,from_status,to_status,details,performed_by) values(v_certificate.church_id,p_certificate_id,'status_changed',v_certificate.status,p_target_status,jsonb_build_object('reason',p_reason),v_user);
end;
$$;
create or replace function public.review_certificate_document(p_attachment_id uuid,p_new_status text,p_reviewer_notes text default null)
returns void language plpgsql security definer set search_path=''
as $$
declare v_attachment public.certificate_attachments%rowtype;v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_new_status not in('verified','rejected') then raise exception 'Invalid document status' using errcode='22023'; end if;
 select a.* into v_attachment from public.certificate_attachments a where a.id=p_attachment_id for update;
 if not found then raise exception 'Attachment not found' using errcode='P0002'; end if;
 if not private.has_church_permission(v_attachment.church_id,'certificate_documents','edit') then raise exception 'Not authorized to review certificate documents' using errcode='42501'; end if;
 update public.certificate_attachments set verification_status=p_new_status,reviewer_notes=p_reviewer_notes,reviewed_by=v_user,reviewed_at=now() where id=p_attachment_id;
 insert into public.certificate_history(church_id,certificate_id,action,details,performed_by) values(v_attachment.church_id,v_attachment.certificate_id,'document_'||p_new_status,jsonb_build_object('attachment_id',p_attachment_id,'notes',p_reviewer_notes),v_user);
end;
$$;

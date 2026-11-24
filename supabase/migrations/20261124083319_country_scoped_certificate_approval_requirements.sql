create or replace function public.transition_certificate(p_certificate_id uuid,p_target_status text,p_reason text default null)
returns void language plpgsql security definer set search_path=''
as $$
declare v_certificate public.certificates%rowtype; v_role text; v_user uuid:=auth.uid(); v_missing integer; v_country text;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_target_status not in('submitted','under_review','approved','issued','rejected','cancelled') then raise exception 'Invalid target status' using errcode='22023'; end if;
 select c.* into v_certificate from public.certificates c where c.id=p_certificate_id for update;
 if not found then raise exception 'Certificate not found' using errcode='P0002'; end if;
 select country_code into v_country from public.churches where id=v_certificate.church_id;
 select cm.role into v_role from public.church_members cm where cm.church_id=v_certificate.church_id and cm.user_id=v_user and cm.status='active';
 if v_role is null or v_role not in('owner','admin','pastor','secretary') then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_target_status='submitted' and v_certificate.status not in('draft','documents_pending') then raise exception 'Only drafts can be submitted' using errcode='22023'; end if;
 if p_target_status='under_review' and v_certificate.status<>'submitted' then raise exception 'Only submitted applications can enter review' using errcode='22023'; end if;
 if p_target_status='approved' and v_certificate.status<>'under_review' then raise exception 'Only reviewed applications can be approved' using errcode='22023'; end if;
 if p_target_status in('approved','issued') then
  select count(*) into v_missing from public.certificate_document_requirements req
  where req.church_id=v_certificate.church_id and req.certificate_type=v_certificate.certificate_type and req.is_active and req.is_required
   and (req.applicable_country is null or req.applicable_country=v_country)
   and not exists(select 1 from public.certificate_attachments a where a.certificate_id=v_certificate.id and a.requirement_id=req.id and a.verification_status='verified');
  if v_missing>0 then raise exception 'Required supporting documents are missing or not verified' using errcode='22023'; end if;
 end if;
 if p_target_status='issued' and v_certificate.status<>'approved' then raise exception 'Only approved certificates can be issued' using errcode='22023'; end if;
 if p_target_status='rejected' and nullif(trim(p_reason),'') is null then raise exception 'A rejection reason is required' using errcode='22023'; end if;
 update public.certificates set status=p_target_status,reviewed_by=case when p_target_status in('under_review','approved','rejected') then v_user else reviewed_by end,reviewed_at=case when p_target_status in('under_review','approved','rejected') then now() else reviewed_at end,issued_by=case when p_target_status='issued' then v_user else issued_by end,issued_at=case when p_target_status='issued' then now() else issued_at end,updated_at=now() where id=p_certificate_id;
 insert into public.certificate_history(church_id,certificate_id,action,from_status,to_status,details,performed_by) values(v_certificate.church_id,p_certificate_id,'status_changed',v_certificate.status,p_target_status,jsonb_build_object('reason',p_reason),v_user);
end;
$$;

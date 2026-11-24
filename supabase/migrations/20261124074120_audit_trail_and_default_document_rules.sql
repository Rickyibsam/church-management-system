create or replace function private.write_church_audit_log() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_church_id uuid; v_record_id uuid; v_before jsonb; v_after jsonb;
begin
 if tg_op='DELETE' then v_before:=to_jsonb(old); v_church_id:=(v_before->>'church_id')::uuid; v_record_id:=(v_before->>'id')::uuid;
 elsif tg_op='UPDATE' then v_before:=to_jsonb(old); v_after:=to_jsonb(new); v_church_id:=(v_after->>'church_id')::uuid; v_record_id:=(v_after->>'id')::uuid;
 else v_after:=to_jsonb(new); v_church_id:=(v_after->>'church_id')::uuid; v_record_id:=(v_after->>'id')::uuid; end if;
 if v_church_id is not null then insert into public.audit_logs(church_id,actor_user_id,action,table_name,record_id,before_data,after_data) values(v_church_id,auth.uid(),lower(tg_op),tg_table_name,v_record_id,v_before,v_after); end if;
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function private.write_church_audit_log() from public,anon,authenticated;
do $$ declare t text; begin foreach t in array array['church_branches','families','members','family_relationships','certificate_templates','certificate_document_requirements','certificates','certificate_attachments','church_services','attendance_records','ministries','ministry_members','church_events','financial_accounts','donations','expenses','church_assets'] loop execute format('drop trigger if exists audit_%I on public.%I',t,t); execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function private.write_church_audit_log()',t,t); end loop; end $$;
create or replace function public.create_church(p_legal_name text,p_display_name text,p_country_code char(2) default 'PK',p_currency_code char(3) default 'PKR',p_timezone text default 'Asia/Karachi') returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid:=auth.uid(); v_church_id uuid;
begin
 if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if nullif(trim(p_legal_name),'') is null or nullif(trim(p_display_name),'') is null then raise exception 'Church name is required' using errcode='22023'; end if;
 insert into public.churches(legal_name,display_name,country_code,currency_code,timezone) values(trim(p_legal_name),trim(p_display_name),upper(p_country_code),upper(p_currency_code),p_timezone) returning id into v_church_id;
 insert into public.church_members(church_id,user_id,role,status) values(v_church_id,v_user_id,'owner','active');
 insert into public.church_branches(church_id,name,branch_code,is_head_office) values(v_church_id,'Main Church','MAIN',true);
 insert into public.certificate_document_requirements(church_id,certificate_type,document_code,document_label,is_required,sort_order) values
 (v_church_id,'marriage','bride_cnic','Bride CNIC copy',true,1),(v_church_id,'marriage','groom_cnic','Groom CNIC copy',true,2),(v_church_id,'marriage','witness_1_id','Witness 1 identity copy',true,3),(v_church_id,'marriage','witness_2_id','Witness 2 identity copy',true,4),(v_church_id,'marriage','marriage_application','Marriage application / supporting record',true,5),
 (v_church_id,'birth','father_id','Father identity document',true,1),(v_church_id,'birth','mother_id','Mother identity document',true,2),(v_church_id,'birth','birth_evidence','Hospital slip / available birth evidence',true,3),
 (v_church_id,'death','deceased_id','Deceased identity document (if available)',false,1),(v_church_id,'death','applicant_id','Applicant identity document',true,2),(v_church_id,'death','death_evidence','Hospital / death / burial evidence',true,3),
 (v_church_id,'baptism','member_record','Member identity or church member record',true,1),(v_church_id,'baptism','guardian_consent','Parent / guardian consent where applicable',false,2),
 (v_church_id,'family','family_head_id','Family head identity document',true,1),(v_church_id,'family','spouse_id','Spouse identity document',false,2),(v_church_id,'family','children_bform','Children B-Forms / identity evidence',false,3) on conflict do nothing;
 return v_church_id;
end $$;
revoke all on function public.create_church(text,text,char,char,text) from public,anon;
grant execute on function public.create_church(text,text,char,char,text) to authenticated;

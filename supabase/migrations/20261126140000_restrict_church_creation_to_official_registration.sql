-- Church creation must only happen through the trusted registration Edge Function.
-- The old authenticated RPC let any signed-in user create additional church workspaces without the
-- required official church email and bypassed the registration workflow.
revoke all on function public.create_church(text,text,character,character,text)
  from public, anon, authenticated, service_role;

create or replace function public.create_church(
  p_owner_user_id uuid,
  p_legal_name text,
  p_display_name text,
  p_country_code character default 'PK',
  p_currency_code character default 'PKR',
  p_timezone text default 'Asia/Karachi'
) returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_church_id uuid;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'Church registration must use the trusted registration service.' using errcode='42501';
  end if;
  if p_owner_user_id is null or not exists(select 1 from auth.users u where u.id=p_owner_user_id) then
    raise exception 'A valid initial Church Administrator account is required.' using errcode='22023';
  end if;
  if nullif(trim(p_legal_name),'') is null or nullif(trim(p_display_name),'') is null then
    raise exception 'Church name is required' using errcode='22023';
  end if;

  insert into public.churches(legal_name,display_name,country_code,currency_code,timezone)
  values(trim(p_legal_name),trim(p_display_name),upper(p_country_code),upper(p_currency_code),p_timezone)
  returning id into v_church_id;

  insert into public.church_members(church_id,user_id,role,status)
  values(v_church_id,p_owner_user_id,'owner','active');

  insert into public.church_branches(church_id,name,branch_code,is_head_office)
  values(v_church_id,'Main Church','MAIN',true);

  insert into public.certificate_document_requirements
    (church_id,certificate_type,document_code,document_label,is_required,sort_order)
  values
    (v_church_id,'marriage','bride_cnic','Bride CNIC copy',true,1),
    (v_church_id,'marriage','groom_cnic','Groom CNIC copy',true,2),
    (v_church_id,'marriage','witness_1_id','Witness 1 identity copy',true,3),
    (v_church_id,'marriage','witness_2_id','Witness 2 identity copy',true,4),
    (v_church_id,'marriage','marriage_application','Marriage application / supporting record',true,5),
    (v_church_id,'birth','father_id','Father identity document',true,1),
    (v_church_id,'birth','mother_id','Mother identity document',true,2),
    (v_church_id,'birth','birth_evidence','Hospital slip / available birth evidence',true,3),
    (v_church_id,'death','deceased_id','Deceased identity document (if available)',false,1),
    (v_church_id,'death','applicant_id','Applicant identity document',true,2),
    (v_church_id,'death','death_evidence','Hospital / death / burial evidence',true,3),
    (v_church_id,'baptism','member_record','Member identity or church member record',true,1),
    (v_church_id,'baptism','guardian_consent','Parent / guardian consent where applicable',false,2),
    (v_church_id,'family','family_head_id','Family head identity document',true,1),
    (v_church_id,'family','spouse_id','Spouse identity document',false,2),
    (v_church_id,'family','children_bform','Children B-Forms / identity evidence',false,3),
    (v_church_id,'membership','identity','Identity document (if available)',false,1),
    (v_church_id,'membership','application','Membership application',true,2),
    (v_church_id,'dedication','birth_evidence','Child birth evidence',false,1),
    (v_church_id,'dedication','guardian_consent','Parent / guardian identity and consent',true,2),
    (v_church_id,'confirmation','member_record','Member record',true,1),
    (v_church_id,'confirmation','class_record','Confirmation class / pastoral record',false,2),
    (v_church_id,'ordination','candidate_identity','Candidate identity',true,1),
    (v_church_id,'ordination','authorization','Training and church authorization records',true,2),
    (v_church_id,'transfer','member_record','Member identity or church record',true,1),
    (v_church_id,'transfer','receiving_church','Receiving church details',true,2)
  on conflict do nothing;
  return v_church_id;
end;
$function$;

revoke all on function public.create_church(uuid,text,text,character,character,text)
  from public, anon, authenticated;
grant execute on function public.create_church(uuid,text,text,character,character,text)
  to service_role;

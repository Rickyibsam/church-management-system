create table if not exists public.certificate_sequences (
  church_id uuid not null references public.churches(id) on delete cascade,
  certificate_type text not null,
  sequence_year integer not null,
  last_value bigint not null default 0,
  primary key(church_id,certificate_type,sequence_year)
);
alter table public.certificate_sequences enable row level security;
create or replace function public.create_certificate_application(
  p_church_id uuid,p_certificate_type text,p_primary_person_name text,
  p_secondary_person_name text default null,p_event_date date default null,
  p_form_data jsonb default '{}'::jsonb,p_notes text default null
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_user uuid:=auth.uid(); v_role text; v_year integer:=extract(year from current_date)::integer;
v_next bigint; v_prefix text; v_registration text; v_id uuid;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_certificate_type not in ('marriage','birth','death','baptism','family','membership','dedication','confirmation','ordination','transfer','funeral','recommendation','volunteer') then raise exception 'Unsupported certificate type' using errcode='22023'; end if;
 if nullif(trim(p_primary_person_name),'') is null then raise exception 'Primary person name is required' using errcode='22023'; end if;
 select cm.role into v_role from public.church_members cm where cm.church_id=p_church_id and cm.user_id=v_user and cm.status='active';
 if v_role is null or v_role not in ('owner','admin','pastor','secretary','staff') then raise exception 'Not authorized for this church' using errcode='42501'; end if;
 v_prefix:=case p_certificate_type when 'marriage' then 'MAR' when 'birth' then 'BIR' when 'death' then 'DEA' when 'baptism' then 'BAP' when 'family' then 'FAM' when 'membership' then 'MEM' when 'dedication' then 'DED' when 'confirmation' then 'CON' when 'ordination' then 'ORD' when 'transfer' then 'TRF' when 'funeral' then 'FUN' when 'recommendation' then 'REC' else 'VOL' end;
 insert into public.certificate_sequences(church_id,certificate_type,sequence_year,last_value) values(p_church_id,p_certificate_type,v_year,1)
 on conflict(church_id,certificate_type,sequence_year) do update set last_value=public.certificate_sequences.last_value+1 returning last_value into v_next;
 v_registration:=v_prefix||'-'||v_year::text||'-'||lpad(v_next::text,6,'0');
 insert into public.certificates(church_id,certificate_type,registration_number,status,primary_person_name,secondary_person_name,event_date,form_data,notes,applicant_user_id)
 values(p_church_id,p_certificate_type,v_registration,'draft',trim(p_primary_person_name),nullif(trim(p_secondary_person_name),''),p_event_date,coalesce(p_form_data,'{}'::jsonb),p_notes,v_user) returning id into v_id;
 insert into public.certificate_history(church_id,certificate_id,action,to_status,performed_by,details)
 values(p_church_id,v_id,'created','draft',v_user,jsonb_build_object('registration_number',v_registration));
 return v_id;
end $$;
revoke all on function public.create_certificate_application(uuid,text,text,text,date,jsonb,text) from public;
revoke all on function public.create_certificate_application(uuid,text,text,text,date,jsonb,text) from anon;
grant execute on function public.create_certificate_application(uuid,text,text,text,date,jsonb,text) to authenticated;

create or replace function public.create_church(p_legal_name text,p_display_name text,p_country_code char(2) default 'PK',p_currency_code char(3) default 'PKR',p_timezone text default 'Asia/Karachi') returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid:=auth.uid(); v_church_id uuid;
begin
 if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if nullif(trim(p_legal_name),'') is null or nullif(trim(p_display_name),'') is null then raise exception 'Church legal name and display name are required' using errcode='22023'; end if;
 insert into public.churches(legal_name,display_name,country_code,currency_code,timezone) values(trim(p_legal_name),trim(p_display_name),upper(p_country_code),upper(p_currency_code),p_timezone) returning id into v_church_id;
 insert into public.church_members(church_id,user_id,role,status) values(v_church_id,v_user_id,'owner','active');
 insert into public.church_branches(church_id,name,branch_code,is_head_office) values(v_church_id,'Main Church','MAIN',true);
 return v_church_id;
end $$;
revoke all on function public.create_church(text,text,char,char,text) from public,anon;
grant execute on function public.create_church(text,text,char,char,text) to authenticated;
create policy churches_admin_update on public.churches for update to authenticated using(exists(select 1 from public.church_members cm where cm.church_id=churches.id and cm.user_id=(select auth.uid()) and cm.status='active' and cm.role in('owner','admin'))) with check(exists(select 1 from public.church_members cm where cm.church_id=churches.id and cm.user_id=(select auth.uid()) and cm.status='active' and cm.role in('owner','admin')));

create or replace function public.approve_expense(p_expense_id uuid) returns jsonb
language plpgsql security definer set search_path to ''
as $function$
declare v public.expenses%rowtype;
begin
 select * into v from public.expenses where id=p_expense_id for update;
 if not found then raise exception 'Expense not found.'; end if;
 if not private.has_church_permission(v.church_id,'expenses','approve') then raise exception 'You are not allowed to approve expenses.'; end if;
 if not private.has_church_branch_access(v.church_id,v.branch_id) then raise exception 'You do not have access to this expense branch.'; end if;
 if v.status<>'draft' then raise exception 'Only draft expenses can be approved.'; end if;
 perform set_config('app.expense_approve_rpc','on',true);
 update public.expenses set status='approved',approved_by=auth.uid() where id=v.id;
 return jsonb_build_object('success',true,'expense_id',v.id);
end;
$function$;

create or replace function public.post_expense(p_expense_id uuid) returns jsonb
language plpgsql security definer set search_path to ''
as $function$
declare v public.expenses%rowtype; v_cash_account uuid; v_expense_account uuid; v_entry uuid;
begin
 select * into v from public.expenses where id=p_expense_id for update;
 if not found then raise exception 'Expense not found.'; end if;
 if not private.has_church_permission(v.church_id,'expenses','approve') then raise exception 'You are not allowed to post expenses.'; end if;
 if not private.has_church_branch_access(v.church_id,v.branch_id) then raise exception 'You do not have access to this expense branch.'; end if;
 if v.status='posted' then return jsonb_build_object('success',true,'journal_entry_id',v.journal_entry_id); end if;
 if v.status<>'approved' then raise exception 'Only approved expenses can be posted.'; end if;
 select coa.id into v_cash_account from public.financial_accounts fa join public.chart_of_accounts coa on coa.id=fa.chart_account_id and coa.church_id=fa.church_id where fa.id=v.account_id and fa.church_id=v.church_id and fa.is_active and coa.is_active and coa.account_type='asset';
 select coa.id into v_expense_account from public.chart_of_accounts coa where coa.id=v.expense_account_id and coa.church_id=v.church_id and coa.is_active and coa.account_type='expense';
 if v_cash_account is null then raise exception 'Select an active cash or bank account linked to an active asset account.'; end if;
 if v_expense_account is null then raise exception 'Select an active expense account from this church chart of accounts.'; end if;
 insert into public.journal_entries(church_id,entry_number,entry_date,description,status,source_type,source_id,created_by) values(v.church_id,'EXP-JE-'||upper(substr(replace(v.id::text,'-',''),1,12)),v.spent_at::date,'Expense: '||v.expense_category,'draft','expense',v.id,auth.uid()) returning id into v_entry;
 insert into public.journal_lines(church_id,journal_entry_id,account_id,description,debit,credit,currency_code) values(v.church_id,v_entry,v_expense_account,'Expense recorded',v.amount,0,v.currency_code),(v.church_id,v_entry,v_cash_account,'Cash or bank payment',0,v.amount,v.currency_code);
 perform public.post_journal_entry(v_entry);
 perform set_config('app.expense_post_rpc','on',true);
 update public.expenses set status='posted',journal_entry_id=v_entry,posted_at=now(),posted_by=auth.uid() where id=v.id;
 return jsonb_build_object('success',true,'journal_entry_id',v_entry);
end;
$function$;

create or replace function public.post_donation(p_donation_id uuid) returns jsonb
language plpgsql security definer set search_path to ''
as $function$
declare v public.donations%rowtype; v_cash_account uuid; v_income_account uuid; v_entry uuid; v_number text;
begin
 select * into v from public.donations where id=p_donation_id for update;
 if not found then raise exception 'Donation not found.'; end if;
 if not private.has_church_permission(v.church_id,'donations','approve') then raise exception 'You are not allowed to post donations.'; end if;
 if not private.has_church_branch_access(v.church_id,v.branch_id) then raise exception 'You do not have access to this donation branch.'; end if;
 if v.status='posted' then return jsonb_build_object('success',true,'journal_entry_id',v.journal_entry_id,'receipt_number',v.receipt_number); end if;
 if v.status<>'draft' then raise exception 'Only draft donations can be posted.'; end if;
 select coa.id into v_cash_account from public.financial_accounts fa join public.chart_of_accounts coa on coa.id=fa.chart_account_id and coa.church_id=fa.church_id where fa.id=v.account_id and fa.church_id=v.church_id and fa.is_active and coa.is_active and coa.account_type='asset';
 select coa.id into v_income_account from public.chart_of_accounts coa where coa.id=v.income_account_id and coa.church_id=v.church_id and coa.is_active and coa.account_type='income';
 if v_cash_account is null then raise exception 'Select an active cash or bank account linked to an active asset account.'; end if;
 if v_income_account is null then raise exception 'Select an active income account from this church chart of accounts.'; end if;
 v_number:=coalesce(v.receipt_number,'DON-'||to_char(v.donated_at,'YYYYMMDD')||'-'||upper(substr(replace(v.id::text,'-',''),1,8)));
 insert into public.journal_entries(church_id,entry_number,entry_date,description,status,source_type,source_id,created_by) values(v.church_id,'DON-JE-'||upper(substr(replace(v.id::text,'-',''),1,12)),v.donated_at::date,'Donation receipt '||v_number,'draft','donation',v.id,auth.uid()) returning id into v_entry;
 insert into public.journal_lines(church_id,journal_entry_id,account_id,description,debit,credit,currency_code) values(v.church_id,v_entry,v_cash_account,'Donation received',v.amount,0,v.currency_code),(v.church_id,v_entry,v_income_account,'Donation income',0,v.amount,v.currency_code);
 perform public.post_journal_entry(v_entry); perform set_config('app.donation_post_rpc','on',true);
 update public.donations set status='posted',journal_entry_id=v_entry,receipt_number=v_number,posted_at=now(),posted_by=auth.uid() where id=v.id;
 return jsonb_build_object('success',true,'journal_entry_id',v_entry,'receipt_number',v_number);
end;
$function$;

create or replace function public.review_certificate_document(p_attachment_id uuid,p_new_status text,p_reviewer_notes text default null) returns void
language plpgsql security definer set search_path to ''
as $function$
declare v_attachment public.certificate_attachments%rowtype; v_certificate public.certificates%rowtype; v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_new_status not in('verified','rejected') then raise exception 'Invalid document status' using errcode='22023'; end if;
 select a.* into v_attachment from public.certificate_attachments a where a.id=p_attachment_id for update;
 if not found then raise exception 'Attachment not found' using errcode='P0002'; end if;
 select c.* into v_certificate from public.certificates c where c.id=v_attachment.certificate_id and c.church_id=v_attachment.church_id;
 if not found then raise exception 'Certificate not found' using errcode='P0002'; end if;
 if not private.has_church_permission(v_attachment.church_id,'certificate_documents','approve') then raise exception 'Not authorized to review certificate documents' using errcode='42501'; end if;
 if not private.has_church_branch_access(v_certificate.church_id,v_certificate.branch_id) then raise exception 'You do not have access to this certificate branch.' using errcode='42501'; end if;
 update public.certificate_attachments set verification_status=p_new_status,reviewer_notes=p_reviewer_notes,reviewed_by=v_user,reviewed_at=now() where id=p_attachment_id;
 insert into public.certificate_history(church_id,certificate_id,action,details,performed_by) values(v_attachment.church_id,v_attachment.certificate_id,'document_'||p_new_status,jsonb_build_object('attachment_id',p_attachment_id,'notes',p_reviewer_notes),v_user);
end;
$function$;

create or replace function public.reissue_certificate(p_certificate_id uuid,p_reason text) returns uuid
language plpgsql security definer set search_path to ''
as $function$
declare v_old public.certificates%rowtype; v_new_id uuid; v_user uuid:=auth.uid(); v_form_data jsonb;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if nullif(trim(p_reason),'') is null then raise exception 'A correction or reissue reason is required' using errcode='22023'; end if;
 select * into v_old from public.certificates where id=p_certificate_id for update;
 if not found then raise exception 'Certificate not found' using errcode='P0002'; end if;
 if not private.has_church_permission(v_old.church_id,'certificates','create') then raise exception 'You are not allowed to reissue certificates' using errcode='42501'; end if;
 if not private.has_church_branch_access(v_old.church_id,v_old.branch_id) then raise exception 'You do not have access to this certificate branch.' using errcode='42501'; end if;
 if v_old.status<>'issued' then raise exception 'Only issued certificates can be reissued' using errcode='22023'; end if;
 v_form_data:=coalesce(v_old.form_data,'{}'::jsonb)||jsonb_build_object('branch_id',v_old.branch_id,'reissue_reason',trim(p_reason),'reissued_from',v_old.registration_number);
 v_new_id:=public.create_certificate_application(v_old.church_id,v_old.certificate_type,v_old.primary_person_name,v_old.secondary_person_name,v_old.event_date,v_form_data,'Reissue of '||v_old.registration_number||': '||trim(p_reason));
 update public.certificates set event_place=v_old.event_place,pastor_name=v_old.pastor_name,primary_member_id=v_old.primary_member_id,secondary_member_id=v_old.secondary_member_id,family_id=v_old.family_id,supersedes_certificate_id=v_old.id where id=v_new_id;
 insert into public.certificate_history(church_id,certificate_id,action,from_status,to_status,details,performed_by) values(v_old.church_id,v_old.id,'reissued','issued','issued',jsonb_build_object('replacement_certificate_id',v_new_id,'reason',trim(p_reason)),v_user);
 return v_new_id;
end;
$function$;
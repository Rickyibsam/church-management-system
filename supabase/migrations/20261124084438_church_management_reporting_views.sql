create or replace view public.financial_monthly_summary with (security_invoker=true) as
select church_id,date_trunc('month',transaction_date)::date as month_start,transaction_type,currency_code,sum(debit_amount) as debit_total,sum(credit_amount) as credit_total,count(*) as transaction_count
from public.financial_ledger group by church_id,date_trunc('month',transaction_date)::date,transaction_type,currency_code;
create or replace view public.attendance_summary with (security_invoker=true) as
select church_id,date_trunc('day',check_in_at)::date as attendance_date,service_id,event_id,attendance_status,count(*) as attendance_count
from public.attendance_records group by church_id,date_trunc('day',check_in_at)::date,service_id,event_id,attendance_status;
create or replace view public.certificate_register_report with (security_invoker=true) as
select church_id,registration_number,certificate_type,primary_person_name,secondary_person_name,status,event_date,issued_at,created_at from public.certificates;
create or replace view public.member_directory_report with (security_invoker=true) as
select church_id,member_number,concat_ws(' ',first_name,middle_name,last_name) as full_name,gender,date_of_birth,phone,email,membership_status,joined_on,family_id from public.members;
create or replace view public.donor_statement_report with (security_invoker=true) as
select church_id,donor_name,member_id,receipt_number,donated_at,donation_type,amount,currency_code,payment_method,notes from public.donations where status='posted';
grant select on public.financial_monthly_summary,public.attendance_summary,public.certificate_register_report,public.member_directory_report,public.donor_statement_report to authenticated;

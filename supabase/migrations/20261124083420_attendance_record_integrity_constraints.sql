alter table public.attendance_records alter column checked_in_by set default auth.uid();
alter table public.attendance_records add constraint attendance_person_required check (member_id is not null or nullif(trim(visitor_name),'') is not null) not valid;
alter table public.attendance_records add constraint attendance_status_valid check (attendance_status in ('present','late','excused','absent')) not valid;
alter table public.attendance_records add constraint attendance_method_valid check (attendance_method in ('manual','qr','import','kiosk')) not valid;

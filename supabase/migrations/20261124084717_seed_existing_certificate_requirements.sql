insert into public.certificate_document_requirements(church_id,certificate_type,document_code,document_label,is_required,sort_order)
select c.id,v.certificate_type,v.document_code,v.document_label,v.is_required,v.sort_order
from public.churches c cross join (values
 ('membership','identity','Identity document (if available)',false,1),('membership','application','Membership application',true,2),
 ('dedication','birth_evidence','Child birth evidence',false,1),('dedication','guardian_consent','Parent / guardian identity and consent',true,2),
 ('confirmation','member_record','Member record',true,1),('confirmation','class_record','Confirmation class / pastoral record',false,2),
 ('ordination','candidate_identity','Candidate identity',true,1),('ordination','authorization','Training and church authorization records',true,2),
 ('transfer','member_record','Member identity or church record',true,1),('transfer','receiving_church','Receiving church details',true,2)
) as v(certificate_type,document_code,document_label,is_required,sort_order)
on conflict do nothing;

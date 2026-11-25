do $$
declare
  r record;
  v_definition text;
  v_oid oid;
begin
  for r in
    select * from (values
      ('public.approve_expense(uuid)','has_church_permission(v.church_id,''expenses'',''edit'')','has_church_permission(v.church_id,''expenses'',''approve'')'),
      ('public.approve_financial_budget(uuid)','has_church_permission(v.church_id,''budgets'',''edit'')','has_church_permission(v.church_id,''budgets'',''approve'')'),
      ('public.dispose_church_asset(uuid,date,numeric,uuid)','has_church_permission(v.church_id,''assets'',''edit'')','has_church_permission(v.church_id,''assets'',''approve'')'),
      ('public.post_asset_depreciation(uuid,date)','has_church_permission(v.church_id,''assets'',''edit'')','has_church_permission(v.church_id,''assets'',''approve'')'),
      ('public.post_donation(uuid)','has_church_permission(v.church_id,''donations'',''edit'')','has_church_permission(v.church_id,''donations'',''approve'')'),
      ('public.post_expense(uuid)','has_church_permission(v.church_id,''expenses'',''edit'')','has_church_permission(v.church_id,''expenses'',''approve'')'),
      ('public.post_journal_entry(uuid)','has_church_permission(v_church_id,''accounts'',''edit'')','has_church_permission(v_church_id,''accounts'',''approve'')'),
      ('public.review_certificate_document(uuid,text,text)','has_church_permission(v_attachment.church_id,''certificate_documents'',''edit'')','has_church_permission(v_attachment.church_id,''certificate_documents'',''approve'')')
    ) as x(signature,old_check,new_check)
  loop
    v_oid:=to_regprocedure(r.signature);
    if v_oid is null then raise exception 'Expected authorization function % was not found.',r.signature; end if;
    v_definition:=pg_get_functiondef(v_oid);
    if position(r.old_check in v_definition)=0 then
      raise exception 'Expected permission check was not found in %.',r.signature;
    end if;
    execute replace(v_definition,r.old_check,r.new_check);
  end loop;
end;
$$;

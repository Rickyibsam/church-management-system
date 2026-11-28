import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import DataModule from "./DataModule";

type DonationType = { id:string; name:string; description:string|null; is_active:boolean };

export default function DonationsModule({churchId}:{churchId:string|null}) {
  const [types,setTypes]=useState<DonationType[]>([]);
  const [notice,setNotice]=useState("");

  async function loadTypes() {
    if(!supabase||!churchId){setTypes([]);return;}
    const {data,error}=await supabase.from("donation_types").select("id,name,description,is_active").eq("church_id",churchId).order("name");
    if(error){setNotice("Unable to load donation types: "+error.message);return;}
    setTypes((data??[]) as DonationType[]);
  }
  useEffect(()=>{void loadTypes();},[churchId]);

  const activeTypes=types.filter(item=>item.is_active);
  return <>
    <div className="page-intro"><div><h2>Donations</h2><p>Record donations, post them to the general ledger and generate receipt numbers. Manage categories from the separate Donation Types tab.</p></div></div>
    {notice&&<div className="notice">{notice}</div>}
    <DataModule churchId={churchId} table="donations" permissionModule="donations" title="Donations register" description="Record donations, post them to the general ledger and generate receipt numbers." financialAction="donation" filterField="donation_type" filterOptions={activeTypes.map(item=>({value:item.name,label:item.name}))} extraColumns={["status","receipt_number"]} extraDisplay={[{name:"receipt_number",label:"Receipt no."},{name:"status",label:"Status"}]} fields={[{name:"donor_name",label:"Donor name"},{name:"branch_id",label:"Branch",lookup:{table:"church_branches",labelField:"name"}},{name:"donation_type",label:"Donation type",required:true,options:activeTypes.map(item=>({value:item.name,label:item.name}))},{name:"amount",label:"Amount",type:"number",required:true},{name:"currency_code",label:"Currency code"},{name:"donated_at",label:"Donation date",type:"datetime-local"},{name:"account_id",label:"Cash / bank account",lookup:{table:"financial_accounts",labelField:"name"}},{name:"income_account_id",label:"Income chart account",lookup:{table:"chart_of_accounts",labelField:"account_name",filterField:"account_type",filterValue:"income"}},{name:"payment_method",label:"Payment method"},{name:"notes",label:"Notes"}]}/>
  </>;
}

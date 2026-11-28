import { useEffect, useState } from "react";
import { Plus, Tags } from "lucide-react";
import { supabase } from "../lib/supabase";
import DataModule from "./DataModule";

type DonationType = { id:string; name:string; description:string|null; is_active:boolean };

export default function DonationsModule({churchId}:{churchId:string|null}) {
  const [types,setTypes]=useState<DonationType[]>([]);
  const [name,setName]=useState("");
  const [description,setDescription]=useState("");
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [showTypes,setShowTypes]=useState(false);

  async function loadTypes() {
    if(!supabase||!churchId){setTypes([]);return;}
    const {data,error}=await supabase.from("donation_types").select("id,name,description,is_active").eq("church_id",churchId).order("name");
    if(error){setNotice("Unable to load donation types: "+error.message);return;}
    setTypes((data??[]) as DonationType[]);
  }
  useEffect(()=>{void loadTypes();},[churchId]);

  async function addType() {
    if(!supabase||!churchId||name.trim().length<2)return;
    setBusy(true);setNotice("");
    const {error}=await supabase.from("donation_types").insert({church_id:churchId,name:name.trim(),description:description.trim()||null});
    setBusy(false);
    if(error){setNotice("Unable to save donation type: "+error.message);return;}
    setName("");setDescription("");setNotice("Donation type saved.");await loadTypes();
  }
  async function toggleType(item:DonationType) {
    if(!supabase||!churchId)return;
    const {error}=await supabase.from("donation_types").update({is_active:!item.is_active}).eq("id",item.id).eq("church_id",churchId);
    if(error){setNotice("Unable to update donation type: "+error.message);return;}
    await loadTypes();
  }
  const activeTypes=types.filter(item=>item.is_active);
  return <>
    <div className="page-intro"><div><h2>Donations</h2><p>Record donations, post them to the general ledger and generate receipt numbers.</p></div><button className="secondary-button" onClick={()=>setShowTypes(value=>!value)}><Tags size={16}/> Manage donation types</button></div>
    {notice&&<div className="notice">{notice}</div>}
    {showTypes&&<section className="panel settings-panel"><div className="page-intro"><div><h3>Donation Types</h3><p>Create and manage the categories available in the Donations form and filters.</p></div></div>
      <div className="form-grid"><div><label>Donation type name</label><input className="field" value={name} maxLength={80} onChange={e=>setName(e.target.value)} placeholder="e.g. Education Fund"/></div><div><label>Description (optional)</label><input className="field" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Purpose of this donation type"/></div></div>
      <div className="modal-actions"><button className="primary-button" disabled={busy||name.trim().length<2} onClick={()=>void addType()}><Plus size={16}/>{busy?"Saving...":"Add donation type"}</button></div>
      <div className="records-table"><div className="record-row record-head"><span>Donation type</span><span>Description</span><span>Status</span><span>Action</span></div>{types.map(item=><div className="record-row" key={item.id}><b>{item.name}</b><span>{item.description||"—"}</span><span>{item.is_active?"Active":"Inactive"}</span><span><button className="secondary-button" onClick={()=>void toggleType(item)}>{item.is_active?"Deactivate":"Activate"}</button></span></div>)}{!types.length&&<div className="empty-state">No donation types yet. Add your first type above.</div>}</div>
    </section>}
    <DataModule churchId={churchId} table="donations" permissionModule="donations" title="Donations register" description="Record donations, post them to the general ledger and generate receipt numbers." financialAction="donation" filterField="donation_type" filterOptions={activeTypes.map(item=>({value:item.name,label:item.name}))} extraColumns={["status","receipt_number"]} extraDisplay={[{name:"receipt_number",label:"Receipt no."},{name:"status",label:"Status"}]} fields={[{name:"donor_name",label:"Donor name"},{name:"branch_id",label:"Branch",lookup:{table:"church_branches",labelField:"name"}},{name:"donation_type",label:"Donation type",required:true,options:activeTypes.map(item=>({value:item.name,label:item.name}))},{name:"amount",label:"Amount",type:"number",required:true},{name:"currency_code",label:"Currency code"},{name:"donated_at",label:"Donation date",type:"datetime-local"},{name:"account_id",label:"Cash / bank account",lookup:{table:"financial_accounts",labelField:"name"}},{name:"income_account_id",label:"Income chart account",lookup:{table:"chart_of_accounts",labelField:"account_name",filterField:"account_type",filterValue:"income"}},{name:"payment_method",label:"Payment method"},{name:"notes",label:"Notes"}]}/>
  </>;
}

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Pledge = { id:string; donor_name:string; amount:number; currency_code:string; status:string; due_on:string|null };
type Donation = { id:string; receipt_number:string|null; donor_name:string|null; amount:number; currency_code:string; donated_at:string };
type Allocation = { id:string; pledge_id:string; donation_id:string; amount:number; allocated_at:string; donations?:{receipt_number:string|null;donor_name:string|null} };

export default function PledgePaymentAllocation({churchId}:{churchId:string|null}) {
 const [pledges,setPledges]=useState<Pledge[]>([]);
 const [donations,setDonations]=useState<Donation[]>([]);
 const [allocations,setAllocations]=useState<Allocation[]>([]);
 const [pledgeId,setPledgeId]=useState("");
 const [donationId,setDonationId]=useState("");
 const [amount,setAmount]=useState("");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [canAllocate,setCanAllocate]=useState(false);
 useEffect(()=>{
  let alive=true;const client=supabase;
  if(!client||!churchId){setCanAllocate(false);return ()=>{alive=false;};}
  void client.rpc("can_church_action",{p_church_id:churchId,p_module_key:"donations",p_action_key:"edit"}).then(({data,error})=>{if(alive)setCanAllocate(!error&&data===true);});
  return ()=>{alive=false;};
 },[churchId]);

 async function load(){
  if(!supabase||!churchId){setLoading(false);return;}
  setLoading(true);
  const [p,d,a]=await Promise.all([
   supabase.from("donation_pledges").select("id,donor_name,amount,currency_code,status,due_on").eq("church_id",churchId).neq("status","cancelled").order("created_at",{ascending:false}).limit(250),
   supabase.from("donations").select("id,receipt_number,donor_name,amount,currency_code,donated_at").eq("church_id",churchId).eq("status","posted").order("donated_at",{ascending:false}).limit(250),
   supabase.from("donation_pledge_allocations").select("id,pledge_id,donation_id,amount,allocated_at,donations(receipt_number,donor_name)").eq("church_id",churchId).order("allocated_at",{ascending:false}).limit(250)
  ]);
  if(p.error||d.error||a.error)setMessage("Unable to load pledge payment records: "+(p.error??d.error??a.error)!.message);
  setPledges((p.data??[]) as Pledge[]);setDonations((d.data??[]) as Donation[]);setAllocations((a.data??[]).map((row)=>{const raw=row as unknown as Record<string,unknown>;const related=raw.donations;const donation=Array.isArray(related)?related[0]:related;return {...raw,donations:donation??undefined} as unknown as Allocation;}));
  setLoading(false);
 }
 useEffect(()=>{void load();},[churchId]);
 const allocatedByPledge=useMemo(()=>allocations.reduce<Record<string,number>>((acc,row)=>{acc[row.pledge_id]=(acc[row.pledge_id]??0)+Number(row.amount);return acc;},{}),[allocations]);
 const selectedPledge=pledges.find(p=>p.id===pledgeId);
 const selectedDonation=donations.find(d=>d.id===donationId);
 const pledgeOutstanding=selectedPledge?Math.max(0,Number(selectedPledge.amount)-(allocatedByPledge[selectedPledge.id]??0)):0;
 const donationAllocated=selectedDonation?allocations.filter(a=>a.donation_id===selectedDonation.id).reduce((sum,a)=>sum+Number(a.amount),0):0;
 const donationOutstanding=selectedDonation?Math.max(0,Number(selectedDonation.amount)-donationAllocated):0;
 const compatibleDonations=donations.filter(d=>!selectedPledge||d.currency_code===selectedPledge.currency_code);
 async function allocate(){
  if(!supabase||!selectedPledge||!selectedDonation||!canAllocate)return;
  const value=Number(amount);
  if(!Number.isFinite(value)||value<=0){setMessage("Enter a valid allocation amount.");return;}
  if(selectedPledge.currency_code!==selectedDonation.currency_code){setMessage("Donation and pledge currencies must match.");return;}
  if(value>pledgeOutstanding||value>donationOutstanding){setMessage("Allocation cannot exceed the outstanding pledge or receipt balance.");return;}
  setBusy(true);setMessage("");
  const {error}=await supabase.rpc("allocate_donation_to_pledge",{p_pledge_id:pledgeId,p_donation_id:donationId,p_amount:value});
  setBusy(false);
  if(error){setMessage("Unable to allocate donation: "+error.message);return;}
  setMessage("Donation payment allocated successfully.");setAmount("");await load();
 }
 return <section className="panel" style={{marginTop:20}}>
  <div className="page-intro"><div><h3>Donation Pledge Payments</h3><p>Allocate posted donation receipts to pledges. Outstanding balances and pledge status are calculated automatically.</p></div></div>
  {message&&<p role="status" className="notice">{message}</p>}
  {canAllocate&&<div className="form-grid">">
   <label>Donation pledge<select value={pledgeId} onChange={e=>setPledgeId(e.target.value)}><option value="">Select a pledge</option>{pledges.map(p=><option key={p.id} value={p.id}>{p.donor_name} — {Number(p.amount).toFixed(2)} {p.currency_code} ({p.status})</option>)}</select></label>
   <label>Posted donation receipt<select value={donationId} onChange={e=>setDonationId(e.target.value)}><option value="">Select a posted receipt</option>{compatibleDonations.map(d=><option key={d.id} value={d.id}>{d.receipt_number??d.id.slice(0,8)} — {d.donor_name??"Donor"} — {Number(d.amount).toFixed(2)} {d.currency_code}</option>)}</select></label>
   <label>Allocation amount<input type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></label>
  </div>
  {(selectedPledge||selectedDonation)&&<div className="quick-grid" style={{marginTop:12}}>
   {selectedPledge&&<div className="quick-card"><b>Pledge outstanding</b><strong>{pledgeOutstanding.toFixed(2)} {selectedPledge.currency_code}</strong></div>}
   {selectedDonation&&<div className="quick-card"><b>Receipt unallocated</b><strong>{donationOutstanding.toFixed(2)} {selectedDonation.currency_code}</strong></div>}
  </div>}
  <button className="primary-button" type="button" disabled={busy||!selectedPledge||!selectedDonation||!amount} onClick={()=>void allocate()}>{busy?"Allocating…":"Allocate payment"}</button>
  <h4 style={{marginTop:24}}>Recent allocations</h4>
</div>}{!canAllocate&&<p className="notice">You do not have permission to allocate donation payments.</p>}
  {loading?<p>Loading payment allocations…</p>:allocations.length===0?<p>No pledge payments have been allocated yet.</p>:<div className="table-wrap"><table><thead><tr><th>Date</th><th>Receipt</th><th>Donor</th><th>Amount</th></tr></thead><tbody>{allocations.map(a=><tr key={a.id}><td>{new Date(a.allocated_at).toLocaleDateString()}</td><td>{a.donations?.receipt_number??a.donation_id.slice(0,8)}</td><td>{a.donations?.donor_name??"—"}</td><td>{Number(a.amount).toFixed(2)}</td></tr>)}</tbody></table></div>}
 </section>;
}

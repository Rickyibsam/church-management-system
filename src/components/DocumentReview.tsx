import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, FileCheck2, FileText, XCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

type DocumentRow = { id:string; certificate_id:string; document_code:string; original_file_name:string; storage_path:string; verification_status:string; reviewer_notes:string|null; certificates?:{registration_number:string;primary_person_name:string}|null };

export default function DocumentReview({churchId}:{churchId:string|null}) {
  const [rows,setRows]=useState<DocumentRow[]>([]);
  const [message,setMessage]=useState("");
  const [notes,setNotes]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(true);
  const [canView,setCanView]=useState(false);
  const [canReview,setCanReview]=useState(false);
  useEffect(()=>{
    let alive=true;const client=supabase;
    if(!client||!churchId){setCanView(false);setCanReview(false);return ()=>{alive=false;};}
    void Promise.all(["view","approve"].map(async action=>{
      const {data,error}=await client.rpc("can_church_action",{p_church_id:churchId,p_module_key:"certificate_documents",p_action_key:action});
      return [action,!error&&data===true] as const;
    })).then(results=>{
      if(!alive)return;
      const permissions=Object.fromEntries(results) as {view:boolean;approve:boolean};
      setCanView(permissions.view);setCanReview(permissions.approve);
    });
    return ()=>{alive=false;};
  },[churchId]);
  async function load(){
    if(!supabase||!churchId){setRows([]);setLoading(false);return;}
    const {data,error}=await supabase.from("certificate_attachments").select("id,certificate_id,document_code,original_file_name,storage_path,verification_status,reviewer_notes,certificates(registration_number,primary_person_name)").eq("church_id",churchId).order("uploaded_at",{ascending:false});
    if(error)setMessage(error.message);
    else setRows((data??[]) as unknown as DocumentRow[]);
    setLoading(false);
  }
  useEffect(()=>{void load();},[churchId]);
  async function review(id:string,status:"verified"|"rejected"){
    if(!supabase||!canReview)return;
    const reviewerNote=(notes[id]??"").trim();
    if(status==="rejected"&&!reviewerNote){setMessage("A reviewer note is required when rejecting a document.");return;}
    const {error}=await supabase.rpc("review_certificate_document",{p_attachment_id:id,p_new_status:status,p_reviewer_notes:reviewerNote||null});
    if(error){setMessage(error.message);return;}
    setMessage("Document marked "+status+".");
    await load();
  }
  async function openFile(path:string){
    if(!supabase||!canView)return;
    const {data,error}=await supabase.storage.from("church-private-documents").createSignedUrl(path,60);
    if(error){setMessage(error.message);return;}
    window.open(data.signedUrl,"_blank","noopener,noreferrer");
  }
  return <>
    <div className="page-intro"><div><h2>Document Verification</h2><p>Review private identity and supporting documents before certificates are approved.</p></div></div>
    {message&&<div className="notice">{message}</div>}
    <div className="panel">{loading?<div className="empty-state">Loading documents...</div>:rows.length?<div className="review-list">{rows.map(row=><div className="review-card" key={row.id}><div className="review-icon"><FileText/></div><div className="review-main"><b>{row.original_file_name}</b><small>{row.document_code} · {row.certificates?.registration_number??"Registration"} · {row.certificates?.primary_person_name??""}</small><span className={"review-status "+row.verification_status}>{row.verification_status}</span>{canReview&&<input className="field" placeholder="Reviewer note (required when rejecting)" aria-label={"Reviewer note for "+row.original_file_name} value={notes[row.id]??""} onChange={e=>setNotes(old=>({...old,[row.id]:e.target.value}))}/>}</div><div className="review-actions">{canView&&<button className="secondary-button" onClick={()=>void openFile(row.storage_path)}><ExternalLink size={14}/> Open</button>}{canReview&&<><button className="secondary-button" onClick={()=>void review(row.id,"verified")}><CheckCircle2 size={14}/> Verify</button><button className="danger-button" disabled={!(notes[row.id]??"").trim()} onClick={()=>void review(row.id,"rejected")}><XCircle size={14}/> Reject</button></>}</div></div>)}</div>:<div className="empty-state"><FileCheck2/><b>No documents to review</b><small>Uploaded registration documents will appear here.</small></div>}</div>
  </>;
}

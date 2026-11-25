import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, FileText, Upload } from "lucide-react";
import { supabase } from "../lib/supabase";

type MemberDocument={id:string;document_type:string;file_name:string;storage_path:string;mime_type:string|null;file_size_bytes:number|null;verified_at:string|null;created_at:string};
export default function MemberDocuments({churchId,memberId}:{churchId:string;memberId:string}){
 const [rows,setRows]=useState<MemberDocument[]>([]);
 const [documentType,setDocumentType]=useState("identity");
 const [file,setFile]=useState<File|null>(null);
 const [message,setMessage]=useState("");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [canUpload,setCanUpload]=useState(false);
 const [canVerify,setCanVerify]=useState(false);
 useEffect(()=>{
  let alive=true;const client=supabase;
  if(!client){setCanUpload(false);setCanVerify(false);return ()=>{alive=false;};}
  void Promise.all(["create","edit"].map(async action=>{
   const {data,error}=await client.rpc("can_church_action",{p_church_id:churchId,p_module_key:"member_documents",p_action_key:action});
   return [action,!error&&data===true] as const;
  })).then(results=>{
   if(!alive)return;
   const permissions=Object.fromEntries(results) as {create:boolean;edit:boolean};
   setCanUpload(permissions.create);setCanVerify(permissions.edit);
  });
  return ()=>{alive=false;};
 },[churchId]);
 async function load(){
  if(!supabase){setLoading(false);return;}
  setLoading(true);
  const {data,error}=await supabase.from("member_documents").select("id,document_type,file_name,storage_path,mime_type,file_size_bytes,verified_at,created_at").eq("church_id",churchId).eq("member_id",memberId).order("created_at",{ascending:false});
  if(error)setMessage("Unable to load member documents: "+error.message);else setRows((data??[]) as MemberDocument[]);
  setLoading(false);
 }
 useEffect(()=>{void load();},[churchId,memberId]);
 async function upload(){
  if(!supabase||!file||!canUpload)return;
  if(file.size>10*1024*1024){setMessage("File size must not exceed 10 MB.");return;}
  if(!["application/pdf","image/jpeg","image/png"].includes(file.type)){setMessage("Only PDF, JPG and PNG files are accepted.");return;}
  setSaving(true);setMessage("");
  const {data:userData}=await supabase.auth.getUser();
  const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
  const path=churchId+"/"+memberId+"/member-documents/"+crypto.randomUUID()+"-"+safeName;
  const {error:uploadError}=await supabase.storage.from("church-private-documents").upload(path,file,{contentType:file.type,upsert:false});
  if(uploadError){setSaving(false);setMessage("Unable to upload document: "+uploadError.message);return;}
  const {error}=await supabase.from("member_documents").insert({church_id:churchId,member_id:memberId,document_type:documentType,file_name:file.name,storage_path:path,mime_type:file.type,file_size_bytes:file.size,created_by:userData.user?.id??null});
  setSaving(false);
  if(error){setMessage("File uploaded but document details could not be saved: "+error.message);return;}
  setFile(null);setMessage("Member document uploaded.");await load();
 }
 async function open(path:string){
  if(!supabase)return;
  const {data,error}=await supabase.storage.from("church-private-documents").createSignedUrl(path,60);
  if(error)setMessage("Unable to open document: "+error.message);else window.open(data.signedUrl,"_blank","noopener,noreferrer");
 }
 async function verify(row:MemberDocument){
  if(!supabase||!canVerify)return;
  const {data:userData}=await supabase.auth.getUser();
  const {error}=await supabase.from("member_documents").update({verified_at:new Date().toISOString(),verified_by:userData.user?.id??null}).eq("id",row.id).eq("church_id",churchId);
  if(error)setMessage("Unable to verify document: "+error.message);else{setMessage("Document verified.");await load();}
 }
 return <div className="panel member-documents"><div className="panel-heading"><div><h3>Member documents</h3><p>Private identity and supporting files. Access is limited by church permissions.</p></div></div>
  {canUpload&&<><div className="form-grid"><div><label>Document type</label><select className="field" value={documentType} onChange={e=>setDocumentType(e.target.value)}>{["identity","birth_record","membership_form","address_proof","consent","other"].map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select></div><div><label>Choose PDF or image (max 10 MB)</label><input className="field" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>setFile(e.target.files?.[0]??null)}/></div></div>
  <div className="modal-actions"><button className="primary-button" disabled={!file||saving} onClick={()=>void upload()}><Upload size={15}/>{saving?"Uploading...":"Upload document"}</button></div></>}
  {message&&<div className="notice">{message}</div>}
  {loading?<div className="empty-state">Loading member documents...</div>:rows.length?<div className="review-list">{rows.map(row=><div className="review-card" key={row.id}><div className="review-icon"><FileText/></div><div className="review-main"><b>{row.file_name}</b><small>{row.document_type.replaceAll("_"," ")} · {row.file_size_bytes?Math.round(row.file_size_bytes/1024)+" KB":"File"}</small><span className={"review-status "+(row.verified_at?"verified":"pending")}>{row.verified_at?"Verified":"Not verified"}</span></div><div className="review-actions"><button className="secondary-button" onClick={()=>void open(row.storage_path)}><ExternalLink size={14}/> Open</button>{!row.verified_at&&canVerify&&<button className="secondary-button" onClick={()=>void verify(row)}><CheckCircle2 size={14}/> Verify</button>}</div></div>)}</div>:<div className="empty-state"><FileText/><b>No documents uploaded</b><small>Upload member identity or supporting documents.</small></div>}
 </div>;
}

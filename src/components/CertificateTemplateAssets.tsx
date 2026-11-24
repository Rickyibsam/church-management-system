import { useEffect, useState } from "react";
import { ImagePlus, PenLine, Stamp } from "lucide-react";
import { supabase } from "../lib/supabase";
type Template={id:string;name:string;certificate_type:string;pastor_signature_path:string|null;seal_path:string|null;background_path:string|null};
type AssetKey="pastor_signature_path"|"seal_path"|"background_path";
export default function CertificateTemplateAssets({churchId}:{churchId:string|null}){
 const [templates,setTemplates]=useState<Template[]>([]);
 const [selectedId,setSelectedId]=useState("");
 const [assetType,setAssetType]=useState<AssetKey>("pastor_signature_path");
 const [file,setFile]=useState<File|null>(null);
 const [message,setMessage]=useState("");
 const [saving,setSaving]=useState(false);
 async function load(){
  if(!supabase||!churchId){setTemplates([]);return;}
  const {data,error}=await supabase.from("certificate_templates").select("id,name,certificate_type,pastor_signature_path,seal_path,background_path").eq("church_id",churchId).eq("is_active",true).order("name");
  if(error)setMessage("Unable to load certificate templates: "+error.message);
  else{const items=(data??[]) as Template[];setTemplates(items);if(!items.some(item=>item.id===selectedId))setSelectedId(items[0]?.id??"");}
 }
 useEffect(()=>{void load();},[churchId]);
 async function upload(){
  if(!supabase||!churchId||!selectedId||!file)return;
  if(file.size>5*1024*1024){setMessage("Template image must not exceed 5 MB.");return;}
  if(!["image/png","image/jpeg"].includes(file.type)){setMessage("Only PNG and JPG images are accepted.");return;}
  setSaving(true);setMessage("");
  const extension=file.type==="image/png"?"png":"jpg";
  const path=churchId+"/templates/"+selectedId+"/"+assetType+"-"+Date.now()+"."+extension;
  const {error:uploadError}=await supabase.storage.from("church-private-documents").upload(path,file,{contentType:file.type,upsert:true});
  if(uploadError){setSaving(false);setMessage("Unable to upload template asset: "+uploadError.message);return;}
  const {error}=await supabase.from("certificate_templates").update({[assetType]:path}).eq("id",selectedId).eq("church_id",churchId);
  setSaving(false);
  if(error){setMessage("Asset uploaded but template could not be updated: "+error.message);return;}
  setFile(null);setMessage("Template asset saved.");await load();
 }
 const current=templates.find(item=>item.id===selectedId);
 return <div className="panel"><div className="panel-heading"><div><h3>Template signature, seal & background</h3><p>Upload private PNG/JPG assets for the selected certificate template.</p></div><ImagePlus size={20}/></div>
  <div className="form-grid"><div><label>Certificate template</label><select className="field" value={selectedId} onChange={e=>setSelectedId(e.target.value)}><option value="">Select template</option>{templates.map(item=><option key={item.id} value={item.id}>{item.name} · {item.certificate_type}</option>)}</select></div><div><label>Asset type</label><select className="field" value={assetType} onChange={e=>setAssetType(e.target.value as AssetKey)}><option value="pastor_signature_path">Pastor signature</option><option value="seal_path">Church seal</option><option value="background_path">Certificate background</option></select></div><div className="form-full"><label>Choose image (PNG/JPG, max 5 MB)</label><input className="field" type="file" accept=".png,.jpg,.jpeg" onChange={e=>setFile(e.target.files?.[0]??null)}/></div></div>
  <div className="modal-actions"><button className="primary-button" disabled={!file||!selectedId||saving} onClick={()=>void upload()}>{saving?"Uploading...":"Upload asset"}</button></div>
  {current&&<div className="template-asset-status"><span><PenLine size={14}/> Signature: {current.pastor_signature_path?"Uploaded":"Not uploaded"}</span><span><Stamp size={14}/> Seal: {current.seal_path?"Uploaded":"Not uploaded"}</span><span><ImagePlus size={14}/> Background: {current.background_path?"Uploaded":"Not uploaded"}</span></div>}
  {message&&<div className="notice">{message}</div>}
  {!templates.length&&<div className="empty-state"><b>No active templates</b><small>Create a certificate template above, then upload its signature and seal.</small></div>}
 </div>;
}

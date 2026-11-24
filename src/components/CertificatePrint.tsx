import { useEffect, useState } from "react";
import * as QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { Printer, X } from "lucide-react";
import { supabase } from "../lib/supabase";

type CertificateRecord={
 id:string;church_id:string;certificate_type:string;registration_number:string;
 primary_person_name:string;secondary_person_name:string|null;event_date:string|null;
 event_place:string|null;pastor_name:string|null;issued_at:string|null;
 qr_verification_token:string;issued_pdf_path:string|null;status:string;form_data:Record<string,string>|null
};
type ChurchRecord={display_name:string;legal_name:string;address:string|null;phone:string|null;email:string|null;website:string|null;logo_path:string|null;header_text:string|null;footer_text:string|null};
type TemplateRecord={name:string;language_code:string;page_size:string;orientation:string;logo_path:string|null;header_text:string|null;footer_text:string|null;pastor_name:string|null;pastor_signature_path:string|null;seal_path:string|null;background_path:string|null};

export default function CertificatePrint({certificateId,onClose}:{certificateId:string;onClose:()=>void}){
 const [record,setRecord]=useState<CertificateRecord|null>(null);
 const [church,setChurch]=useState<ChurchRecord|null>(null);
 const [template,setTemplate]=useState<TemplateRecord|null>(null);
 const [templateAssets,setTemplateAssets]=useState<{signature:string;seal:string}>({signature:"",seal:""});
 const [qr,setQr]=useState("");
 const [message,setMessage]=useState("Loading certificate...");
 const [savingPdf,setSavingPdf]=useState(false);
 useEffect(()=>{
  let alive=true;
  async function load(){
   if(!supabase)return;
   const {data,error}=await supabase.from("certificates").select("id,church_id,certificate_type,registration_number,primary_person_name,secondary_person_name,event_date,event_place,pastor_name,issued_at,qr_verification_token,issued_pdf_path,status,form_data").eq("id",certificateId).maybeSingle();
   if(error||!data){if(alive)setMessage(error?.message??"Certificate not found.");return;}
   const {data:churchData}=await supabase.from("churches").select("display_name,legal_name,address,phone,email,website,logo_path,header_text,footer_text").eq("id",data.church_id).maybeSingle();
   const {data:templateData}=await supabase.from("certificate_templates").select("name,language_code,page_size,orientation,logo_path,header_text,footer_text,pastor_name,pastor_signature_path,seal_path,background_path").eq("church_id",data.church_id).eq("certificate_type",data.certificate_type).eq("is_active",true).eq("is_default",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(!alive)return;
   setRecord(data as CertificateRecord);setChurch(churchData as ChurchRecord|null);setTemplate(templateData as TemplateRecord|null);
   const url=window.location.origin+"/?verify="+data.qr_verification_token;
   const image=await QRCode.toDataURL(url,{width:180,margin:1,errorCorrectionLevel:"M"});
   if(alive){setQr(image);setMessage("");}
  }
  void load();return()=>{alive=false;};
 },[certificateId]);
 const logo=church?.logo_path&&supabase?supabase.storage.from("church-branding").getPublicUrl(church.logo_path).data.publicUrl:"";
 useEffect(()=>{
  let alive=true;
  async function loadAssets(){
   if(!supabase||!template){setTemplateAssets({signature:"",seal:""});return;}
   const [signature,seal]=await Promise.all([
    template.pastor_signature_path?supabase.storage.from("church-private-documents").createSignedUrl(template.pastor_signature_path,60):Promise.resolve({data:null,error:null}),
    template.seal_path?supabase.storage.from("church-private-documents").createSignedUrl(template.seal_path,60):Promise.resolve({data:null,error:null})
   ]);
   if(alive)setTemplateAssets({signature:signature.data?.signedUrl??"",seal:seal.data?.signedUrl??""});
  }
  void loadAssets();return()=>{alive=false;};
 },[template]);

 async function archivePdf(){
  if(!supabase||!record||record.status!=="issued")return;
  setSavingPdf(true);setMessage("");
  try{
   const pageSize=(template?.page_size??"A4").toLowerCase();const orientation=template?.orientation==="portrait"?"portrait":"landscape";const pageWidth=pageSize==="letter"?(orientation==="portrait"?216:279):(orientation==="portrait"?210:297);const pageHeight=pageSize==="letter"?(orientation==="portrait"?279:216):(orientation==="portrait"?297:210);const doc=new jsPDF({orientation,unit:"mm",format:pageSize==="letter"?"letter":"a4"});
   doc.setDrawColor(180,139,69);doc.setLineWidth(1.5);doc.rect(8,8,pageWidth-16,pageHeight-16);doc.setLineWidth(.5);doc.rect(11,11,pageWidth-22,pageHeight-22);
   doc.setTextColor(31,53,82);doc.setFont("helvetica","bold");doc.setFontSize(18);doc.text(church?.display_name??"Church",pageWidth/2,27,{align:"center"});
   if(template?.header_text||church?.header_text){doc.setFont("helvetica","normal");doc.setFontSize(9);doc.text(template?.header_text||church?.header_text||"",pageWidth/2,34,{align:"center",maxWidth:pageWidth-65});}
   if(logo){try{const response=await fetch(logo);const blob=await response.blob();const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("Unable to read church logo."));reader.readAsDataURL(blob);});doc.addImage(dataUrl, blob.type==="image/jpeg"?"JPEG":"PNG", 20, 16, 24, 24);}catch{/* The certificate remains printable if the optional logo cannot be embedded. */}}
   doc.setDrawColor(180,139,69);doc.line(25,43,pageWidth-25,43);
   doc.setTextColor(150,111,49);doc.setFont("helvetica","bold");doc.setFontSize(10);doc.text("OFFICIAL CHURCH RECORD",pageWidth/2,55,{align:"center"});
   doc.setTextColor(31,53,82);doc.setFontSize(22);doc.text((record.certificate_type.replaceAll("_"," ")+" CERTIFICATE").toUpperCase(),pageWidth/2,68,{align:"center"});
   doc.setFont("helvetica","normal");doc.setFontSize(11);doc.setTextColor(90,105,125);doc.text("This is to certify that the church record below has been registered in the official church register.",pageWidth/2,81,{align:"center",maxWidth:pageWidth-75});
   doc.setFont("helvetica","bold");doc.setFontSize(24);doc.setTextColor(31,53,82);doc.text(record.primary_person_name,pageWidth/2,103,{align:"center",maxWidth:pageWidth-85});
   if(record.secondary_person_name){doc.setFontSize(14);doc.text("and "+record.secondary_person_name,pageWidth/2,114,{align:"center",maxWidth:pageWidth-95});}
   doc.setFont("helvetica","normal");doc.setFontSize(11);doc.setTextColor(80,95,115);
   doc.text("Record date: "+(record.event_date??"—"),pageWidth/2,129,{align:"center"});
   if(record.event_place)doc.text("Place: "+record.event_place,pageWidth/2,137,{align:"center"});
   if(record.form_data?.father_name)doc.text("Father: "+record.form_data.father_name,pageWidth/2,143,{align:"center"});
   if(record.form_data?.mother_name)doc.text("Mother: "+record.form_data.mother_name,pageWidth/2,149,{align:"center"});
   if(record.form_data?.witness_details)doc.text("Witnesses: "+record.form_data.witness_details,pageWidth/2,155,{align:"center",maxWidth:210});
   doc.setFont("helvetica","bold");doc.setFontSize(12);doc.setTextColor(150,111,49);doc.text("Registration No. "+record.registration_number,pageWidth/2,163,{align:"center"});
   if(qr)doc.addImage(qr,"PNG",pageWidth-53,pageHeight-45,25,25);
   doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(90,105,125);doc.text(template?.pastor_name||record.pastor_name||"Authorized Pastor",55,pageHeight-36,{align:"center"});doc.text("Pastor / Authorized Officer",55,pageHeight-30,{align:"center"});doc.text("Church Seal",pageWidth-90,pageHeight-36,{align:"center"});
   const imageData=async(url:string)=>{const response=await fetch(url);const blob=await response.blob();const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("Unable to read template image."));reader.readAsDataURL(blob);});return {dataUrl,format:blob.type==="image/jpeg"?"JPEG":"PNG"};};
   if(templateAssets.signature){try{const asset=await imageData(templateAssets.signature);doc.addImage(asset.dataUrl,asset.format,35,pageHeight-40,40,16);}catch{/* Optional signature image */}}
   if(templateAssets.seal){try{const asset=await imageData(templateAssets.seal);doc.addImage(asset.dataUrl,asset.format,pageWidth-107,pageHeight-42,28,28);}catch{/* Optional seal image */}}
   doc.setDrawColor(180,139,69);doc.line(25,pageHeight-20,pageWidth-25,pageHeight-20);
   const footer=template?.footer_text||church?.footer_text||[church?.phone,church?.email,church?.website].filter(Boolean).join(" · ");
   if(footer){doc.setFontSize(8);doc.text(footer,pageWidth/2,pageHeight-14,{align:"center",maxWidth:pageWidth-55});}
   const blob=doc.output("blob");
   const path=record.church_id+"/"+record.id+"/issued-certificate.pdf";
   const {error:uploadError}=await supabase.storage.from("church-private-documents").upload(path,blob,{contentType:"application/pdf",upsert:true});
   if(uploadError)throw uploadError;
   const {error:updateError}=await supabase.from("certificates").update({issued_pdf_path:path}).eq("id",record.id).eq("church_id",record.church_id);
   if(updateError)throw updateError;
   setRecord(old=>old?{...old,issued_pdf_path:path}:old);setMessage("Issued certificate PDF archived securely.");
  }catch(error){setMessage("Unable to archive PDF: "+(error instanceof Error?error.message:"Unknown error"));}
  finally{setSavingPdf(false);}
 }
 async function openArchivedPdf(){
  if(!supabase||!record?.issued_pdf_path)return;
  const {data,error}=await supabase.storage.from("church-private-documents").createSignedUrl(record.issued_pdf_path,60);
  if(error){setMessage("Unable to open archived PDF: "+error.message);return;}
  window.open(data.signedUrl,"_blank","noopener,noreferrer");
 }

 return <div className="certificate-print-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <div className="certificate-print-dialog"><div className="print-toolbar"><b>Certificate preview</b><div><button className="secondary-button" onClick={()=>window.print()} disabled={!record||record.status!=="issued"}><Printer size={15}/> Print</button>{record?.status==="issued"&&<><button className="secondary-button" onClick={()=>void archivePdf()} disabled={savingPdf}>{savingPdf?"Archiving...":"Generate / Archive PDF"}</button>{record.issued_pdf_path&&<button className="secondary-button" onClick={()=>void openArchivedPdf()}>Open archived PDF</button>}</>}<button className="icon-button" onClick={onClose}><X/></button></div></div>
   {!record?<div className="empty-state">{message||"Loading certificate..."}</div>:church?<>{message&&<div className="notice">{message}</div>}<div className="print-sheet">
    <div className="print-border"><div className="print-brand">{logo&&<img src={logo} alt="Church logo"/>}<div><h2>{church.display_name}</h2>{(template?.header_text||church.header_text)&&<p>{template?.header_text||church.header_text}</p>}{church.address&&<small>{church.address}</small>}</div></div>
     <div className="print-rule"/>
     <div className="print-kicker">OFFICIAL CHURCH RECORD</div>
     <h1>{record.certificate_type.replaceAll("_"," ").toUpperCase()} CERTIFICATE</h1>
     <p className="print-intro">This is to certify that the church record below has been registered in the official church register.</p>
     <div className="print-person">{record.primary_person_name}</div>
     {record.secondary_person_name&&<div className="print-secondary">and {record.secondary_person_name}</div>}
     <p className="print-detail">Record date: <b>{record.event_date??"—"}</b></p>
     {record.event_place&&<p className="print-detail">Place: <b>{record.event_place}</b></p>}{record.form_data?.father_name&&<p className="print-detail">Father: <b>{record.form_data.father_name}</b></p>}{record.form_data?.mother_name&&<p className="print-detail">Mother: <b>{record.form_data.mother_name}</b></p>}{record.form_data?.witness_details&&<p className="print-detail">Witnesses: <b>{record.form_data.witness_details}</b></p>}
     <div className="print-number">Registration No. {record.registration_number}</div>
     <div className="print-bottom"><div className="print-sign">{templateAssets.signature?<img src={templateAssets.signature} alt="Pastor signature" style={{maxWidth:"120px",maxHeight:"42px",objectFit:"contain"}}/>:<div className="sign-line"/>}<b>{template?.pastor_name||record.pastor_name||"Authorized Pastor"}</b><small>Pastor / Authorized Officer</small></div><div className="print-qr">{qr&&<img src={qr} alt="Certificate verification QR code"/>}<small>Scan to verify this issued record</small></div><div className="print-sign">{templateAssets.seal?<img src={templateAssets.seal} alt="Church seal" style={{maxWidth:"85px",maxHeight:"65px",objectFit:"contain"}}/>:<div className="sign-line"/>}<b>Church Seal</b><small>Official stamp</small></div></div>
     <div className="print-rule"/>
     <div className="print-footer">{template?.footer_text||church.footer_text||[church.phone,church.email,church.website].filter(Boolean).join(" · ")}</div>
     <div className="print-issued">Issued {record.issued_at?new Date(record.issued_at).toLocaleDateString():""} · {church.legal_name}</div>
    </div>
   </div>:null}
  </div>
 </div>;
}

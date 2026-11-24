import { useEffect, useState } from "react";
import * as QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { Printer, X } from "lucide-react";
import { supabase } from "../lib/supabase";

type CertificateRecord={
 id:string;church_id:string;certificate_type:string;registration_number:string;
 primary_person_name:string;secondary_person_name:string|null;event_date:string|null;
 event_place:string|null;pastor_name:string|null;issued_at:string|null;
 qr_verification_token:string;issued_pdf_path:string|null;status:string
};
type ChurchRecord={display_name:string;legal_name:string;address:string|null;phone:string|null;email:string|null;website:string|null;logo_path:string|null;header_text:string|null;footer_text:string|null};

export default function CertificatePrint({certificateId,onClose}:{certificateId:string;onClose:()=>void}){
 const [record,setRecord]=useState<CertificateRecord|null>(null);
 const [church,setChurch]=useState<ChurchRecord|null>(null);
 const [qr,setQr]=useState("");
 const [message,setMessage]=useState("Loading certificate...");
 const [savingPdf,setSavingPdf]=useState(false);
 useEffect(()=>{
  let alive=true;
  async function load(){
   if(!supabase)return;
   const {data,error}=await supabase.from("certificates").select("id,church_id,certificate_type,registration_number,primary_person_name,secondary_person_name,event_date,event_place,pastor_name,issued_at,qr_verification_token,issued_pdf_path,status").eq("id",certificateId).maybeSingle();
   if(error||!data){if(alive)setMessage(error?.message??"Certificate not found.");return;}
   const {data:churchData}=await supabase.from("churches").select("display_name,legal_name,address,phone,email,website,logo_path,header_text,footer_text").eq("id",data.church_id).maybeSingle();
   if(!alive)return;
   setRecord(data as CertificateRecord);setChurch(churchData as ChurchRecord|null);
   const url=window.location.origin+"/?verify="+data.qr_verification_token;
   const image=await QRCode.toDataURL(url,{width:180,margin:1,errorCorrectionLevel:"M"});
   if(alive){setQr(image);setMessage("");}
  }
  void load();return()=>{alive=false;};
 },[certificateId]);
 const logo=church?.logo_path&&supabase?supabase.storage.from("church-branding").getPublicUrl(church.logo_path).data.publicUrl:"";
 async function archivePdf(){
  if(!supabase||!record||record.status!=="issued")return;
  setSavingPdf(true);setMessage("");
  try{
   const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
   doc.setDrawColor(180,139,69);doc.setLineWidth(1.5);doc.rect(8,8,281,194);doc.setLineWidth(.5);doc.rect(11,11,275,188);
   doc.setTextColor(31,53,82);doc.setFont("helvetica","bold");doc.setFontSize(18);doc.text(church?.display_name??"Church",148.5,27,{align:"center"});
   if(church?.header_text){doc.setFont("helvetica","normal");doc.setFontSize(9);doc.text(church.header_text,148.5,34,{align:"center",maxWidth:230});}
   if(logo){try{const response=await fetch(logo);const blob=await response.blob();const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("Unable to read church logo."));reader.readAsDataURL(blob);});doc.addImage(dataUrl, "PNG", 20, 16, 24, 24);}catch{/* The certificate remains printable if the optional logo cannot be embedded. */}}
   doc.setDrawColor(180,139,69);doc.line(25,43,272,43);
   doc.setTextColor(150,111,49);doc.setFont("helvetica","bold");doc.setFontSize(10);doc.text("OFFICIAL CHURCH RECORD",148.5,55,{align:"center"});
   doc.setTextColor(31,53,82);doc.setFontSize(22);doc.text((record.certificate_type.replaceAll("_"," ")+" CERTIFICATE").toUpperCase(),148.5,68,{align:"center"});
   doc.setFont("helvetica","normal");doc.setFontSize(11);doc.setTextColor(90,105,125);doc.text("This is to certify that the church record below has been registered in the official church register.",148.5,81,{align:"center",maxWidth:220});
   doc.setFont("helvetica","bold");doc.setFontSize(24);doc.setTextColor(31,53,82);doc.text(record.primary_person_name,148.5,103,{align:"center",maxWidth:210});
   if(record.secondary_person_name){doc.setFontSize(14);doc.text("and "+record.secondary_person_name,148.5,114,{align:"center",maxWidth:200});}
   doc.setFont("helvetica","normal");doc.setFontSize(11);doc.setTextColor(80,95,115);
   doc.text("Record date: "+(record.event_date??"—"),148.5,129,{align:"center"});
   if(record.event_place)doc.text("Place: "+record.event_place,148.5,137,{align:"center"});
   doc.setFont("helvetica","bold");doc.setFontSize(12);doc.setTextColor(150,111,49);doc.text("Registration No. "+record.registration_number,148.5,151,{align:"center"});
   if(qr)doc.addImage(qr,"PNG",242,157,30,30);
   doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(90,105,125);doc.text(record.pastor_name??"Authorized Pastor",55,174,{align:"center"});doc.text("Pastor / Authorized Officer",55,180,{align:"center"});doc.text("Church Seal",207,174,{align:"center"});
   doc.setDrawColor(180,139,69);doc.line(25,190,272,190);
   const footer=church?.footer_text||[church?.phone,church?.email,church?.website].filter(Boolean).join(" · ");
   if(footer)doc.setFontSize(8),doc.text(footer,148.5,196,{align:"center",maxWidth:240});
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
    <div className="print-border"><div className="print-brand">{logo&&<img src={logo} alt="Church logo"/>}<div><h2>{church.display_name}</h2>{church.header_text&&<p>{church.header_text}</p>}{church.address&&<small>{church.address}</small>}</div></div>
     <div className="print-rule"/>
     <div className="print-kicker">OFFICIAL CHURCH RECORD</div>
     <h1>{record.certificate_type.replaceAll("_"," ").toUpperCase()} CERTIFICATE</h1>
     <p className="print-intro">This is to certify that the church record below has been registered in the official church register.</p>
     <div className="print-person">{record.primary_person_name}</div>
     {record.secondary_person_name&&<div className="print-secondary">and {record.secondary_person_name}</div>}
     <p className="print-detail">Record date: <b>{record.event_date??"—"}</b></p>
     {record.event_place&&<p className="print-detail">Place: <b>{record.event_place}</b></p>}
     <div className="print-number">Registration No. {record.registration_number}</div>
     <div className="print-bottom"><div className="print-sign"><div className="sign-line"/><b>{record.pastor_name??"Authorized Pastor"}</b><small>Pastor / Authorized Officer</small></div><div className="print-qr">{qr&&<img src={qr} alt="Certificate verification QR code"/>}<small>Scan to verify this issued record</small></div><div className="print-sign"><div className="sign-line"/><b>Church Seal</b><small>Official stamp</small></div></div>
     <div className="print-rule"/>
     <div className="print-footer">{church.footer_text||[church.phone,church.email,church.website].filter(Boolean).join(" · ")}</div>
     <div className="print-issued">Issued {record.issued_at?new Date(record.issued_at).toLocaleDateString():""} · {church.legal_name}</div>
    </div>
   </div>:null}
  </div>
 </div>;
}

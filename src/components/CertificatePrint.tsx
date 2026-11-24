import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Printer, X } from "lucide-react";
import { supabase } from "../lib/supabase";

type CertificateRecord={
 id:string;church_id:string;certificate_type:string;registration_number:string;
 primary_person_name:string;secondary_person_name:string|null;event_date:string|null;
 event_place:string|null;pastor_name:string|null;issued_at:string|null;
 qr_verification_token:string;issued_pdf_path:string|null
};
type ChurchRecord={display_name:string;legal_name:string;address:string|null;phone:string|null;email:string|null;website:string|null;logo_path:string|null;header_text:string|null;footer_text:string|null};

export default function CertificatePrint({certificateId,onClose}:{certificateId:string;onClose:()=>void}){
 const [record,setRecord]=useState<CertificateRecord|null>(null);
 const [church,setChurch]=useState<ChurchRecord|null>(null);
 const [qr,setQr]=useState("");
 const [message,setMessage]=useState("Loading certificate...");
 useEffect(()=>{
  let alive=true;
  async function load(){
   if(!supabase)return;
   const {data,error}=await supabase.from("certificates").select("id,church_id,certificate_type,registration_number,primary_person_name,secondary_person_name,event_date,event_place,pastor_name,issued_at,qr_verification_token,issued_pdf_path").eq("id",certificateId).maybeSingle();
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
 return <div className="certificate-print-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <div className="certificate-print-dialog"><div className="print-toolbar"><b>Certificate preview</b><div><button className="secondary-button" onClick={()=>window.print()} disabled={!record||record.status==="draft"}><Printer size={15}/> Print / Save PDF</button><button className="icon-button" onClick={onClose}><X/></button></div></div>
   {message?<div className="empty-state">{message}</div>:record&&church?<div className="print-sheet">
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

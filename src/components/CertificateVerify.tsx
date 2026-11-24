import { useEffect, useState } from "react";
import { CheckCircle2, Church, ShieldAlert } from "lucide-react";
import { supabase } from "../lib/supabase";

type Result={church_name:string;certificate_type:string;registration_number:string;issued_at:string;valid:boolean};
export default function CertificateVerify({token}:{token:string}){
 const [result,setResult]=useState<Result|null>(null);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{let alive=true;async function load(){if(!supabase){setLoading(false);return;}const {data,error}=await supabase.rpc("verify_certificate",{p_token:token});if(!alive)return;if(!error&&data&&data.length)setResult(data[0] as Result);setLoading(false);}void load();return()=>{alive=false;};},[token]);
 return <main className="verify-page"><div className="verify-card"><div className="verify-brand"><Church/><b>Church360</b></div>{loading?<p>Checking certificate record...</p>:result?<><div className="verify-success"><CheckCircle2/><span>Issued record found</span></div><h1>Certificate verified</h1><p>This registration number matches an issued church record.</p><dl><dt>Church</dt><dd>{result.church_name}</dd><dt>Record type</dt><dd>{result.certificate_type.replaceAll("_"," ")}</dd><dt>Registration number</dt><dd>{result.registration_number}</dd><dt>Issue date</dt><dd>{new Date(result.issued_at).toLocaleDateString()}</dd></dl></>:<><div className="verify-invalid"><ShieldAlert/><span>Record not verified</span></div><h1>Unable to verify</h1><p>No issued certificate was found for this QR reference. Contact the issuing church for assistance.</p></>}<small>Verification shows limited information only. Personal identity documents and family details are never public.</small></div></main>;
}

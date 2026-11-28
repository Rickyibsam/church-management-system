import { useRef, useState } from "react";
import { Headphones, MessageCircle, Paperclip, Send, Square, X } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function ChurchSupportContact({churchId}:{churchId:string|null}) {
 const [open,setOpen]=useState(false),[message,setMessage]=useState(""),[file,setFile]=useState<File|null>(null),[recording,setRecording]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 const recorder=useRef<MediaRecorder|null>(null),chunks=useRef<Blob[]>([]);
 if(!churchId||!supabase)return null;
 async function startRecording(){
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   const media=new MediaRecorder(stream);recorder.current=media;chunks.current=[];
   media.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data);};
   media.onstop=()=>{const blob=new Blob(chunks.current,{type:media.mimeType||"audio/webm"});setFile(new File([blob],"church-voice-message.webm",{type:blob.type}));stream.getTracks().forEach(t=>t.stop());};
   media.start();setRecording(true);setNotice("Recording voice message… press Stop when finished.");
  }catch{setNotice("Microphone access was not granted. You can attach an audio file instead.");}
 }
 function stopRecording(){recorder.current?.stop();setRecording(false);setNotice("Voice recording ready to send.");}
 async function send(){
  if(!supabase||(!message.trim()&&!file))return;
  setBusy(true);setNotice("");
  try{
   let attachmentPath="";
   if(file){
    const {data:upload,error:uploadError}=await supabase.functions.invoke("support-portal-auth",{body:{action:"create_church_attachment_upload",churchId,fileName:file.name,mimeType:file.type,fileSize:file.size}});
    if(uploadError||upload?.error||!upload?.path||!upload?.token)throw new Error(upload?.error||uploadError?.message||"Could not prepare attachment upload.");
    const {error:storageError}=await supabase.storage.from("support-attachments").uploadToSignedUrl(upload.path,upload.token,file,{contentType:file.type});
    if(storageError)throw new Error(storageError.message);
    attachmentPath=upload.path;
   }
   const {data,error}=await supabase.functions.invoke("support-portal-auth",{body:{action:"send_church_message",churchId,message:message.trim(),messageKind:file?.type.startsWith("audio/")?"voice":"text",attachmentPath,attachmentName:file?.name??"",attachmentMimeType:file?.type??"",attachmentSize:file?.size??0}});
   if(error||data?.error)throw new Error(data?.error||error?.message||"Message could not be sent.");
   setMessage("");setFile(null);setNotice("Message sent to the Support Owner.");
  }catch(e){setNotice(e instanceof Error?e.message:"Message could not be sent.");}
  finally{setBusy(false);}
 }
 return <div className="church-support-widget">
  <button className="church-support-launcher" onClick={()=>setOpen(v=>!v)} aria-label="Contact Support"><MessageCircle size={19}/><span>Support</span></button>
  {open&&<section className="church-support-panel"><header><div><b>Church Support</b><small>Send a message to the system owner</small></div><button className="icon-button" onClick={()=>setOpen(false)} aria-label="Close support"><X size={17}/></button></header>
   <textarea className="field" rows={4} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Write your question or report…"/>
   {file&&<div className="support-selected-file">{file.name} · {(file.size/1024/1024).toFixed(1)} MB <button onClick={()=>setFile(null)}>Remove</button></div>}
   {notice&&<p className="support-contact-notice">{notice}</p>}
   <div className="church-support-actions"><label className="secondary-button compact"><Paperclip size={14}/> Attach<input type="file" hidden accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/mp4,video/webm,audio/webm,audio/ogg,audio/mp4,audio/mpeg" onChange={e=>setFile(e.target.files?.[0]??null)}/></label>
    {!recording?<button className="secondary-button compact" onClick={()=>void startRecording()}><Headphones size={14}/> Voice</button>:<button className="danger-button compact" onClick={stopRecording}><Square size={13}/> Stop</button>}
    <button className="primary-button compact" disabled={busy||(!message.trim()&&!file)} onClick={()=>void send()}>{busy?"Sending…":<><Send size={14}/> Send</>}</button>
   </div>
   <small className="support-file-hint">PDF, Word, image, audio and video attachments · 50 MB maximum per file.</small>
  </section>}
 </div>;
}
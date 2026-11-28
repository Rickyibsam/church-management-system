import { useEffect, useRef, useState } from "react";
import { Headphones, MessageCircle, Paperclip, RefreshCw, Send, Square, X } from "lucide-react";
import { supabase } from "../lib/supabase";

type SupportMessage={id:string;sender_label:string;direction:string;message_kind:string;body:string|null;attachment_name:string|null;attachment_mime_type:string|null;attachment_size_bytes:number|null;attachment_url?:string|null;is_read:boolean;created_at:string};
const accepted="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/mp4,video/webm,audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav,audio/x-wav,audio/aac,audio/x-m4a,audio/m4a";
function normalizedAudioFile(file:File){if(!file.type.toLowerCase().startsWith("audio/"))return file;const raw=file.type.toLowerCase().split(";")[0].trim();const mime=raw==="audio/x-wav"?"audio/wav":raw==="audio/x-m4a"||raw==="audio/m4a"?"audio/mp4":raw;return new File([file],file.name,{type:mime,lastModified:file.lastModified});}
export default function ChurchSupportContact({churchId,fullPage=false}:{churchId:string|null;fullPage?:boolean}) {
 const [open,setOpen]=useState(fullPage),[message,setMessage]=useState(""),[file,setFile]=useState<File|null>(null),[recording,setRecording]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[history,setHistory]=useState<SupportMessage[]>([]),[historyBusy,setHistoryBusy]=useState(false);
 const recorder=useRef<MediaRecorder|null>(null),chunks=useRef<Blob[]>([]);
 async function loadHistory(){
  if(!supabase||!churchId)return;setHistoryBusy(true);
  try{const {data,error}=await supabase.functions.invoke("support-portal-auth",{body:{action:"get_church_messages",churchId}});if(error||data?.error)throw new Error(data?.error||error?.message);setHistory(data?.messages??[]);}
  catch(e){setNotice(e instanceof Error?e.message:"Unable to load support history.");}
  finally{setHistoryBusy(false);}
 }
 useEffect(()=>{if(open){void loadHistory();const timer=window.setInterval(()=>void loadHistory(),20000);return()=>window.clearInterval(timer);}},[open,churchId]);
 if(!churchId||!supabase)return null;
 async function startRecording(){
  try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const media=new MediaRecorder(stream);recorder.current=media;chunks.current=[];
   media.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data);};
   media.onstop=()=>{const detected=media.mimeType.toLowerCase();const type=detected.startsWith("audio/ogg")?"audio/ogg":detected.startsWith("audio/mp4")?"audio/mp4":"audio/webm";const blob=new Blob(chunks.current,{type});const ext=type==="audio/ogg"?"ogg":type==="audio/mp4"?"m4a":"webm";setFile(new File([blob],"church-voice-message."+ext,{type}));stream.getTracks().forEach(t=>t.stop());};
   media.start();setRecording(true);setNotice("Recording voice message… press Stop when finished.");
  }catch{setNotice("Microphone access was not granted. You can attach an audio file instead.");}
 }
 function stopRecording(){recorder.current?.stop();setRecording(false);setNotice("Voice recording ready to send.");}
 async function send(){
  if(!supabase||(!message.trim()&&!file)||busy)return;setBusy(true);setNotice("");
  try{let attachmentPath="";
   if(file){
    const uploadFile=normalizedAudioFile(file);
    const {data:upload,error:uploadError}=await supabase.functions.invoke("support-portal-auth",{body:{action:"create_church_attachment_upload",churchId,fileName:uploadFile.name,mimeType:uploadFile.type,fileSize:uploadFile.size}});
    if(uploadError||upload?.error||!upload?.path||!upload?.token)throw new Error(upload?.error||uploadError?.message||"Could not prepare attachment upload.");
    const {error:storageError}=await supabase.storage.from("support-attachments").uploadToSignedUrl(upload.path,upload.token,uploadFile,{contentType:uploadFile.type});
    if(storageError)throw new Error(storageError.message);attachmentPath=upload.path;
   }
   const {data,error}=await supabase.functions.invoke("support-portal-auth",{body:{action:"send_church_message",churchId,message:message.trim(),messageKind:file?.type.startsWith("audio/")?"voice":"text",attachmentPath,attachmentName:file?normalizedAudioFile(file).name:"",attachmentMimeType:file?normalizedAudioFile(file).type:"",attachmentSize:file?.size??0}});
   if(error||data?.error)throw new Error(data?.error||error?.message||"Message could not be sent.");
   setMessage("");setFile(null);setNotice("Message sent to the Support Owner.");await loadHistory();
  }catch(e){setNotice(e instanceof Error?e.message:"Message could not be sent.");}
  finally{setBusy(false);}
 }
 function renderAttachment(m:SupportMessage){const url=m.attachment_url,mime=m.attachment_mime_type??"";if(!url)return null;
  if(mime.startsWith("audio/"))return <div className="support-audio-attachment"><audio controls preload="metadata" playsInline><source src={url} type={mime}/>Your browser cannot play this audio format.</audio><a className="support-inline-link" href={url} target="_blank" rel="noreferrer" download={m.attachment_name||"support-voice-message"}>Open / download voice message</a></div>;
  if(mime.startsWith("video/"))return <video controls src={url} style={{maxWidth:"100%",maxHeight:180}}/>;
  if(mime.startsWith("image/"))return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={m.attachment_name||"Support attachment"} style={{maxWidth:"100%",maxHeight:160,objectFit:"contain"}}/></a>;
  return <a href={url} target="_blank" rel="noreferrer">Open / download {m.attachment_name||"attachment"}</a>;
 }
 return <div className={"church-support-widget "+(fullPage?"church-support-inbox-page":"")}>
  {!fullPage&&<button className="church-support-launcher" onClick={()=>setOpen(v=>!v)} aria-label="Contact Support"><MessageCircle size={19}/><span>Support</span></button>}
  {open&&<section className="church-support-panel">{fullPage&&<div className="support-page-heading"><div><h2>Support Inbox</h2><p>All messages, replies and attachments in your church conversation.</p></div><button className="secondary-button compact" onClick={()=>void loadHistory()}><RefreshCw size={14}/> Refresh</button></div>}<header><div><b>Church Support</b><small>Conversation history with NOSHAAB TECH Support</small></div>{!fullPage&&<button className="icon-button" onClick={()=>setOpen(false)} aria-label="Close support"><X size={17}/></button>}</header>
   <div className="church-support-history"><div className="church-support-history-head"><b>Message history</b><button className="icon-button" onClick={()=>void loadHistory()} title="Refresh history"><RefreshCw size={15}/></button></div>{historyBusy&&!history.length&&<small>Loading messages…</small>}{history.map(m=><article className={"church-support-message "+(m.direction==="outbound"?"from-support":"from-church")} key={m.id}><div><b>{m.sender_label}</b><small>{new Date(m.created_at).toLocaleString()}</small></div>{m.body&&<p>{m.body}</p>}{m.attachment_name&&<small>{m.attachment_name} · {Math.max(1,Math.round((m.attachment_size_bytes??0)/1024))} KB</small>}{renderAttachment(m)}</article>)}{!history.length&&!historyBusy&&<small>No previous messages. Send your first support request below.</small>}</div>
   <textarea className="field" rows={3} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Write your question or report…"/>
   {file&&<div className="support-selected-file">{file.name} · {(file.size/1024/1024).toFixed(1)} MB <button onClick={()=>setFile(null)}>Remove</button></div>}
   {notice&&<p className="support-contact-notice">{notice}</p>}
   <div className="church-support-actions"><label className="secondary-button compact"><Paperclip size={14}/> Attach<input type="file" hidden accept={accepted} onChange={e=>setFile(e.target.files?.[0]??null)}/></label>
    {!recording?<button className="secondary-button compact" onClick={()=>void startRecording()}><Headphones size={14}/> Voice</button>:<button className="danger-button compact" onClick={stopRecording}><Square size={13}/> Stop</button>}
    <button className="primary-button compact" disabled={busy||(!message.trim()&&!file)} onClick={()=>void send()}>{busy?"Sending…":<><Send size={14}/> Send</>}</button>
   </div><small className="support-file-hint">Text, voice, picture, PDF, Word and video · 50 MB maximum per file. Messages are saved in your church account history.</small>
  </section>}
 </div>;
}

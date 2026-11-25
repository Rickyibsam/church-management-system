import { useEffect, useState } from "react";
import { Bell, CheckCheck, Circle } from "lucide-react";
import { supabase } from "../lib/supabase";
type Notice={id:string;user_id:string|null;title:string;body:string;notification_type:string;read_at:string|null;created_at:string};
export default function NotificationsInbox({churchId}:{churchId:string|null}){
 const [rows,setRows]=useState<Notice[]>([]);
 const [message,setMessage]=useState("");
 const [loading,setLoading]=useState(true);
 const [userId,setUserId]=useState<string|null>(null);
 async function load(){
  if(!supabase||!churchId){setRows([]);setLoading(false);return;}
  const {data:userData,error:userError}=await supabase.auth.getUser();
  if(userError||!userData.user){setRows([]);setLoading(false);return;}
  setUserId(userData.user.id);
  setLoading(true);
  const {data,error}=await supabase.from("notifications").select("id,user_id,title,body,notification_type,read_at,created_at").eq("church_id",churchId).eq("user_id",userData.user.id).order("created_at",{ascending:false}).limit(100);
  if(error)setMessage("Unable to load notifications: "+error.message);else setRows((data??[]) as Notice[]);
  setLoading(false);
 }
 useEffect(()=>{void load();},[churchId]);
 useEffect(()=>{
  if(!supabase||!churchId||!userId)return;
  const client=supabase;
  const channel=client.channel("church-notifications-"+churchId+"-"+userId)
   .on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:"church_id=eq."+churchId},payload=>{
    const incoming=payload.new as Notice;
    if(incoming.user_id===userId){
     setRows(old=>old.some(item=>item.id===incoming.id)?old:[incoming,...old].slice(0,100));
    }
   }).subscribe();
  return()=>{void client.removeChannel(channel);};
 },[churchId,userId]);
 async function markRead(id:string){
  if(!supabase||!userId)return;
  const {error}=await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("id",id).eq("user_id",userId);
  if(error)setMessage("Unable to update notification: "+error.message);else setRows(old=>old.map(item=>item.id===id?{...item,read_at:new Date().toISOString()}:item));
 }
 async function markAllRead(){
  if(!supabase||!userId||!churchId)return;
  const {error}=await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("church_id",churchId).eq("user_id",userId).is("read_at",null);
  if(error)setMessage("Unable to mark notifications as read: "+error.message);else{setRows(old=>old.map(item=>({...item,read_at:item.read_at??new Date().toISOString()})));setMessage("All notifications marked as read.");}
 }
 const unread=rows.filter(item=>!item.read_at).length;
 return <section><div className="page-intro"><div><h2>Notification Inbox</h2><p>Persistent church updates and workflow notifications.</p></div><button className="secondary-button" disabled={!unread} onClick={()=>void markAllRead()}><CheckCheck size={15}/> Mark all read</button></div>
  {message&&<div className="notice">{message}</div>}
  <div className="panel">{loading?<div className="empty-state">Loading notifications...</div>:rows.length?<div className="notification-list">{rows.map(item=><div className={item.read_at?"notification-row":"notification-row unread"} key={item.id}><div className="notification-icon">{item.read_at?<Bell size={16}/>:<Circle size={10} fill="currentColor"/>}</div><div className="notification-main"><b>{item.title}</b><p>{item.body}</p><small>{item.notification_type.replaceAll("_"," ")} · {new Date(item.created_at).toLocaleString()}</small></div>{!item.read_at&&<button className="secondary-button" onClick={()=>void markRead(item.id)}>Mark read</button>}</div>)}</div>:<div className="empty-state"><Bell/><b>No notifications</b><small>New church workflow updates will appear here.</small></div>}</div>
 </section>;
}

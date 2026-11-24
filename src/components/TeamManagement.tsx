import { useEffect, useState } from "react";
import { UserPlus, Users, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";

type TeamRow={id:string;user_id:string;role:string;status:string;profiles?:{display_name:string|null}|null};
const roles=["admin","pastor","accountant","secretary","ministry_leader","staff","volunteer","member"];

export default function TeamManagement({churchId}:{churchId:string|null}){
 const [rows,setRows]=useState<TeamRow[]>([]);
 const [userId,setUserId]=useState("");
 const [role,setRole]=useState("secretary");
 const [show,setShow]=useState(false);
 const [message,setMessage]=useState("");
 const [saving,setSaving]=useState(false);
 async function load(){
  if(!supabase||!churchId){setRows([]);return;}
  const {data,error}=await supabase.from("church_members").select("id,user_id,role,status,profiles(display_name)").eq("church_id",churchId).order("created_at",{ascending:true});
  if(error)setMessage(error.message);else setRows((data??[]) as unknown as TeamRow[]);
 }
 useEffect(()=>{void load();},[churchId]);
 async function add(){
  if(!supabase||!churchId||!userId.trim())return;
  setSaving(true);setMessage("");
  const {error}=await supabase.from("church_members").insert({church_id:churchId,user_id:userId.trim(),role,status:"invited"});
  setSaving(false);
  if(error){setMessage(error.message);return;}
  setUserId("");setShow(false);setMessage("Church access assigned. The user must sign in with this account.");await load();
 }
 async function changeStatus(id:string,status:string){
  if(!supabase)return;
  const {error}=await supabase.from("church_members").update({status}).eq("id",id);
  if(error)setMessage(error.message);else{setMessage("Team access updated.");await load();}
 }
 return <>
  <div className="page-intro"><div><h2>Users & Permissions</h2><p>Manage church staff, ministry leaders and member access by role.</p></div><button className="primary-button" disabled={!churchId} onClick={()=>setShow(true)}><UserPlus size={16}/> Add existing user</button></div>
  {message&&<div className="notice">{message}</div>}
  {show&&<div className="panel form-panel"><p className="muted">The person must already have a Church360 account. Enter their Supabase user ID; email invitations will be added through a secure server function in a later build step.</p><div className="form-grid"><div className="form-full"><label>User ID</label><input className="field" value={userId} onChange={e=>setUserId(e.target.value)} placeholder="UUID from the registered user account"/></div><div><label>Church role</label><select className="field" value={role} onChange={e=>setRole(e.target.value)}>{roles.map(item=><option key={item} value={item}>{item.replaceAll("_"," ")}</option>)}</select></div></div><div className="modal-actions"><button className="secondary-button" onClick={()=>setShow(false)}>Cancel</button><button className="primary-button" disabled={saving||!userId.trim()} onClick={()=>void add()}>{saving?"Adding...":"Assign access"}</button></div></div>}
  <div className="panel">{rows.length?<div className="team-list">{rows.map(row=><div className="team-row" key={row.id}><div className="team-avatar"><Users size={17}/></div><div className="team-main"><b>{row.profiles?.display_name||row.user_id}</b><small>{row.user_id}</small></div><span className="role-pill">{row.role.replaceAll("_"," ")}</span><select className="status-select" value={row.status} onChange={e=>void changeStatus(row.id,e.target.value)}><option value="invited">Invited</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="left">Left</option></select></div>)}</div>:<div className="empty-state"><ShieldCheck/><b>No additional users</b><small>Create accounts first, then assign them to this church.</small></div>}</div>
 </>;
}

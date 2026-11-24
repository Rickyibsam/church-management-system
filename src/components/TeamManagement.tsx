import { useEffect, useState } from "react";
import { UserPlus, Users, ShieldCheck, Settings2 } from "lucide-react";
import { supabase } from "../lib/supabase";

type TeamRow={id:string;user_id:string;role:string;status:string;profiles?:{display_name:string|null}|null};
type Permission={id?:string;church_id:string;church_member_id:string;module_key:string;action_key:string;allowed:boolean};
const roles=["admin","pastor","accountant","finance","secretary","ministry_leader","staff","volunteer","member"];
const modules=[["members","Members"],["families","Families"],["certificates","Certificates"],["certificate_documents","Certificate documents"],["attendance","Attendance"],["services","Services"],["events","Events"],["ministries","Ministries"],["pastoral","Pastoral care"],["accounts","Accounting"],["expenses","Expenses"],["donations","Donations"],["budgets","Budgets"],["assets","Assets"]] as const;
const actions=["view","create","edit","delete"] as const;

export default function TeamManagement({churchId}:{churchId:string|null}){
 const [rows,setRows]=useState<TeamRow[]>([]);
 const [permissions,setPermissions]=useState<Permission[]>([]);
 const [userId,setUserId]=useState("");
 const [role,setRole]=useState("secretary");
 const [show,setShow]=useState(false);
 const [expanded,setExpanded]=useState<string|null>(null);
 const [message,setMessage]=useState("");
 const [saving,setSaving]=useState(false);
 async function load(){
  if(!supabase||!churchId){setRows([]);setPermissions([]);return;}
  const {data,error}=await supabase.from("church_members").select("id,user_id,role,status,profiles(display_name)").eq("church_id",churchId).order("created_at",{ascending:true});
  if(error){setMessage("Unable to load team: "+error.message);return;}
  const team=(data??[]) as unknown as TeamRow[];setRows(team);
  const {data:perms,error:permissionError}=await supabase.from("church_member_permissions").select("id,church_id,church_member_id,module_key,action_key,allowed").eq("church_id",churchId);
  if(permissionError)setMessage("Unable to load custom permissions: "+permissionError.message);
  else setPermissions((perms??[]) as Permission[]);
 }
 useEffect(()=>{void load();},[churchId]);
 async function add(){
  if(!supabase||!churchId||!userId.trim())return;
  setSaving(true);setMessage("");
  const {error}=await supabase.from("church_members").insert({church_id:churchId,user_id:userId.trim(),role,status:"invited"});
  setSaving(false);
  if(error){setMessage("Unable to assign access: "+error.message);return;}
  setUserId("");setShow(false);setMessage("Church access assigned. The user must sign in with this account.");await load();
 }
 async function changeStatus(id:string,status:string){
  if(!supabase)return;
  const {error}=await supabase.from("church_members").update({status}).eq("id",id);
  if(error)setMessage("Unable to update team access: "+error.message);else{setMessage("Team access updated.");await load();}
 }
 function isAllowed(memberId:string,moduleKey:string,actionKey:string){
  return permissions.find(p=>p.church_member_id===memberId&&p.module_key===moduleKey&&p.action_key===actionKey)?.allowed??false;
 }
 async function setPermission(member:TeamRow,moduleKey:string,actionKey:string,allowed:boolean){
  if(!supabase||!churchId)return;
  const existing=permissions.find(p=>p.church_member_id===member.id&&p.module_key===moduleKey&&p.action_key===actionKey);
  const result=existing
   ? await supabase.from("church_member_permissions").update({allowed}).eq("id",existing.id)
   : await supabase.from("church_member_permissions").insert({church_id:churchId,church_member_id:member.id,module_key:moduleKey,action_key:actionKey,allowed});
  if(result.error){setMessage("Unable to save permission: "+result.error.message);return;}
  setPermissions(old=>existing?old.map(p=>p.id===existing.id?{...p,allowed}:p):[...old,{church_id:churchId,church_member_id:member.id,module_key:moduleKey,action_key:actionKey,allowed}]);
  setMessage("Custom permission saved.");
 }
 return <>
  <div className="page-intro"><div><h2>Users & Permissions</h2><p>Manage church team roles and individual module actions.</p></div><button className="primary-button" disabled={!churchId} onClick={()=>setShow(true)}><UserPlus size={16}/> Add existing user</button></div>
  {message&&<div className="notice">{message}</div>}
  {show&&<div className="panel form-panel"><p className="muted">The person must already have a Church360 account. Enter their Supabase user ID; secure email invitations are planned as a separate server-side workflow.</p><div className="form-grid"><div className="form-full"><label>User ID</label><input className="field" value={userId} onChange={e=>setUserId(e.target.value)} placeholder="UUID from the registered user account"/></div><div><label>Church role</label><select className="field" value={role} onChange={e=>setRole(e.target.value)}>{roles.map(item=><option key={item} value={item}>{item.replaceAll("_"," ")}</option>)}</select></div></div><div className="modal-actions"><button className="secondary-button" onClick={()=>setShow(false)}>Cancel</button><button className="primary-button" disabled={saving||!userId.trim()} onClick={()=>void add()}>{saving?"Adding...":"Assign access"}</button></div></div>}
  <div className="panel">{rows.length?<div className="team-list">{rows.map(row=><div className="team-row-wrap" key={row.id}>
   <div className="team-row"><div className="team-avatar"><Users size={17}/></div><div className="team-main"><b>{row.profiles?.display_name||row.user_id}</b><small>{row.user_id}</small></div><span className="role-pill">{row.role.replaceAll("_"," ")}</span><select className="status-select" value={row.status} onChange={e=>void changeStatus(row.id,e.target.value)}><option value="invited">Invited</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="left">Left</option></select><button className="secondary-button" onClick={()=>setExpanded(expanded===row.id?null:row.id)}><Settings2 size={15}/> Permissions</button></div>
   {expanded===row.id&&<div className="permission-panel"><p className="muted">Enable specific actions for this user. A saved override replaces the role's default for that module/action. Owners and admins retain full access.</p><div className="permission-grid"><div className="permission-head"><b>Module</b>{actions.map(action=><b key={action}>{action}</b>)}</div>{modules.map(([key,label])=><div className="permission-row" key={key}><span>{label}</span>{actions.map(action=><label key={action} className="permission-check"><input type="checkbox" checked={isAllowed(row.id,key,action)} onChange={e=>void setPermission(row,key,action,e.target.checked)}/></label>)}</div>)}</div></div>}
  </div>)}</div>:<div className="empty-state"><ShieldCheck/><b>No additional users</b><small>Create accounts first, then assign them to this church.</small></div>}</div>
 </>;
}

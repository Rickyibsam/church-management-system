import { useEffect, useState } from "react";
import { UserPlus, Users, ShieldCheck, Settings2 } from "lucide-react";
import { supabase } from "../lib/supabase";

type TeamRow={id:string;user_id:string;role:string;status:string;profiles?:{display_name:string|null}|null};
type Permission={id?:string;church_id:string;church_member_id:string;module_key:string;action_key:string;allowed:boolean};
const roles=["admin","pastor","accountant","secretary","ministry_leader","staff","volunteer","member"];
const modules=[["members","Members"],["families","Families"],["branches","Branches"],["certificates","Certificates"],["certificate_documents","Certificate documents"],["attendance","Attendance"],["services","Services"],["events","Events"],["ministries","Ministries"],["pastoral","Pastoral care"],["accounts","Accounting"],["expenses","Expenses"],["donations","Donations"],["budgets","Budgets"],["assets","Assets"]] as const;
const actions=["view","create","edit","delete","approve","issue"] as const;

export default function TeamManagement({churchId}:{churchId:string|null}){
 const [rows,setRows]=useState<TeamRow[]>([]);
 const [permissions,setPermissions]=useState<Permission[]>([]);
 const [inviteEmail,setInviteEmail]=useState("");
 const [role,setRole]=useState("secretary");
 const [show,setShow]=useState(false);
 const [expanded,setExpanded]=useState<string|null>(null);
 const [message,setMessage]=useState("");
 const [saving,setSaving]=useState(false);
 const [callerRole,setCallerRole]=useState("member");
 const [branchOptions,setBranchOptions]=useState<Array<{id:string;name:string}>>([]);
 const [inviteBranchId,setInviteBranchId]=useState("");
 const canManage=["owner","admin"].includes(callerRole);
 async function load(){
  if(!supabase||!churchId){setRows([]);setPermissions([]);return;}
  const {data:userData}=await supabase.auth.getUser();
  if(userData.user){const {data:me}=await supabase.from("church_members").select("role").eq("church_id",churchId).eq("user_id",userData.user.id).maybeSingle();setCallerRole(me?.role??"member");}
  const {data:branches}=await supabase.from("church_branches").select("id,name").eq("church_id",churchId).order("name");setBranchOptions((branches??[]) as Array<{id:string;name:string}>);
  const {data,error}=await supabase.from("church_members").select("id,user_id,role,status,profiles(display_name)").eq("church_id",churchId).order("created_at",{ascending:true});
  if(error){setMessage("Unable to load team: "+error.message);return;}
  const team=(data??[]) as unknown as TeamRow[];setRows(team);
  const {data:perms,error:permissionError}=await supabase.from("church_member_permissions").select("id,church_id,church_member_id,module_key,action_key,allowed").eq("church_id",churchId);
  if(permissionError)setMessage("Unable to load custom permissions: "+permissionError.message);
  else setPermissions((perms??[]) as Permission[]);
 }
 useEffect(()=>{void load();},[churchId]);
 async function add(){
  if(!supabase||!churchId||!inviteEmail.trim())return;
  setSaving(true);setMessage("");
  const {data,error}=await supabase.functions.invoke("invite-church-member",{body:{churchId,email:inviteEmail.trim(),role,branchId:inviteBranchId||null}});
  setSaving(false);
  if(error){setMessage("Unable to invite user: "+error.message);return;}
  if(data?.error){setMessage(data.error);return;}
  setInviteEmail("");setInviteBranchId("");setShow(false);setMessage(data?.message??"Invitation processed.");await load();
 }
 async function changeStatus(id:string,status:string){
  if(!supabase)return;
  const {error}=await supabase.from("church_members").update({status}).eq("id",id);
  if(error)setMessage("Unable to update team access: "+error.message);else{setMessage("Team access updated.");await load();}
 }
 function defaultAllowed(role:string,moduleKey:string){
  if(role==="owner"||role==="admin")return true;
  if(["members","families"].includes(moduleKey))return ["pastor","secretary","staff"].includes(role);
  if(["certificates","certificate_documents"].includes(moduleKey))return ["pastor","secretary"].includes(role);
  if(["attendance","services","events","ministries"].includes(moduleKey))return ["pastor","secretary","ministry_leader","staff","volunteer"].includes(role);
  if(["accounts","expenses","donations","budgets"].includes(moduleKey))return role==="accountant";
  if(moduleKey==="assets")return ["staff","accountant"].includes(role);
  if(moduleKey==="pastoral")return role==="pastor";
  return false;
 }
 function isAllowed(member:TeamRow,moduleKey:string,actionKey:string){
  const explicit=permissions.find(p=>p.church_member_id===member.id&&p.module_key===moduleKey&&p.action_key===actionKey);
  return explicit?explicit.allowed:defaultAllowed(member.role,moduleKey);
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
  <div className="page-intro"><div><h2>Users & Permissions</h2><p>Manage church team roles and individual module actions.</p></div><button className="primary-button" disabled={!churchId||!canManage} onClick={()=>setShow(true)}><UserPlus size={16}/> Invite user</button></div>
  {message&&<div className="notice">{message}</div>}
  {show&&<div className="panel form-panel"><p className="muted">Send a secure church invitation to the person’s email address. New users will receive an account invitation; existing accounts will be assigned church access.</p><div className="form-grid"><div className="form-full"><label>Email address</label><input className="field" type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="person@example.com"/></div><div><label>Church role</label><select className="field" value={role} onChange={e=>setRole(e.target.value)}>{roles.filter(item=>item!=="admin"||callerRole==="owner").map(item=><option key={item} value={item}>{item.replaceAll("_"," ")}</option>)}</select></div><div><label>Church branch</label><select className="field" value={inviteBranchId} onChange={e=>setInviteBranchId(e.target.value)}><option value="">Main / default branch</option>{branchOptions.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div></div><div className="modal-actions"><button className="secondary-button" onClick={()=>setShow(false)}>Cancel</button><button className="primary-button" disabled={saving||!inviteEmail.trim()} onClick={()=>void add()}>{saving?"Sending...":"Send invitation"}</button></div></div>}
  <div className="panel">{rows.length?<div className="team-list">{rows.map(row=><div className="team-row-wrap" key={row.id}>
   <div className="team-row"><div className="team-avatar"><Users size={17}/></div><div className="team-main"><b>{row.profiles?.display_name||row.user_id}</b><small>{row.user_id}</small></div><span className="role-pill">{row.role.replaceAll("_"," ")}</span><select className="status-select" disabled={!canManage} value={row.status} onChange={e=>void changeStatus(row.id,e.target.value)}><option value="invited">Invited</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="left">Left</option></select><button className="secondary-button" disabled={!canManage} onClick={()=>setExpanded(expanded===row.id?null:row.id)}><Settings2 size={15}/> Permissions</button></div>
   {expanded===row.id&&<div className="permission-panel"><p className="muted">Enable specific actions for this user. A saved override replaces the role's default for that module/action. Owners and admins retain full access.</p><div className="permission-grid"><div className="permission-head"><b>Module</b>{actions.map(action=><b key={action}>{action}</b>)}</div>{modules.map(([key,label])=><div className="permission-row" key={key}><span>{label}</span>{actions.map(action=><label key={action} className="permission-check"><input type="checkbox" checked={isAllowed(row,key,action)} disabled={row.role==="owner"||row.role==="admin"} onChange={e=>void setPermission(row,key,action,e.target.checked)}/></label>)}</div>)}</div></div>}
  </div>)}</div>:<div className="empty-state"><ShieldCheck/><b>No additional users</b><small>Create accounts first, then assign them to this church.</small></div>}</div>
 </>;
}

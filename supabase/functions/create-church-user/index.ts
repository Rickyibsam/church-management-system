import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const origin=Deno.env.get("APP_ALLOWED_ORIGIN");
const headers={"Access-Control-Allow-Origin":origin??"null","Vary":"Origin","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(!origin||req.headers.get("Origin")!==origin)return reply({error:"User management origin is not configured."},403);
 if(req.method==="OPTIONS")return new Response("ok",{headers});
 if(req.method!=="POST")return reply({error:"Method not allowed."},405);
 const authorization=req.headers.get("Authorization"),url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!authorization?.startsWith("Bearer ")||!url||!anon||!secret)return reply({error:"Authentication is required."},401);
 const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
 const {data:userData,error:userError}=await caller.auth.getUser();if(userError||!userData.user)return reply({error:"Your session is invalid or expired."},401);
 let body:{churchId?:string;username?:string;password?:string;displayName?:string;role?:string;branchId?:string|null};try{body=await req.json();}catch{return reply({error:"Invalid request body."},400);}
 const churchId=body.churchId?.trim(),username=body.username?.trim(),password=body.password??"",role=body.role?.trim()||"staff",branchId=body.branchId?.trim()||null;
 const roles=["admin","branch_admin","pastor","accountant","secretary","ministry_leader","staff","volunteer","member"];
 if(!churchId||!username||!/^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$/.test(username)||password.length<12||password.length>128||!roles.includes(role))return reply({error:"Enter a valid username, role and password of at least 12 characters."},400);
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:callerMembership}=await admin.from("church_members").select("role,status,branch_id").eq("church_id",churchId).eq("user_id",userData.user.id).maybeSingle();
 if(!callerMembership||callerMembership.status!=="active"||!["owner","admin","branch_admin"].includes(callerMembership.role))return reply({error:"Only an active Church Owner, Administrator or Branch Administrator can create users."},403);
 if(role==="admin"&&callerMembership.role!=="owner")return reply({error:"Only the Church Owner can create another administrator."},403);
 if(role==="branch_admin"&&callerMembership.role!=="owner")return reply({error:"Only the Church Owner can assign Branch Administrator access."},403);
 if(callerMembership.role==="branch_admin"&&(!callerMembership.branch_id||branchId!==callerMembership.branch_id||["admin","branch_admin"].includes(role)))return reply({error:"Branch Administrators can create non-administrator accounts only within their assigned branch."},403);
 if(role==="branch_admin"&&!branchId)return reply({error:"A Branch Administrator account must be assigned to a branch."},400);
 if(branchId){const {data:branch}=await admin.from("church_branches").select("id").eq("id",branchId).eq("church_id",churchId).maybeSingle();if(!branch)return reply({error:"The selected branch does not belong to this church."},400);}
 const authEmail="u-"+crypto.randomUUID()+"@login.church360.invalid";
 const {data:created,error:createError}=await admin.auth.admin.createUser({email:authEmail,password,email_confirm:true,user_metadata:{display_name:body.displayName?.trim()||username,username}});
 if(createError||!created.user)return reply({error:"Unable to create user account. Check that the password meets security requirements."},400);
 const {data:member,error:memberError}=await admin.from("church_members").insert({church_id:churchId,user_id:created.user.id,role,status:"active",branch_id:branchId}).select("id").single();
 if(memberError){await admin.auth.admin.deleteUser(created.user.id);return reply({error:memberError.code==="23505"?"This user is already assigned to the church.":"Unable to assign the user to this church."},400);}
 const {error:mapError}=await admin.from("church_login_accounts").insert({church_id:churchId,user_id:created.user.id,username,auth_email:authEmail,branch_id:branchId,created_by:userData.user.id});
 if(mapError){await admin.from("church_members").delete().eq("id",member.id);await admin.auth.admin.deleteUser(created.user.id);return reply({error:mapError.code==="23505"?"This username is already in use in this church.":"Unable to save the login username."},400);}
 return reply({message:"User account created. Share the Church ID, username and temporary password securely."});
});
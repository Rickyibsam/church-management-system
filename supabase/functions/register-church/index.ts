import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const origin=Deno.env.get("APP_ALLOWED_ORIGIN");
const headers={"Access-Control-Allow-Origin":origin??"null","Vary":"Origin","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(!origin||req.headers.get("Origin")!==origin)return reply({error:"Registration origin is not configured."},403);
 if(req.method==="OPTIONS")return new Response("ok",{headers});
 if(req.method!=="POST")return reply({error:"Method not allowed."},405);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anon||!secret)return reply({error:"Server configuration is incomplete."},500);
 let body:{churchName?:string;churchEmail?:string;username?:string;password?:string;displayName?:string;countryCode?:string;currencyCode?:string;timezone?:string};try{body=await req.json();}catch{return reply({error:"Invalid request body."},400);}
 const churchName=body.churchName?.trim(),churchEmail=body.churchEmail?.trim().toLowerCase(),username=body.username?.trim(),password=body.password??"";
 if(!churchName||churchName.length>160||!churchEmail||churchEmail.length>254||!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(churchEmail)||!username||!/^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$/.test(username)||password.length<12||password.length>128)return reply({error:"Enter a church name, a 3–30 character username, and a password of at least 12 characters."},400);
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}}),authEmail="u-"+crypto.randomUUID()+"@login.church360.invalid";
 const {data:created,error:createError}=await admin.auth.admin.createUser({email:authEmail,password,email_confirm:true,user_metadata:{display_name:body.displayName?.trim()||username,username}});
 if(createError||!created.user)return reply({error:"Unable to create the church administrator account."},400);
 const publicClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:login,error:loginError}=await publicClient.auth.signInWithPassword({email:authEmail,password});
 if(loginError||!login.session){await admin.auth.admin.deleteUser(created.user.id);return reply({error:"Unable to initialize the administrator session."},500);}
 const signed=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+login.session.access_token}},auth:{persistSession:false,autoRefreshToken:false}});
 const country=(body.countryCode||"PK").toUpperCase(),currency=(body.currencyCode||"PKR").toUpperCase();
 const {data:churchId,error:churchError}=await signed.rpc("create_church",{p_legal_name:churchName,p_display_name:churchName,p_country_code:country,p_currency_code:currency,p_timezone:body.timezone||(country==="PK"?"Asia/Karachi":"UTC")});
 if(churchError||!churchId){await admin.auth.admin.deleteUser(created.user.id);return reply({error:"Church registration could not be completed."},400);}\n const {error:emailError}=await admin.from("churches").update({email:churchEmail}).eq("id",churchId);\n if(emailError){await admin.from("churches").delete().eq("id",churchId);await admin.auth.admin.deleteUser(created.user.id);return reply({error:"Unable to save the church email address."},400);}
 const {error:mapError}=await admin.from("church_login_accounts").insert({church_id:churchId,user_id:created.user.id,username,auth_email:authEmail,created_by:created.user.id});
 if(mapError){await admin.from("churches").delete().eq("id",churchId);await admin.auth.admin.deleteUser(created.user.id);return reply({error:mapError.code==="23505"?"This username is already in use. Please choose another.":"Unable to finish login setup."},400);}
 const {data:church}=await admin.from("churches").select("church_code").eq("id",churchId).single();
 return reply({session:login.session,churchId,churchCode:church?.church_code,username,message:"Church registered successfully."});
});
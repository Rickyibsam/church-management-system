import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const origin=Deno.env.get("APP_ALLOWED_ORIGIN");
const headers={"Access-Control-Allow-Origin":origin??"null","Vary":"Origin","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(!origin||req.headers.get("Origin")!==origin)return reply({error:"Login origin is not configured."},403);
 if(req.method==="OPTIONS")return new Response("ok",{headers});
 if(req.method!=="POST")return reply({error:"Method not allowed."},405);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anon||!secret)return reply({error:"Server configuration is incomplete."},500);
 let body:{churchCode?:string;username?:string;password?:string};try{body=await req.json();}catch{return reply({error:"Invalid request body."},400);}
 const churchCode=body.churchCode?.trim().toUpperCase(),username=body.username?.trim(),password=body.password??"";
 if(!churchCode||!/^CH-[0-9]{6,}$/.test(churchCode)||!username||!password)return reply({error:"Enter your Church ID, username and password."},400);
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:church}=await admin.from("churches").select("id").eq("church_code",churchCode).maybeSingle();
 if(!church)return reply({error:"Invalid Church ID, username or password."},401);
 const {data:account}=await admin.from("church_login_accounts").select("auth_email,user_id,is_active").eq("church_id",church.id).eq("username_normalized",username.toLowerCase()).maybeSingle();
 if(!account||!account.is_active)return reply({error:"Invalid Church ID, username or password."},401);
 const {data:membership}=await admin.from("church_members").select("status").eq("church_id",church.id).eq("user_id",account.user_id).maybeSingle();
 if(!membership||membership.status!=="active")return reply({error:"This account is not active. Contact your Church Administrator."},403);
 const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.signInWithPassword({email:account.auth_email,password});
 if(error||!data.session)return reply({error:"Invalid Church ID, username or password."},401);
 return reply({session:data.session,churchId:church.id,username,message:"Signed in successfully."});
});
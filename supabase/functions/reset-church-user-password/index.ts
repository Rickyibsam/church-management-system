import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const origin = Deno.env.get("APP_ALLOWED_ORIGIN");
const headers = {"Access-Control-Allow-Origin": origin ?? "null", "Vary": "Origin", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS"};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status, headers:{...headers,"Content-Type":"application/json"}});
Deno.serve(async (req) => {
 if (!origin || req.headers.get("Origin") !== origin) return reply({error:"Password reset origin is not configured."},403);
 if (req.method === "OPTIONS") return new Response("ok",{headers});
 if (req.method !== "POST") return reply({error:"Method not allowed."},405);
 const authorization=req.headers.get("Authorization"), url=Deno.env.get("SUPABASE_URL"), anon=Deno.env.get("SUPABASE_ANON_KEY"), secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if (!authorization?.startsWith("Bearer ") || !url || !anon || !secret) return reply({error:"Authentication is required."},401);
 const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
 const {data:userData,error:userError}=await caller.auth.getUser();
 if(userError||!userData.user)return reply({error:"Your session is invalid or expired."},401);
 let body:{churchId?:string;targetUserId?:string;newPassword?:string};
 try{body=await req.json();}catch{return reply({error:"Invalid request body."},400);}
 const churchId=body.churchId?.trim(),targetUserId=body.targetUserId?.trim(),newPassword=body.newPassword??"";
 if(!churchId||!targetUserId||newPassword.length<12||newPassword.length>128)return reply({error:"Provide a target account and a password between 12 and 128 characters."},400);
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:callerMembership}=await admin.from("church_members").select("role,status").eq("church_id",churchId).eq("user_id",userData.user.id).maybeSingle();
 if(!callerMembership||callerMembership.status!=="active"||!["owner","admin"].includes(callerMembership.role))return reply({error:"Only an active Church Owner or Administrator can reset user passwords."},403);
 const {data:targetMembership}=await admin.from("church_members").select("role,status").eq("church_id",churchId).eq("user_id",targetUserId).maybeSingle();
 if(!targetMembership||targetMembership.status!=="active")return reply({error:"The selected account is not an active member of this church."},404);
 if(targetMembership.role==="owner"||(targetMembership.role==="admin"&&callerMembership.role!=="owner"))return reply({error:"You do not have permission to reset this account's password."},403);
 const {error:updateError}=await admin.auth.admin.updateUserById(targetUserId,{password:newPassword});
 if(updateError)return reply({error:"The password could not be updated. Check the password requirements and try again."},400);
 return reply({message:"Password reset successfully."});
});
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": Deno.env.get("APP_ALLOWED_ORIGIN") ?? "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
Deno.serve(async (req: Request) => {
 if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
 if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
 const authorization = req.headers.get("Authorization");
 if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication is required." }, 401);
 const supabaseUrl = Deno.env.get("SUPABASE_URL"), anonKey = Deno.env.get("SUPABASE_ANON_KEY"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "Server configuration is incomplete." }, 500);
 const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
 const { data: userData, error: userError } = await callerClient.auth.getUser();
 if (userError || !userData.user) return json({ error: "Your session is invalid or expired." }, 401);
 let body: { churchId?: string; email?: string; role?: string; branchId?: string | null };
 try { body = await req.json(); } catch { return json({ error: "Invalid request body." }, 400); }
 const churchId=body.churchId?.trim(), email=body.email?.trim().toLowerCase(), role=body.role?.trim(), branchId=body.branchId?.trim()||null;
 const allowedRoles=["admin","pastor","accountant","secretary","ministry_leader","staff","volunteer","member"];
 if(!churchId||!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!role||!allowedRoles.includes(role)) return json({error:"A valid church, email address and role are required."},400);
 const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:callerMembership,error:membershipError}=await admin.from("church_members").select("role,status").eq("church_id",churchId).eq("user_id",userData.user.id).maybeSingle();
 if(membershipError||!callerMembership||callerMembership.status!=="active"||!["owner","admin"].includes(callerMembership.role)) return json({error:"Only an active church owner or administrator can invite users."},403);
 if(role==="admin"&&callerMembership.role!=="owner") return json({error:"Only the church owner can invite another administrator."},403);\n if(branchId){const {data:branch}=await admin.from("church_branches").select("id").eq("id",branchId).eq("church_id",churchId).maybeSingle();if(!branch)return json({error:"Selected branch does not belong to this church."},400);}
 let page=1; let existingUser: {id:string;email?:string;email_confirmed_at?:string|null}|null=null;
 while(page<=20){const {data,error}=await admin.auth.admin.listUsers({page,perPage:1000});if(error)return json({error:"Unable to look up account status: "+error.message},502);existingUser=data.users.find(user=>user.email?.toLowerCase()===email)??null;if(existingUser||data.users.length<1000)break;page++;}
 if(existingUser){
  const {data:existingMembership}=await admin.from("church_members").select("id").eq("church_id",churchId).eq("user_id",existingUser.id).maybeSingle();
  if(existingMembership)return json({error:"This user already belongs to the church."},409);
  const status=existingUser.email_confirmed_at?"active":"invited";
  const {error:addError}=await admin.from("church_members").insert({church_id:churchId,user_id:existingUser.id,role,status,branch_id:branchId});
  if(addError)return json({error:"Unable to assign the existing account: "+addError.message},400);
  return json({message:status==="active"?"Existing account added and activated for this church.":"Existing unconfirmed account added; access activates after email confirmation.",invited:false});
 }
 const {data:inviteData,error:inviteError}=await admin.auth.admin.inviteUserByEmail(email);
 if(inviteError||!inviteData.user)return json({error:"Unable to send the invitation. Configure a verified SMTP sender if email delivery is unavailable."},400);
 const {error:insertError}=await admin.from("church_members").insert({church_id:churchId,user_id:inviteData.user.id,role,status:"invited",branch_id:branchId});
 if(insertError)return json({error:"Invitation was created, but church access could not be assigned: "+insertError.message},500);
 return json({message:"Invitation sent. Church access activates after the recipient confirms their email.",invited:true});
});

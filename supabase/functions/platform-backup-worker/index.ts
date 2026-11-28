import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
function localParts(date:Date,timeZone:string){
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
 const get=(key:string)=>Number(parts.find(p=>p.type===key)?.value??0);
 return {year:get("year"),month:get("month"),day:get("day")};
}
function localDateTimeToUtc(dateText:string,timeText:string,timeZone:string){
 const [year,month,day]=dateText.split("-").map(Number);
 const [hour,minute]=timeText.slice(0,5).split(":").map(Number);
 const naive=Date.UTC(year,month-1,day,hour,minute,0);
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(new Date(naive));
 const get=(key:string)=>Number(parts.find(p=>p.type===key)?.value??0);
 const asUtc=Date.UTC(get("year"),get("month")-1,get("day"),get("hour"),get("minute"),get("second"));
 return new Date(naive-(asUtc-naive));
}
function nextScheduledRun(frequency:string,runTime:string,timeZone:string){
 const now=new Date();const local=localParts(now,timeZone);
 let day=new Date(Date.UTC(local.year,local.month-1,local.day));
 if(frequency==="daily")day.setUTCDate(day.getUTCDate()+1);
 else if(frequency==="weekly")day.setUTCDate(day.getUTCDate()+7);
 else {const targetMonth=day.getUTCMonth()+1;day.setUTCDate(1);day.setUTCMonth(targetMonth);const lastDay=new Date(Date.UTC(day.getUTCFullYear(),day.getUTCMonth()+1,0)).getUTCDate();day.setUTCDate(Math.min(local.day,lastDay));}
 const dateText=day.getUTCFullYear()+"-"+String(day.getUTCMonth()+1).padStart(2,"0")+"-"+String(day.getUTCDate()).padStart(2,"0");
 return localDateTimeToUtc(dateText,runTime,timeZone);
}
Deno.serve(async(req)=>{
 if(req.method!=="POST")return reply({error:"Method not allowed."},405);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!key)return reply({error:"Backup worker configuration is incomplete."},500);
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const supplied=req.headers.get("x-platform-job-token")??"";
 const {data:secret}=await admin.from("platform_backup_job_secrets").select("job_token").eq("singleton",true).maybeSingle();
 if(!secret?.job_token||supplied.length!==secret.job_token.length||![...secret.job_token].every((ch,i)=>ch===supplied[i]))
  return reply({error:"Backup job authorization failed."},403);
 const now=new Date().toISOString();
 const {data:schedules,error}=await admin.from("platform_backup_schedules").select("*").eq("is_enabled",true).lte("next_run_at",now).order("next_run_at").limit(10);
 if(error)return reply({error:"Unable to load due backup schedules."},500);
 const results=[];
 for(const schedule of schedules??[]){
  const {data:run,error:runError}=await admin.from("platform_backup_runs").insert({
   church_id:schedule.church_id,schedule_id:schedule.church_id,status:"running",backup_type:"scheduled",started_at:new Date().toISOString()
  }).select("id").single();
  if(runError||!run){results.push({churchId:schedule.church_id,status:"failed",error:"Unable to create backup run record."});continue;}
  try{
   const {data:payload,error:exportError}=await admin.rpc("platform_export_church_backup",{p_church_id:schedule.church_id});
   if(exportError||!payload)throw new Error("Church data export failed.");
   const json=JSON.stringify(payload);
   const bytes=new TextEncoder().encode(json);
   const stamp=new Date().toISOString().replace(/[:.]/g,"-");
   const path=schedule.church_id+"/"+stamp+"-"+run.id+".json";
   const {error:uploadError}=await admin.storage.from("platform-backups").upload(path,bytes,{contentType:"application/json",upsert:false});
   if(uploadError)throw new Error("Backup file upload failed.");
   const tables=payload.tables??{};
   const recordCount=Object.values(tables).reduce((n,value)=>n+(Array.isArray(value)?value.length:0),0);
   const {error:updateError}=await admin.from("platform_backup_runs").update({
    status:"completed",storage_path:path,file_size_bytes:bytes.length,tables_included:Object.keys(tables).length,
    records_included:recordCount,completed_at:new Date().toISOString()
   }).eq("id",run.id);
   if(updateError)throw new Error("Backup completed but run status could not be saved.");
   const next=nextScheduledRun(schedule.frequency,String(schedule.run_time??"02:00"),String(schedule.timezone??"Asia/Karachi"));
   if(next.getTime()<=Date.now())throw new Error("The next backup time could not be calculated.");
   await admin.from("platform_backup_schedules").update({next_run_at:next.toISOString(),updated_at:new Date().toISOString()}).eq("church_id",schedule.church_id);
   const {data:files}=await admin.storage.from("platform-backups").list(schedule.church_id,{limit:1000,sortBy:{column:"created_at",order:"desc"}});
   const keep=Number(schedule.retention_count??7);
   const old=(files??[]).slice(keep).map(file=>schedule.church_id+"/"+file.name);
   if(old.length)await admin.storage.from("platform-backups").remove(old);
   results.push({churchId:schedule.church_id,status:"completed",records:recordCount,path});
  }catch(error){
   await admin.from("platform_backup_runs").update({status:"failed",error_message:error instanceof Error?error.message:"Backup failed.",completed_at:new Date().toISOString()}).eq("id",run.id);
   await admin.from("platform_backup_schedules").update({next_run_at:new Date(Date.now()+15*60000).toISOString()}).eq("church_id",schedule.church_id);
   results.push({churchId:schedule.church_id,status:"failed"});
  }
 }
 return reply({processed:results.length,results});
});
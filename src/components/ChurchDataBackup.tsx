import { useEffect, useState } from "react";
import { Download, ShieldCheck, Upload } from "lucide-react";
import { supabase } from "../lib/supabase";

const BACKUP_TABLES = [
  "church_branches","church_members","church_member_permissions","certificate_sequences","audit_exports","notifications",
  "families","members","family_relationships","member_documents",
  "certificate_templates","certificate_document_requirements","certificates","certificate_attachments","certificate_history",
  "church_services","attendance_records","ministries","ministry_members","church_events",
  "pastoral_requests","pastoral_followups",
  "chart_of_accounts","financial_accounts","donations","expenses","journal_entries","journal_lines",
  "financial_budgets","financial_budget_lines","donation_pledges","donation_pledge_allocations","bank_reconciliation_items",
  "church_assets","asset_maintenance","asset_depreciation_entries","inventory_items","inventory_transactions","audit_logs"
] as const;

export default function ChurchDataBackup({ churchId }: { churchId: string | null }) {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [restoreFile,setRestoreFile]=useState<File|null>(null);
  const [canRestore,setCanRestore]=useState(false);
  useEffect(()=>{
    let alive=true;const client=supabase;
    if(!client||!churchId){setCanRestore(false);return ()=>{alive=false;};}
    void client.auth.getUser().then(async ({data,error})=>{
      if(error||!data.user){if(alive)setCanRestore(false);return;}
      const {data:membership}=await client.from("church_members").select("role,status").eq("church_id",churchId).eq("user_id",data.user.id).maybeSingle();
      if(alive)setCanRestore(membership?.role==="owner"&&membership.status==="active");
    });
    return ()=>{alive=false;};
  },[churchId]);
  async function exportBackup() {
    const client=supabase;
    if (!client || !churchId || busy) return;
    const storageClient=client as NonNullable<typeof client>;
    setBusy(true); setMessage("");
    try {
      const {data:userData,error:userError}=await client.auth.getUser();
      if(userError||!userData.user) throw new Error("Sign in before creating a backup.");
      const {data:membership,error:membershipError}=await client.from("church_members").select("role").eq("church_id",churchId).eq("user_id",userData.user.id).eq("status","active").maybeSingle();
      if(membershipError) throw membershipError;
      if(!membership||!["owner","admin"].includes(membership.role)) throw new Error("Only church owners and administrators can export a church backup.");
      const {data:workspace,error:workspaceError}=await client.from("churches").select("id,legal_name,display_name,country_code,currency_code,timezone,preferred_language,logo_path,header_text,footer_text,address,email,phone,website,created_at,updated_at").eq("id",churchId).single();
      if(workspaceError) throw workspaceError;
      const tables:Record<string,unknown[]>={};
      let totalRows=0;
      for(const table of BACKUP_TABLES) {
        const records:unknown[]=[];
        for(let offset=0;;offset+=500) {
          const {data,error}=await client.from(table).select("*").eq("church_id",churchId).range(offset,offset+499);
          if(error) throw new Error("Backup stopped at "+table+": "+error.message);
          const page=data??[];
          records.push(...page);
          if(page.length<500) break;
          if(offset>=100000) throw new Error("A table exceeded the 100,000-row export safety limit: "+table);
        }
        tables[table]=records;
        totalRows+=records.length;
        if(totalRows>100000)throw new Error("The backup exceeds the 100,000-record restore safety limit. Export a smaller workspace archive.");
      }
      const storageFiles:Array<{bucket:string;path:string;content_type:string;size:number;content_base64:string}>=[];
      let storageBytes=0;
      async function collectFolder(bucket:string,path:string,depth=0):Promise<void>{
        if(depth>12)throw new Error("Storage folder nesting exceeded the backup safety limit.");
        for(let offset=0;;offset+=100){
          const {data,error}=await storageClient.storage.from(bucket).list(path,{limit:100,offset});
          if(error)throw new Error("Unable to list "+bucket+" storage: "+error.message);
          const page=data??[];
          for(const entry of page){
            const fullPath=path+"/"+entry.name;
            if(!entry.id&&!entry.metadata){await collectFolder(bucket,fullPath,depth+1);continue;}
            if(storageFiles.length>=2000)throw new Error("The backup contains more than 2,000 files; split the archive before exporting.");
            const {data:fileBlob,error:downloadError}=await storageClient.storage.from(bucket).download(fullPath);
            if(downloadError||!fileBlob)throw new Error("Unable to download backup file "+entry.name+": "+(downloadError?.message??"Unknown storage error"));
            const buffer=await fileBlob.arrayBuffer();
            storageBytes+=buffer.byteLength;
            if(storageBytes>50*1024*1024)throw new Error("Private and branding files exceed the 50 MB backup limit. Export a smaller archive.");
            const bytes=new Uint8Array(buffer);
            let binary="";
            for(let index=0;index<bytes.length;index+=0x8000)binary+=String.fromCharCode(...bytes.subarray(index,index+0x8000));
            storageFiles.push({bucket,path:fullPath,content_type:fileBlob.type||entry.metadata?.mimetype||"application/octet-stream",size:buffer.byteLength,content_base64:btoa(binary)});
          }
          if(page.length<100)break;
          if(offset>=5000)throw new Error("A storage folder exceeded the 5,000-file listing safety limit.");
        }
      }
      for(const bucket of ["church-private-documents","church-branding"]){
        await collectFolder(bucket,churchId);
      }
      const backup={
        format:"church-management-system-backup",
        version:5,
        created_at:new Date().toISOString(),
        workspace,
        row_counts:Object.fromEntries(Object.entries(tables).map(([name,rows])=>[name,rows.length])),
        storage_file_count:storageFiles.length,
        storage_total_bytes:storageBytes,
        tables,
        storage_manifest:storageFiles.map(({bucket,path,size})=>({bucket,path,size})),
        storage_files:storageFiles,
        limitations:[
          "Authentication accounts and passwords are never exported; referenced user accounts must already exist in the same Supabase project before restore.",
          "Storage files are included up to 50 MB and 2,000 files across the two church storage buckets.",
          "Database records restore transactionally into a new empty workspace. Storage files are uploaded first and removed if the database transaction fails."
        ]
      };
      const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");
      link.href=url;
      link.download="church-backup-"+String(workspace.display_name||"workspace").toLowerCase().replace(/[^a-z0-9]+/g,"-")+"-"+new Date().toISOString().slice(0,10)+".json";
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Backup export created: "+totalRows.toLocaleString()+" records across "+BACKUP_TABLES.length+" tables and "+storageFiles.length+" files ("+(storageBytes/1024/1024).toFixed(1)+" MB).");
    } catch(error) {
      setMessage(error instanceof Error?error.message:"Backup export failed. No complete backup file was created.");
    } finally { setBusy(false); }
  }
  async function restoreBackup(){
    const client=supabase;
    if(!client||!churchId||!restoreFile||busy)return;
    if(!window.confirm("Restore this backup into the selected NEW empty church workspace? Existing operational data is never overwritten."))return;
    setBusy(true);setMessage("");
    const uploaded:Record<string,string[]>={"church-private-documents":[],"church-branding":[]};
    try{
      if(restoreFile.size>80*1024*1024)throw new Error("The backup file exceeds the 80 MB restore limit.");
      const parsed=JSON.parse(await restoreFile.text()) as Record<string,unknown>;
      if(parsed.format!=="church-management-system-backup"||parsed.version!==5)throw new Error("Select a valid version 5 church backup.");
      const workspace=parsed.workspace as {id?:string}|undefined;
      const sourceChurchId=workspace?.id??"";
      if(!sourceChurchId||sourceChurchId===churchId)throw new Error("Select a backup from a different church workspace.");
      const files=Array.isArray(parsed.storage_files)?parsed.storage_files as Array<{bucket:string;path:string;content_type:string;size:number;content_base64:string}>:[];
      if(files.length>2000)throw new Error("The backup contains more than 2,000 files.");
      const totalBytes=files.reduce((sum,file)=>sum+Number(file.size||0),0);
      if(totalBytes>50*1024*1024)throw new Error("The backup storage files exceed the 50 MB restore limit.");
      if(Number(parsed.storage_total_bytes??totalBytes)!==totalBytes)throw new Error("Backup storage byte-count validation failed.");
      if(Number(parsed.storage_file_count??files.length)!==files.length)throw new Error("Backup storage file count validation failed.");
      const {data:userData,error:userError}=await client.auth.getUser();
      if(userError||!userData.user)throw new Error("Sign in before restoring a backup.");
      const {data:membership,error:membershipError}=await client.from("church_members").select("role,status").eq("church_id",churchId).eq("user_id",userData.user.id).maybeSingle();
      if(membershipError||membership?.role!=="owner"||membership.status!=="active")throw new Error("Only the active owner of the target church can restore a backup.");
      const seen=new Set<string>();
      for(const file of files){
        if(!["church-private-documents","church-branding"].includes(file.bucket))throw new Error("The backup contains an unsupported storage bucket.");
        if(!file.path.startsWith(sourceChurchId+"/"))throw new Error("A storage file path does not belong to the source church.");
        const targetPath=churchId+file.path.slice(sourceChurchId.length);
        const key=file.bucket+"|"+targetPath;
        if(seen.has(key))throw new Error("The backup contains a duplicate storage file path.");
        seen.add(key);
        const bytes=Uint8Array.from(atob(file.content_base64),char=>char.charCodeAt(0));
        if(bytes.byteLength!==Number(file.size))throw new Error("A storage file failed its size validation: "+file.path);
        const perFileLimit=file.bucket==="church-branding"?5*1024*1024:10*1024*1024;
        if(bytes.byteLength>perFileLimit)throw new Error("A storage file exceeds its bucket size limit: "+file.path);
        const {error:uploadError}=await client.storage.from(file.bucket).upload(targetPath,bytes,{contentType:file.content_type||"application/octet-stream",upsert:false});
        if(uploadError)throw new Error("Unable to restore storage file "+file.path+": "+uploadError.message);
        uploaded[file.bucket].push(targetPath);
      }
      const databaseSnapshot:Record<string,unknown>={...parsed,storage_manifest:files.map(file=>({bucket:file.bucket,path:churchId+file.path.slice(sourceChurchId.length),size:file.size}))};
      delete databaseSnapshot["storage_files"];
      const {data:result,error:restoreError}=await client.rpc("restore_church_backup",{p_target_church_id:churchId,p_snapshot:databaseSnapshot});
      if(restoreError)throw new Error("Database restore was rolled back: "+restoreError.message);
      const restored=result as {records_restored?:number;tables_restored?:number};
      setMessage("Restore completed successfully: "+Number(restored.records_restored??0).toLocaleString()+" records across "+Number(restored.tables_restored??BACKUP_TABLES.length)+" tables and "+files.length+" storage files.");
      setRestoreFile(null);
    }catch(error){
      let cleanupFailed=false;
      for(const [bucket,paths] of Object.entries(uploaded)){
        for(let offset=0;offset<paths.length;offset+=100){
          const {error:cleanupError}=await client.storage.from(bucket).remove(paths.slice(offset,offset+100));
          if(cleanupError)cleanupFailed=true;
        }
      }
      setMessage((error instanceof Error?error.message:"Backup restore failed.")+(cleanupFailed?" Some uploaded files could not be removed automatically; contact the church owner before retrying.":" Any files uploaded for this failed restore were rolled back."));
    }finally{setBusy(false);}
  }
  return <section className="panel settings-panel">
    <div className="page-intro"><div><h3>Church data backup</h3><p>Export church-scoped database records as a JSON snapshot. Only owners and administrators can create an export.</p></div><ShieldCheck size={24}/></div>
    <ul><li>Exports records and private files from the selected church workspace only.</li><li>Storage files are limited to 50 MB and 2,000 files; authentication credentials are excluded.</li><li>Restore runs as a database transaction and is allowed only into a newly created, empty target workspace owned by the same account.</li></ul>
    <button className="primary-button" disabled={!churchId||busy} onClick={()=>void exportBackup()}><Download size={16}/>{busy?"Preparing backup...":"Export church data backup"}</button>
    <div className="divider"/>
    <h4>Restore church backup</h4>
    <p>Only the target church owner can restore. All referenced user accounts must still exist in this Supabase project.</p>
    {canRestore?<><label>Version 5 backup JSON</label><input className="field" type="file" accept=".json,application/json" onChange={event=>setRestoreFile(event.target.files?.[0]??null)}/><button className="secondary-button" disabled={!churchId||!restoreFile||busy} onClick={()=>void restoreBackup()}><Upload size={16}/>{busy?"Restoring backup...":"Restore into this empty workspace"}</button></>:<p className="helper">Restore is available to the active church owner only.</p>}
    {message&&<p className="helper" role="status">{message}</p>}
  </section>;
}

import { useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
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
  async function exportBackup() {
    const client=supabase;
    if (!client || !churchId || busy) return;
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
      }
      const storageFiles:Array<{bucket:string;path:string;content_type:string;size:number;content_base64:string}>=[];
      let storageBytes=0;
      async function collectFolder(bucket:string,path:string,depth=0):Promise<void>{
        if(depth>12)throw new Error("Storage folder nesting exceeded the backup safety limit.");
        for(let offset=0;;offset+=100){
          const {data,error}=await client.storage.from(bucket).list(path,{limit:100,offset});
          if(error)throw new Error("Unable to list "+bucket+" storage: "+error.message);
          const page=data??[];
          for(const entry of page){
            const fullPath=path+"/"+entry.name;
            if(!entry.id&&!entry.metadata){await collectFolder(bucket,fullPath,depth+1);continue;}
            if(storageFiles.length>=2000)throw new Error("The backup contains more than 2,000 files; split the archive before exporting.");
            const {data:fileBlob,error:downloadError}=await client.storage.from(bucket).download(fullPath);
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
        version:4,
        created_at:new Date().toISOString(),
        workspace,
        row_counts:Object.fromEntries(Object.entries(tables).map(([name,rows])=>[name,rows.length])),
        storage_file_count:storageFiles.length,
        storage_total_bytes:storageBytes,
        tables,
        storage_files:storageFiles,
        limitations:[
          "Authentication accounts and passwords are never exported; referenced user accounts must already exist in the same Supabase project before restore.",
          "Storage files are included up to 50 MB and 2,000 files across the two church storage buckets.",
          "A validated transactional restore workflow is not yet enabled. Do not upload this file into production tables manually."
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
  return <section className="panel settings-panel">
    <div className="page-intro"><div><h3>Church data backup</h3><p>Export church-scoped database records as a JSON snapshot. Only owners and administrators can create an export.</p></div><ShieldCheck size={24}/></div>
    <ul><li>Exports records from the selected church workspace only.</li><li>Private church documents and branding files are included (up to 50 MB total); authentication credentials are excluded.</li><li>Restore is not enabled yet; keep this file securely and do not manually import it into production.</li></ul>
    <button className="primary-button" disabled={!churchId||busy} onClick={()=>void exportBackup()}><Download size={16}/>{busy?"Preparing backup...":"Export church data backup"}</button>
    {message&&<p className="helper" role="status">{message}</p>}
  </section>;
}

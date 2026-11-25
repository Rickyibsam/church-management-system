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
  "church_assets","asset_maintenance","asset_depreciation_entries","audit_logs"
] as const;

export default function ChurchDataBackup({ churchId }: { churchId: string | null }) {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  async function exportBackup() {
    if (!supabase || !churchId || busy) return;
    setBusy(true); setMessage("");
    try {
      const {data:userData,error:userError}=await supabase.auth.getUser();
      if(userError||!userData.user) throw new Error("Sign in before creating a backup.");
      const {data:membership,error:membershipError}=await supabase.from("church_members").select("role").eq("church_id",churchId).eq("user_id",userData.user.id).eq("status","active").maybeSingle();
      if(membershipError) throw membershipError;
      if(!membership||!["owner","admin"].includes(membership.role)) throw new Error("Only church owners and administrators can export a church backup.");
      const {data:workspace,error:workspaceError}=await supabase.from("churches").select("id,legal_name,display_name,country_code,currency_code,timezone,created_at").eq("id",churchId).single();
      if(workspaceError) throw workspaceError;
      const tables:Record<string,unknown[]>={};
      let totalRows=0;
      for(const table of BACKUP_TABLES) {
        const records:unknown[]=[];
        for(let offset=0;;offset+=500) {
          const {data,error}=await supabase.from(table).select("*").eq("church_id",churchId).range(offset,offset+499);
          if(error) throw new Error("Backup stopped at "+table+": "+error.message);
          const page=data??[];
          records.push(...page);
          if(page.length<500) break;
          if(offset>=100000) throw new Error("A table exceeded the 100,000-row export safety limit: "+table);
        }
        tables[table]=records;
        totalRows+=records.length;
      }
      const backup={
        format:"church-management-system-backup",
        version:2,
        created_at:new Date().toISOString(),
        workspace,
        row_counts:Object.fromEntries(Object.entries(tables).map(([name,rows])=>[name,rows.length])),
        tables,
        limitations:[
          "This is a database-record export, not a complete disaster-recovery image.",
          "Private Storage file contents are not included; document and certificate metadata may contain storage paths.",
          "Authentication accounts and passwords are never exported.",
          "A validated restore workflow is not yet enabled. Do not upload this file into production tables manually."
        ]
      };
      const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");
      link.href=url;
      link.download="church-backup-"+String(workspace.display_name||"workspace").toLowerCase().replace(/[^a-z0-9]+/g,"-")+"-"+new Date().toISOString().slice(0,10)+".json";
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Backup export created: "+totalRows.toLocaleString()+" records across "+BACKUP_TABLES.length+" tables.");
    } catch(error) {
      setMessage(error instanceof Error?error.message:"Backup export failed. No complete backup file was created.");
    } finally { setBusy(false); }
  }
  return <section className="panel settings-panel">
    <div className="page-intro"><div><h3>Church data backup</h3><p>Export church-scoped database records as a JSON snapshot. Only owners and administrators can create an export.</p></div><ShieldCheck size={24}/></div>
    <ul><li>Exports records from the selected church workspace only.</li><li>Authentication credentials and private file contents are excluded.</li><li>Restore is not enabled yet; keep this file securely and do not manually import it into production.</li></ul>
    <button className="primary-button" disabled={!churchId||busy} onClick={()=>void exportBackup()}><Download size={16}/>{busy?"Preparing backup...":"Export church data backup"}</button>
    {message&&<p className="helper" role="status">{message}</p>}
  </section>;
}

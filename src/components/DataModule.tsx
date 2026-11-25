import { useEffect, useState } from "react";
import { ClipboardList, Edit2, Plus, Trash2, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

type Field = { name: string; label: string; type?: "text" | "number" | "date" | "datetime-local" | "boolean"; required?: boolean; defaultValue?: string; lookup?: {table:string;labelField:string;valueField?:string;filterField?:string;filterValue?:string}; options?: Array<{value:string;label:string}> };
type Props = { churchId: string | null; table: string; title: string; description: string; fields: Field[]; orderBy?: string; readOnly?: boolean; postJournal?: boolean; financialAction?: "donation" | "expense"; assetAction?: boolean; budgetAction?: boolean; extraColumns?: string[]; extraDisplay?: Array<{name:string;label:string}>; displayAllFields?: boolean; appendOnly?: boolean };

export default function DataModule({ churchId, table, title, description, fields, orderBy = "created_at", readOnly = false, postJournal = false, financialAction, assetAction = false, budgetAction = false, extraColumns = [], extraDisplay = [], displayAllFields = false, appendOnly = false }: Props) {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lookupOptions,setLookupOptions]=useState<Record<string,Array<{value:string;label:string}>>>({});

  async function load() {
    const db = supabase;
    if (!db || !churchId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const columns = [...new Set(["id", ...fields.map(field => field.name), ...extraColumns, ...extraDisplay.map(field=>field.name)])].join(",");
    let request = db.from(table).select(columns).eq("church_id", churchId).limit(100);
    if (orderBy && (orderBy === "created_at" || fields.some(field => field.name === orderBy))) request = request.order(orderBy, { ascending: false });
    const { data, error } = await request;
    if (error) setMessage("Unable to load records: " + error.message);
    else setRows((data ?? []) as unknown as Array<Record<string, unknown>>);
    const lookups:Record<string,Array<{value:string;label:string}>>={};
    await Promise.all(fields.filter(field=>field.lookup).map(async field=>{
      const lookup=field.lookup!;
      const valueField=lookup.valueField??"id";
      const selectedFields=[...new Set([valueField,lookup.labelField])].join(",");
      let query=db.from(lookup.table).select(selectedFields).eq("church_id",churchId).limit(500);
      if(lookup.filterField&&lookup.filterValue)query=query.eq(lookup.filterField,lookup.filterValue);
      const {data:options}=await query;
      lookups[field.name]=(options??[]).map(item=>{const row=item as unknown as Record<string,unknown>;return {value:String(row[valueField]),label:String(row[lookup.labelField]??row[valueField])};});
    }));
    setLookupOptions(lookups);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [churchId, table]);

  async function openNew() { const initial=Object.fromEntries(fields.filter(field=>field.defaultValue!==undefined).map(field=>[field.name,field.defaultValue!] ));if(fields.some(field=>field.name==="currency_code"&&field.defaultValue===undefined)&&supabase&&churchId){const {data}=await supabase.from("churches").select("currency_code").eq("id",churchId).maybeSingle();if(data?.currency_code)initial.currency_code=data.currency_code;}setValues(initial);setEditingId(null);setShow(true); }
  function openEdit(row: Record<string, unknown>) {
    const next: Record<string, string> = {};
    for (const field of fields) {
      const raw = row[field.name];
      if (raw == null) next[field.name] = "";
      else if (field.type === "datetime-local") next[field.name] = String(raw).slice(0,16);
      else next[field.name] = String(raw);
    }
    setValues(next); setEditingId(String(row.id)); setShow(true);
  }
  function closeForm() { setShow(false); setEditingId(null); setValues({}); }

  async function save() {
    if (!supabase || !churchId) return;
    setSaving(true); setMessage("");
    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      const value = values[field.name] ?? "";
      if (!value.trim()) {
        if (field.required) { setSaving(false); setMessage(field.label + " is required."); return; }
        continue;
      }
      if (field.type === "boolean") { payload[field.name] = value === "true";
      } else if (field.type === "number") {
        const number = Number(value);
        if (!Number.isFinite(number)) { setSaving(false); setMessage(field.label + " must be a valid number."); return; }
        payload[field.name] = number;
      } else if (field.type === "datetime-local") {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) { setSaving(false); setMessage(field.label + " must be a valid date and time."); return; }
        payload[field.name] = date.toISOString();
      } else payload[field.name] = value.trim();
    }
    if (!editingId) payload.church_id = churchId;
    if(table==="certificate_templates"&&payload.is_default===true){let clear=supabase.from("certificate_templates").update({is_default:false}).eq("church_id",churchId).eq("certificate_type",payload.certificate_type).eq("language_code",payload.language_code);if(editingId)clear=clear.neq("id",editingId);const {error:clearError}=await clear;if(clearError){setSaving(false);setMessage("Unable to set the default certificate template: "+clearError.message);return;}}
    const result = editingId
      ? await supabase.from(table).update(payload).eq("id", editingId).eq("church_id", churchId)
      : await supabase.from(table).insert(payload);
    setSaving(false);
    if (result.error) { setMessage("Unable to save record: " + result.error.message); return; }
    closeForm(); setMessage(editingId ? "Record updated." : "Record saved."); await load();
  }

  async function postEntry(row: Record<string, unknown>) {
    if (!supabase) return;
    setMessage("");
    const { error } = await supabase.rpc("post_journal_entry", { p_entry_id: String(row.id) });
    if (error) setMessage("Unable to post journal entry: " + error.message);
    else { setMessage("Journal entry posted successfully."); await load(); }
  }

  async function runFinancialAction(row:Record<string,unknown>) {
    if(!supabase||!financialAction)return;
    setMessage("");
    const action=financialAction==="donation"?"post_donation":row.status==="draft"?"approve_expense":"post_expense";
    const {error}=await supabase.rpc(action,{[financialAction==="donation"?"p_donation_id":"p_expense_id"]:String(row.id)});
    if(error){setMessage("Unable to process financial record: "+error.message);return;}
    setMessage(financialAction==="donation"?"Donation posted and receipt number generated.":action==="approve_expense"?"Expense approved. You can now post it to the ledger.":"Expense posted to the ledger.");
    await load();
  }

  function exportRows(){
    const displayFields=displayAllFields?fields:[...fields.slice(0,3),...extraDisplay];
    const allFields=[...new Map([...fields,...extraDisplay].map(field=>[field.name,field])).values()];
    return {displayFields,allFields,data:rows.map(row=>Object.fromEntries(allFields.map(field=>[field.label,row[field.name]??""])))};
  }
  function exportCsv(){
    const allFields=[...new Map([...fields,...extraDisplay].map(field=>[field.name,field])).values()];
    const headers=allFields.map(field=>field.label);
    const lines=[headers,...rows.map(row=>allFields.map(field=>row[field.name]??""))];
    const csv=lines.map(line=>line.map(value=>{
      const raw=String(value??"");
      const safe=/^[\u0000-\u0020]*[=+\-@]/.test(raw)?"'"+raw:raw;
      return '"'+safe.replaceAll('"','""')+'"';
    }).join(",")).join("\r\n");
    const blob=new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=table+"-"+new Date().toISOString().slice(0,10)+".csv";anchor.click();URL.revokeObjectURL(url);
  }
  function exportExcel(){
    const {data}=exportRows();
    const sheet=XLSX.utils.json_to_sheet(data);const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,title.slice(0,31));XLSX.writeFile(book,table+"-"+new Date().toISOString().slice(0,10)+".xlsx");
  }
  function exportPdf(){
    const {allFields}=exportRows();const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
    doc.setFontSize(15);doc.text(title,12,14);doc.setFontSize(7);
    let y=23;
    doc.setFont("helvetica","bold");doc.text(allFields.map(field=>field.label).join(" | ").slice(0,180),12,y);y+=6;doc.setFont("helvetica","normal");
    rows.forEach(row=>{
      const line=allFields.map(field=>String(row[field.name]??"—").replaceAll("\n"," ").slice(0,24)).join(" | ").slice(0,180);
      if(y>190){doc.addPage();y=15;}doc.text(line,12,y);y+=5;
    });
    doc.save(table+"-"+new Date().toISOString().slice(0,10)+".pdf");
  }

  async function runAssetAction(row:Record<string,unknown>,action:"depreciate"|"dispose"){
    if(!supabase||!assetAction)return;
    if(action==="depreciate"){
      const now=new Date();const lastDay=new Date(now.getFullYear(),now.getMonth()+1,0);const periodEnd=lastDay.getFullYear()+"-"+String(lastDay.getMonth()+1).padStart(2,"0")+"-"+String(lastDay.getDate()).padStart(2,"0");
      const {error}=await supabase.rpc("post_asset_depreciation",{p_asset_id:String(row.id),p_period_end:periodEnd});
      if(error)setMessage("Unable to post asset depreciation: "+error.message);
      else setMessage("Monthly depreciation posted to the general ledger.");
    }else{
      const proceedsText=window.prompt("Enter the disposal proceeds amount:");
      if(proceedsText===null)return;
      const proceeds=Number(proceedsText);
      if(!Number.isFinite(proceeds)||proceeds<0){setMessage("Enter a valid non-negative disposal amount.");return;}
      if(!row.disposal_cash_account_id){setMessage("Select a disposal cash/bank account in the asset profile first.");return;}
      const {error}=await supabase.rpc("dispose_church_asset",{p_asset_id:String(row.id),p_disposal_date:(()=>{const today=new Date();return today.getFullYear()+"-"+String(today.getMonth()+1).padStart(2,"0")+"-"+String(today.getDate()).padStart(2,"0");})(),p_proceeds:proceeds,p_cash_account_id:String(row.disposal_cash_account_id)});
      if(error)setMessage("Unable to dispose of asset: "+error.message);
      else setMessage("Asset disposed and gain/loss posted to the general ledger.");
    }
    await load();
  }

  async function approveBudget(row:Record<string,unknown>){
    if(!supabase||!budgetAction)return;
    const {error}=await supabase.rpc("approve_financial_budget",{p_budget_id:String(row.id)});
    if(error)setMessage("Unable to approve budget: "+error.message);else setMessage("Budget approved and its lines are now locked.");
    await load();
  }

  async function remove(row: Record<string, unknown>) {
    if (!supabase || !churchId) return;
    if (!window.confirm("Delete this record? This action may be restricted by church policy.")) return;
    const { error } = await supabase.from(table).delete().eq("id", String(row.id)).eq("church_id", churchId);
    if (error) setMessage("Unable to delete record: " + error.message);
    else { setMessage("Record deleted."); await load(); }
  }

  return <>
    <div className="page-intro"><div><h2>{title}</h2><p>{description}</p></div><div className="record-toolbar"><button className="secondary-button" disabled={!rows.length} onClick={exportCsv}>CSV</button><button className="secondary-button" disabled={!rows.length} onClick={exportExcel}>Excel</button><button className="secondary-button" disabled={!rows.length} onClick={exportPdf}>PDF</button>{!readOnly && <button className="primary-button" disabled={!churchId} onClick={openNew}><Plus size={17}/> Add record</button>}</div></div>
    {message && <div className="notice"><span>{message}</span><button onClick={() => setMessage("")}><X size={15}/></button></div>}
    {show && <div className="panel form-panel"><div className="form-grid">{fields.map(field => <div key={field.name}><label>{field.label}{field.required ? " *" : ""}</label>{field.type === "boolean" ? <input type="checkbox" checked={values[field.name] === "true"} onChange={event => setValues(old => ({ ...old, [field.name]: String(event.target.checked) }))}/> : field.options ? <select className="field" required={field.required} value={values[field.name]??""} onChange={event=>setValues(old=>({...old,[field.name]:event.target.value}))}><option value="">Select {field.label.toLowerCase()}</option>{field.options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.lookup ? <select className="field" required={field.required} value={values[field.name]??""} onChange={event=>setValues(old=>({...old,[field.name]:event.target.value}))}><option value="">Select {field.label.toLowerCase()}</option>{(lookupOptions[field.name]??[]).map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input className="field" type={field.type ?? "text"} required={field.required} value={values[field.name] ?? ""} onChange={event => setValues(old => ({ ...old, [field.name]: event.target.value }))}/>}</div>)}</div><div className="modal-actions"><button className="secondary-button" onClick={closeForm}>Cancel</button><button className="primary-button" disabled={saving || !fields.some(field => (values[field.name] ?? "").trim())} onClick={() => void save()}>{saving ? "Saving..." : editingId ? "Update record" : "Save record"}</button></div></div>}
    <div className="panel">{loading ? <div className="empty-state">Loading records...</div> : rows.length ? <div className="records-table"><div className="record-row record-head"><span>{title} record</span>{(displayAllFields?fields:fields.slice(0,3)).map(field=><span key={field.name}>{field.label}</span>)}{extraDisplay.map(field=><span key={field.name}>{field.label}</span>)}{!readOnly && !appendOnly && <span>Actions</span>}</div>{rows.map(row=><div className="record-row" key={String(row.id)}><b>{String(row[fields[0]?.name] ?? "Record")}</b>{(displayAllFields?fields.slice(1):fields.slice(1,3)).map(field=><span key={field.name}>{String(row[field.name] ?? "—")}</span>)}{extraDisplay.map(field=><span key={field.name}>{String(row[field.name]??"—")}</span>)}{!readOnly && <span className="record-actions">{postJournal && row.status === "draft" && <button className="secondary-button" onClick={()=>void postEntry(row)}>Post</button>}{financialAction==="donation"&&row.status==="draft"&&<button className="secondary-button" onClick={()=>void runFinancialAction(row)}>Post donation</button>}{financialAction==="expense"&&row.status==="draft"&&<button className="secondary-button" onClick={()=>void runFinancialAction(row)}>Approve</button>}{financialAction==="expense"&&row.status==="approved"&&<button className="secondary-button" onClick={()=>void runFinancialAction(row)}>Post expense</button>}{assetAction&&row.asset_status==="active"&&row.depreciation_method==="straight_line"&&Number(row.useful_life_months)>0&&<button className="secondary-button" onClick={()=>void runAssetAction(row,"depreciate")}>Post depreciation</button>}{budgetAction&&row.status==="draft"&&<button className="secondary-button" onClick={()=>void approveBudget(row)}>Approve budget</button>}{assetAction&&row.asset_status==="active"&&<button className="secondary-button" onClick={()=>void runAssetAction(row,"dispose")}>Dispose</button>}{!appendOnly&&<><button className="icon-button" title="Edit record" onClick={()=>openEdit(row)}><Edit2 size={15}/></button><button className="icon-button" title="Delete record" onClick={()=>void remove(row)}><Trash2 size={15}/></button></>}</span>}</div>)}</div> : <div className="empty-state"><ClipboardList/><b>No records yet</b><small>{churchId ? "Add the first record to start this register." : "Sign in and create a church workspace first."}</small></div>}</div>
  </>;
}

import { useEffect, useState } from "react";
import { ClipboardList, Edit2, Plus, Trash2, X } from "lucide-react";
import { supabase } from "../lib/supabase";

type Field = { name: string; label: string; type?: "text" | "number" | "date" | "datetime-local" | "boolean"; required?: boolean; defaultValue?: string; lookup?: {table:string;labelField:string;valueField?:string;filterField?:string;filterValue?:string} };
type Props = { churchId: string | null; table: string; title: string; description: string; fields: Field[]; orderBy?: string; readOnly?: boolean; postJournal?: boolean; financialAction?: "donation" | "expense"; extraColumns?: string[]; extraDisplay?: Array<{name:string;label:string}>; displayAllFields?: boolean };

export default function DataModule({ churchId, table, title, description, fields, orderBy = "created_at", readOnly = false, postJournal = false, financialAction, extraColumns = [], extraDisplay = [], displayAllFields = false }: Props) {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lookupOptions,setLookupOptions]=useState<Record<string,Array<{value:string;label:string}>>>({});

  async function load() {
    if (!supabase || !churchId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const columns = [...new Set(["id", ...fields.map(field => field.name), ...extraColumns, ...extraDisplay.map(field=>field.name)])].join(",");
    let request = supabase.from(table).select(columns).eq("church_id", churchId).limit(100);
    if (orderBy && (orderBy === "created_at" || fields.some(field => field.name === orderBy))) request = request.order(orderBy, { ascending: false });
    const { data, error } = await request;
    if (error) setMessage("Unable to load records: " + error.message);
    else setRows((data ?? []) as Array<Record<string, unknown>>);
    const lookups:Record<string,Array<{value:string;label:string}>>={};
    await Promise.all(fields.filter(field=>field.lookup).map(async field=>{
      const lookup=field.lookup!;
      const valueField=lookup.valueField??"id";
      let query=supabase.from(lookup.table).select(valueField+","+lookup.labelField).eq("church_id",churchId).limit(500);
      if(lookup.filterField&&lookup.filterValue)query=query.eq(lookup.filterField,lookup.filterValue);
      const {data:options}=await query;
      lookups[field.name]=(options??[]).map(item=>({value:String(item[valueField]),label:String(item[lookup.labelField]??item[valueField])}));
    }));
    setLookupOptions(lookups);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [churchId, table]);

  function openNew() { setValues(Object.fromEntries(fields.filter(field=>field.defaultValue!==undefined).map(field=>[field.name,field.defaultValue!] ))); setEditingId(null); setShow(true); }
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

  async function remove(row: Record<string, unknown>) {
    if (!supabase || !churchId) return;
    if (!window.confirm("Delete this record? This action may be restricted by church policy.")) return;
    const { error } = await supabase.from(table).delete().eq("id", String(row.id)).eq("church_id", churchId);
    if (error) setMessage("Unable to delete record: " + error.message);
    else { setMessage("Record deleted."); await load(); }
  }

  return <>
    <div className="page-intro"><div><h2>{title}</h2><p>{description}</p></div>{!readOnly && <button className="primary-button" disabled={!churchId} onClick={openNew}><Plus size={17}/> Add record</button>}</div>
    {message && <div className="notice"><span>{message}</span><button onClick={() => setMessage("")}><X size={15}/></button></div>}
    {show && <div className="panel form-panel"><div className="form-grid">{fields.map(field => <div key={field.name}><label>{field.label}{field.required ? " *" : ""}</label>{field.type === "boolean" ? <input type="checkbox" checked={values[field.name] === "true"} onChange={event => setValues(old => ({ ...old, [field.name]: String(event.target.checked) }))}/> : field.lookup ? <select className="field" required={field.required} value={values[field.name]??""} onChange={event=>setValues(old=>({...old,[field.name]:event.target.value}))}><option value="">Select {field.label.toLowerCase()}</option>{(lookupOptions[field.name]??[]).map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input className="field" type={field.type ?? "text"} required={field.required} value={values[field.name] ?? ""} onChange={event => setValues(old => ({ ...old, [field.name]: event.target.value }))}/>}</div>)}</div><div className="modal-actions"><button className="secondary-button" onClick={closeForm}>Cancel</button><button className="primary-button" disabled={saving || !fields.some(field => (values[field.name] ?? "").trim())} onClick={() => void save()}>{saving ? "Saving..." : editingId ? "Update record" : "Save record"}</button></div></div>}
    <div className="panel">{loading ? <div className="empty-state">Loading records...</div> : rows.length ? <div className="records-table"><div className="record-row record-head"><span>{title} record</span>{(displayAllFields?fields:fields.slice(0,3)).map(field=><span key={field.name}>{field.label}</span>)}{extraDisplay.map(field=><span key={field.name}>{field.label}</span>)}{!readOnly && <span>Actions</span>}</div>{rows.map(row=><div className="record-row" key={String(row.id)}><b>{String(row[fields[0]?.name] ?? "Record")}</b>{(displayAllFields?fields.slice(1):fields.slice(1,3)).map(field=><span key={field.name}>{String(row[field.name] ?? "—")}</span>)}{extraDisplay.map(field=><span key={field.name}>{String(row[field.name]??"—")}</span>)}{!readOnly && <span className="record-actions">{postJournal && row.status === "draft" && <button className="secondary-button" onClick={()=>void postEntry(row)}>Post</button>}{financialAction==="donation"&&row.status==="draft"&&<button className="secondary-button" onClick={()=>void runFinancialAction(row)}>Post donation</button>}{financialAction==="expense"&&row.status==="draft"&&<button className="secondary-button" onClick={()=>void runFinancialAction(row)}>Approve</button>}{financialAction==="expense"&&row.status==="approved"&&<button className="secondary-button" onClick={()=>void runFinancialAction(row)}>Post expense</button>}<button className="icon-button" title="Edit record" onClick={()=>openEdit(row)}><Edit2 size={15}/></button><button className="icon-button" title="Delete record" onClick={()=>void remove(row)}><Trash2 size={15}/></button></span>}</div>)}</div> : <div className="empty-state"><ClipboardList/><b>No records yet</b><small>{churchId ? "Add the first record to start this register." : "Sign in and create a church workspace first."}</small></div>}</div>
  </>;
}

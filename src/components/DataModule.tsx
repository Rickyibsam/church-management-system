import { useEffect, useState } from "react";
import { ClipboardList, Edit2, Plus, Trash2, X } from "lucide-react";
import { supabase } from "../lib/supabase";

type Field = { name: string; label: string; type?: "text" | "number" | "date" | "datetime-local"; required?: boolean };
type Props = { churchId: string | null; table: string; title: string; description: string; fields: Field[]; orderBy?: string; readOnly?: boolean; postJournal?: boolean };

export default function DataModule({ churchId, table, title, description, fields, orderBy = "created_at", readOnly = false, postJournal = false }: Props) {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!supabase || !churchId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const columns = ["id", ...fields.map(field => field.name)].join(",");
    let request = supabase.from(table).select(columns).eq("church_id", churchId).limit(100);
    if (orderBy && (orderBy === "created_at" || fields.some(field => field.name === orderBy))) request = request.order(orderBy, { ascending: false });
    const { data, error } = await request;
    if (error) setMessage("Unable to load records: " + error.message);
    else setRows((data ?? []) as Array<Record<string, unknown>>);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [churchId, table]);

  function openNew() { setValues({}); setEditingId(null); setShow(true); }
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
      if (field.type === "number") {
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

  async function postEntry(row: Record<string, unknown>) {\n    if (!supabase) return;\n    setMessage("");\n    const { data, error } = await supabase.rpc("post_journal_entry", { p_entry_id: String(row.id) });\n    if (error) setMessage("Unable to post journal entry: " + error.message);\n    else { setMessage("Journal entry posted successfully."); await load(); }\n  }\n\n  async function remove(row: Record<string, unknown>) {
    if (!supabase || !churchId) return;
    if (!window.confirm("Delete this record? This action may be restricted by church policy.")) return;
    const { error } = await supabase.from(table).delete().eq("id", String(row.id)).eq("church_id", churchId);
    if (error) setMessage("Unable to delete record: " + error.message);
    else { setMessage("Record deleted."); await load(); }
  }

  return <>
    <div className="page-intro"><div><h2>{title}</h2><p>{description}</p></div>{!readOnly && <button className="primary-button" disabled={!churchId} onClick={openNew}><Plus size={17}/> Add record</button>}</div>
    {message && <div className="notice"><span>{message}</span><button onClick={() => setMessage("")}><X size={15}/></button></div>}
    {show && <div className="panel form-panel"><div className="form-grid">{fields.map(field => <div key={field.name}><label>{field.label}{field.required ? " *" : ""}</label><input className="field" type={field.type ?? "text"} required={field.required} value={values[field.name] ?? ""} onChange={event => setValues(old => ({ ...old, [field.name]: event.target.value }))}/></div>)}</div><div className="modal-actions"><button className="secondary-button" onClick={closeForm}>Cancel</button><button className="primary-button" disabled={saving || !fields.some(field => (values[field.name] ?? "").trim())} onClick={() => void save()}>{saving ? "Saving..." : editingId ? "Update record" : "Save record"}</button></div></div>}
    <div className="panel">{loading ? <div className="empty-state">Loading records...</div> : rows.length ? <div className="records-table"><div className="record-row record-head"><span>{title} record</span>{fields.slice(0,3).map(field=><span key={field.name}>{field.label}</span>)}{!readOnly && <span>Actions</span>}</div>{rows.map(row=><div className="record-row" key={String(row.id)}><b>{String(row[fields[0]?.name] ?? "Record")}</b>{fields.slice(0,3).map(field=><span key={field.name}>{String(row[field.name] ?? "—")}</span>)}{!readOnly && <span className="record-actions">{postJournal && row.status === "draft" && <button className="secondary-button" onClick={()=>void postEntry(row)}>Post</button>}<button className="icon-button" title="Edit record" onClick={()=>openEdit(row)}><Edit2 size={15}/></button><button className="icon-button" title="Delete record" onClick={()=>void remove(row)}><Trash2 size={15}/></button></span>}</div>)}</div> : <div className="empty-state"><ClipboardList/><b>No records yet</b><small>{churchId ? "Add the first record to start this register." : "Sign in and create a church workspace first."}</small></div>}</div>
  </>;
}

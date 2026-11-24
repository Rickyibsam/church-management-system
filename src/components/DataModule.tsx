import { useEffect, useState } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { supabase } from "../lib/supabase";

type Field = { name: string; label: string; type?: "text" | "number" | "date" | "datetime-local" };
type Props = { churchId: string | null; table: string; title: string; description: string; fields: Field[] };

export default function DataModule({ churchId, table, title, description, fields }: Props) {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!supabase || !churchId) { setRows([]); return; }
    const columns = ["id", ...fields.map(field => field.name), "created_at"].join(",");
    const { data, error } = await supabase.from(table).select(columns).eq("church_id", churchId).order("created_at", { ascending: false }).limit(100);
    if (error) setMessage(error.message);
    else setRows((data ?? []) as Array<Record<string, unknown>>);
  }

  useEffect(() => { void load(); }, [churchId, table]);

  async function save() {
    if (!supabase || !churchId) return;
    setSaving(true);
    setMessage("");
    const payload: Record<string, unknown> = { church_id: churchId };
    for (const field of fields) {
      const value = values[field.name] ?? "";
      if (!value.trim()) continue;
      payload[field.name] = field.type === "number" ? Number(value) : field.type === "datetime-local" ? new Date(value).toISOString() : value;
    }
    const { error } = await supabase.from(table).insert(payload);
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    setValues({});
    setShow(false);
    setMessage("Record saved.");
    await load();
  }

  return <>
    <div className="page-intro"><div><h2>{title}</h2><p>{description}</p></div><button className="primary-button" disabled={!churchId} onClick={() => setShow(true)}><Plus size={17}/> Add record</button></div>
    {message && <div className="notice">{message}</div>}
    {show && <div className="panel form-panel"><div className="form-grid">{fields.map(field => <div key={field.name}><label>{field.label}</label><input className="field" type={field.type ?? "text"} value={values[field.name] ?? ""} onChange={event => setValues(old => ({ ...old, [field.name]: event.target.value }))}/></div>)}</div><div className="modal-actions"><button className="secondary-button" onClick={() => setShow(false)}>Cancel</button><button className="primary-button" disabled={saving || !fields.some(field => (values[field.name] ?? "").trim())} onClick={() => void save()}>{saving ? "Saving..." : "Save record"}</button></div></div>}
    <div className="panel">{rows.length ? <div className="records-table"><div className="record-row record-head"><span>{title} record</span>{fields.slice(0, 3).map(field => <span key={field.name}>{field.label}</span>)}</div>{rows.map(row => <div className="record-row" key={String(row.id)}><b>{String(row[fields[0]?.name] ?? "Record")}</b>{fields.slice(0, 3).map(field => <span key={field.name}>{String(row[field.name] ?? "—")}</span>)}</div>)}</div> : <div className="empty-state"><ClipboardList/><b>No records yet</b><small>{churchId ? "Add the first record to start this register." : "Sign in and create a church workspace first."}</small></div>}</div>
  </>;
}

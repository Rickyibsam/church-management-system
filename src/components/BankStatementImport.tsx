import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Account = { id: string; name: string; currency_code: string };

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (ch === '"') quoted = false;
      else value += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(value); value = ""; }
    else if (ch === "\n") { row.push(value.replace(/\r$/, "")); if (row.some(cell => cell.trim())) rows.push(row); row = []; value = ""; }
    else value += ch;
  }
  row.push(value.replace(/\r$/, ""));
  if (row.some(cell => cell.trim())) rows.push(row);
  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  return rows;
}

function dateValue(raw: string): string {
  const value = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid statement date: " + value);
  return parsed.toISOString().slice(0, 10);
}

export default function BankStatementImport({ churchId }: { churchId: string | null }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [currency, setCurrency] = useState("PKR");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Array<{statement_date:string;reference_number:string|null;description:string;statement_amount:number;currency_code:string}>>([]);

  useEffect(() => { void loadAccounts(); }, [churchId]);

  async function loadAccounts() {
    if (!supabase || !churchId) return;
    const { data, error } = await supabase.from("financial_accounts").select("id,name,currency_code").eq("church_id", churchId).order("name");
    if (error) { setMessage(error.message); return; }
    const rows = (data ?? []) as Account[];
    setAccounts(rows);
    if (!accountId && rows[0]) { setAccountId(rows[0].id); setCurrency(rows[0].currency_code || "PKR"); }
  }

  async function prepare() {
    setMessage("");
    setPreview([]);
    if (!file || !accountId) { setMessage("Select a cash/bank account and CSV file."); return; }
    try {
      const rows = parseCsv(await file.text());
      if (rows.length < 2) throw new Error("The CSV must contain a header and at least one statement row.");
      const headers = rows[0].map(value => value.trim().toLowerCase().replace(/[ _-]+/g, ""));
      const index = (names: string[]) => headers.findIndex(header => names.includes(header));
      const date = index(["date","statementdate","transactiondate"]);
      const description = index(["description","narration","details","particulars"]);
      const amount = index(["amount","transactionamount","signedamount"]);
      const reference = index(["reference","referencenumber","ref","transactionid"]);
      if ([date, description, amount].some(value => value < 0)) throw new Error("CSV headers must include Date, Description and Amount. Reference is optional.");
      const parsed = rows.slice(1).map((row, position) => {
        const rawAmount = (row[amount] ?? "").trim().replace(/,/g, "");
        const number = Number(rawAmount);
        if (!Number.isFinite(number) || number === 0) throw new Error("Row " + (position + 2) + " has an invalid or zero amount.");
        const descriptionText = (row[description] ?? "").trim();
        if (!descriptionText) throw new Error("Row " + (position + 2) + " has no description.");
        return {
          statement_date: dateValue(row[date] ?? ""),
          reference_number: reference >= 0 ? ((row[reference] ?? "").trim() || null) : null,
          description: descriptionText.slice(0, 1000),
          statement_amount: number,
          currency_code: currency.trim().toUpperCase()
        };
      });
      setPreview(parsed);
      setMessage(parsed.length + " statement rows validated. Review and import when ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to read this CSV file.");
    }
  }

  async function importRows() {
    if (!supabase || !churchId || !accountId || !preview.length) return;
    setBusy(true); setMessage("");
    const references = preview.filter(row => row.reference_number).map(row => row.reference_number!);
    if (references.length) {
      const { data: existing, error } = await supabase.from("bank_reconciliation_items").select("reference_number,statement_date").eq("church_id", churchId).eq("financial_account_id", accountId).in("reference_number", references);
      if (error) { setBusy(false); setMessage(error.message); return; }
      const duplicate = new Set((existing ?? []).map(row => row.reference_number + "|" + row.statement_date));
      const filtered = preview.filter(row => !row.reference_number || !duplicate.has(row.reference_number + "|" + row.statement_date));
      if (filtered.length !== preview.length) {
        setBusy(false); setMessage((preview.length - filtered.length) + " duplicate reference/date row(s) were skipped. Please prepare the file again to import only new rows.");
        setPreview(filtered); return;
      }
    }
    const payload = preview.map(row => ({ church_id: churchId, financial_account_id: accountId, ...row }));
    const { error } = await supabase.from("bank_reconciliation_items").insert(payload);
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    setMessage(preview.length + " statement rows imported successfully.");
    setPreview([]);
    setFile(null);
  }

  return <section className="panel settings-panel">
    <div className="page-intro"><div><h3>Import bank statement (CSV)</h3><p>Upload a CSV containing Date, Description and Amount columns. Reference is optional. Positive amounts are credits and negative amounts are debits.</p></div></div>
    <div className="form-grid">
      <div><label>Cash / bank account</label><select className="field" value={accountId} onChange={event => {setAccountId(event.target.value); const found=accounts.find(item=>item.id===event.target.value); if(found?.currency_code)setCurrency(found.currency_code);}}><option value="">Select account</option>{accounts.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div><label>Currency code</label><input className="field" value={currency} maxLength={3} onChange={event=>setCurrency(event.target.value.toUpperCase())}/></div>
      <div className="form-full"><label>Statement CSV file</label><input className="field" type="file" accept=".csv,text/csv" onChange={event=>{setFile(event.target.files?.[0]??null);setPreview([]);}}/></div>
    </div>
    <div className="modal-actions"><button className="secondary-button" disabled={!file||!accountId} onClick={()=>void prepare()}>Validate CSV</button><button className="primary-button" disabled={!preview.length||busy} onClick={()=>void importRows()}>{busy?"Importing...":"Import validated rows"}</button></div>
    {message&&<p className="helper" role="status">{message}</p>}
    {preview.length>0&&<div className="table-wrap"><table><thead><tr><th>Date</th><th>Reference</th><th>Description</th><th>Amount</th><th>Currency</th></tr></thead><tbody>{preview.slice(0,20).map((row,index)=><tr key={index}><td>{row.statement_date}</td><td>{row.reference_number??"—"}</td><td>{row.description}</td><td>{row.statement_amount.toLocaleString()}</td><td>{row.currency_code}</td></tr>)}</tbody></table>{preview.length>20&&<p className="helper">Showing first 20 of {preview.length} validated rows.</p>}</div>}
  </section>;
}

import { useEffect, useMemo, useState } from "react";
import {
  Activity, Baby, Banknote, Bell, BookOpen, Building2, CalendarDays,
  CheckCircle2, ChevronDown, Church, FileBadge, FileText,
  FolderLock, HeartHandshake, Home, LayoutDashboard, LogOut,
  Menu, Plus, Search, Settings, ShieldCheck, Users, Wallet, X
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import type { CertificateType, ModuleKey } from "./types";
import DataModule from "./components/DataModule";
import DocumentReview from "./components/DocumentReview";
import TeamManagement from "./components/TeamManagement";
import CertificatePrint from "./components/CertificatePrint";
import CertificateVerify from "./components/CertificateVerify";
import OperationsHub from "./components/OperationsHub";
import MemberDocuments from "./components/MemberDocuments";
import CertificateTemplateAssets from "./components/CertificateTemplateAssets";

const nav: { key: ModuleKey; label: string; icon: typeof Home; group: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { key: "churches", label: "Churches & Branches", icon: Church, group: "Administration" },
  { key: "team", label: "Users & Permissions", icon: ShieldCheck, group: "Administration" },
  { key: "members", label: "Members", icon: Users, group: "People" },
  { key: "families", label: "Family Register", icon: HeartHandshake, group: "People" },
  { key: "certificates", label: "Certificates & Registers", icon: FileBadge, group: "Records" },
  { key: "documents", label: "Document Verification", icon: FolderLock, group: "Records" },
  { key: "attendance", label: "Attendance", icon: ClipboardList, group: "Ministry" },
  { key: "ministries", label: "Ministries", icon: BookOpen, group: "Ministry" },
  { key: "events", label: "Events & Calendar", icon: CalendarDays, group: "Ministry" },
  { key: "pastoral", label: "Pastoral Care", icon: HeartHandshake, group: "Ministry" },
  { key: "finance", label: "Accounts & Expenses", icon: Wallet, group: "Finance" },
  { key: "donations", label: "Tithes & Donations", icon: Banknote, group: "Finance" },
  { key: "assets", label: "Assets & Inventory", icon: Building2, group: "Management" },
  { key: "reports", label: "Reports & Audit", icon: Activity, group: "Management" },
  { key: "settings", label: "Settings", icon: Settings, group: "Management" }
];

const certTypes: { value: CertificateType; label: string; prefix: string }[] = [
  { value: "marriage", label: "Marriage", prefix: "MAR" },
  { value: "birth", label: "Birth / Child Record", prefix: "BIR" },
  { value: "death", label: "Death Record", prefix: "DEA" },
  { value: "baptism", label: "Baptism", prefix: "BAP" },
  { value: "family", label: "Family Registration", prefix: "FAM" },
  { value: "membership", label: "Membership", prefix: "MEM" },
  { value: "dedication", label: "Child Dedication", prefix: "DED" },
  { value: "confirmation", label: "Confirmation", prefix: "CON" },
  { value: "ordination", label: "Ordination", prefix: "ORD" },
  { value: "transfer", label: "Church Transfer", prefix: "TRF" }
];

function App() {
  const [active, setActive] = useState<ModuleKey>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [certOpen, setCertOpen] = useState(false);
  const [certType, setCertType] = useState<CertificateType>("marriage");
  const [certificateRefresh, setCertificateRefresh] = useState(0);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [churchName, setChurchName] = useState("");
  const [churchOptions,setChurchOptions] = useState<Array<{id:string;display_name:string}>>([]);
  const [churchOpen, setChurchOpen] = useState(false);
  const [legalName, setLegalName] = useState("");
  const [countryCode, setCountryCode] = useState("PK");
  const [currencyCode, setCurrencyCode] = useState("PKR");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUserEmail(data.session?.user.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUserEmail(session?.user.email ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadWorkspace() {
      if (!supabase || !userEmail) { setChurchId(null); setChurchName(""); return; }
      const { data: memberships, error: membershipError } = await supabase.from("church_members").select("church_id").eq("status", "active");
      if (!alive) return;
      if (membershipError) { setNotice("Unable to load church workspaces: " + membershipError.message); return; }
      const ids = [...new Set((memberships ?? []).map(item => item.church_id as string))];
      if (!ids.length) { setChurchId(null); setChurchName(""); setChurchOptions([]); return; }
      const { data: churches, error: churchError } = await supabase.from("churches").select("id,display_name").in("id",ids).order("display_name");
      if (!alive) return;
      if (churchError) { setNotice("Unable to load church details: " + churchError.message); return; }
      const options=(churches??[]) as Array<{id:string;display_name:string}>;
      setChurchOptions(options);
      const selected=options.find(item=>item.id===churchId)??options[0];
      if (selected) { setChurchId(selected.id); setChurchName(selected.display_name); }
    }
    void loadWorkspace();
    return () => { alive = false; };
  }, [userEmail]);

  const activeItem = nav.find(item => item.key === active)!;
  const grouped = useMemo(() => nav.reduce<Record<string, typeof nav>>((acc, item) => {
    (acc[item.group] ??= []).push(item); return acc;
  }, {}), []);
  const filtered = nav.filter(item => item.label.toLowerCase().includes(query.toLowerCase()));

  async function signIn() {
    if (!supabase) { setNotice("Add Supabase URL and publishable key to your local environment first."); return; }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setNotice(error?.message ?? "Signed in successfully.");
    if (!error) setAuthOpen(false);
  }
  async function signUp() {
    if (!supabase) { setNotice("Add Supabase URL and publishable key to your local environment first."); return; }
    const { error } = await supabase.auth.signUp({ email, password });
    setNotice(error?.message ?? "Account created. Check your email if confirmation is enabled.");
  }
  async function createChurch() {
    if (!supabase) return;
    const { data, error } = await supabase.rpc("create_church", { p_legal_name: legalName, p_display_name: legalName, p_country_code: countryCode, p_currency_code: currencyCode, p_timezone: countryCode === "PK" ? "Asia/Karachi" : "UTC" });
    if (error) { setNotice(error.message); return; }
    setChurchId(data as string); setChurchName(legalName); setChurchOptions(old=>[...old,{id:data as string,display_name:legalName}]); setChurchOpen(false); setNotice("Church workspace created. You are its owner.");
  }
  async function signOut() {
    await supabase?.auth.signOut(); setNotice("You have signed out.");
  }

  const verificationToken = new URLSearchParams(window.location.search).get("verify");
  if (verificationToken) return <CertificateVerify token={verificationToken}/>;

  return <div className="app-shell">
    {sidebarOpen && <button className="scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <aside className={sidebarOpen ? "sidebar open" : "sidebar"}>
      <div className="brand"><div className="brand-mark"><Church size={22}/></div><div><b>Church360</b><small>Management System</small></div><button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)}><X/></button></div>
      <button className="church-switch" onClick={() => setChurchOpen(true)}><span className="church-avatar">C</span><span><b>{churchName || "Create church workspace"}</b><small>{churchName ? "Active church" : "Setup your first church"}</small></span><ChevronDown size={16}/></button>
      <div className="nav-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a module..." /></div>
      <nav>{(query ? { Search: filtered } : grouped) && Object.entries(query ? { Search: filtered } : grouped).map(([group, items]) =>
        <section className="nav-group" key={group}><label>{group}</label>{items.map(item => {
          const Icon = item.icon; return <button key={item.key} className={active === item.key ? "nav-item active" : "nav-item"} onClick={() => { setActive(item.key); setSidebarOpen(false); }}><Icon size={18}/><span>{item.label}</span></button>;
        })}</section>
      )}</nav>
      <div className="sidebar-bottom"><div className="secure-note"><ShieldCheck size={17}/><span>Church data protection<br/><small>Tenant isolation active</small></span></div><small>Church360 · Initial build</small></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="top-left"><button className="icon-button menu-toggle" onClick={() => setSidebarOpen(true)}><Menu/></button><div><div className="breadcrumbs">Workspace <span>/</span> {activeItem.label}</div><h1>{activeItem.label}</h1></div></div><div className="top-actions"><span className={isSupabaseConfigured ? "connection online" : "connection"}><i/> {isSupabaseConfigured ? "Supabase configured" : "Setup required"}</span><button className="icon-button" title="Notifications" onClick={()=>setActive("reports")}><Bell/></button>{userEmail ? <button className="user-chip" onClick={signOut}><span className="user-avatar">{userEmail[0]?.toUpperCase()}</span><span>{userEmail}</span><LogOut size={15}/></button> : <button className="primary-button small" onClick={() => setAuthOpen(true)}>Sign in</button>}</div></header>

      <div className="content">
        {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice("")}><X size={15}/></button></div>}
        {active === "dashboard" ? <Dashboard onNavigate={setActive} onNew={() => setCertOpen(true)} churchName={churchName} churchId={churchId}/> :
          active === "certificates" ? <Certificates churchId={churchId} onNew={() => setCertOpen(true)} refresh={certificateRefresh}/> :
          active === "members" || active === "families" ? <People kind={active} churchId={churchId}/> :
          active === "team" ? <TeamManagement churchId={churchId}/> :
          active === "churches" ? <DataModule churchId={churchId} table="church_branches" title="Church Branches & Campuses" description="Manage campuses, branch contact details and locations for this church." fields={[{name:"name",label:"Branch name"},{name:"branch_code",label:"Branch code"},{name:"address",label:"Address"},{name:"phone",label:"Phone"},{name:"is_head_office",label:"Head office",type:"boolean",defaultValue:"false"}]}/> :
          active === "documents" ? <DocumentReview churchId={churchId}/> :
          active === "attendance" ? <OperationsHub churchId={churchId} kind="attendance"/> :
          active === "ministries" ? <><DataModule churchId={churchId} table="ministries" title="Ministries" description="Organize ministry teams, leaders and activities." fields={[{name:"name",label:"Ministry name",required:true},{name:"branch_id",label:"Branch",lookup:{table:"church_branches",labelField:"name"}},{name:"description",label:"Description"},{name:"leader_member_id",label:"Ministry leader",lookup:{table:"members",labelField:"member_number"}}]}/><DataModule churchId={churchId} table="ministry_members" title="Ministry team members" description="Assign church members to ministry teams and record their roles." fields={[{name:"ministry_id",label:"Ministry",required:true,lookup:{table:"ministries",labelField:"name"}},{name:"member_id",label:"Member",required:true,lookup:{table:"members",labelField:"member_number"}},{name:"ministry_role",label:"Team role"},{name:"joined_at",label:"Joined date",type:"date"}]}/></> :
          active === "events" ? <DataModule churchId={churchId} table="church_events" title="Events & Calendar" description="Plan worship services, celebrations, meetings and community events." fields={[{name:"title",label:"Event title"},{name:"branch_id",label:"Branch",lookup:{table:"church_branches",labelField:"name"}},{name:"event_type",label:"Event type"},{name:"starts_at",label:"Starts at",type:"datetime-local"},{name:"location",label:"Location"},{name:"description",label:"Description"}]}/> :
          active === "pastoral" ? <OperationsHub churchId={churchId} kind="pastoral"/> :
          active === "finance" ? <OperationsHub churchId={churchId} kind="finance"/> : active === "donations" ? <DataModule churchId={churchId} table="donations" title="Tithes & Donations" description="Record donations, post them to the general ledger and generate receipt numbers." financialAction="donation" extraColumns={["status","receipt_number"]} extraDisplay={[{name:"receipt_number",label:"Receipt no."},{name:"status",label:"Status"}]} fields={[{name:"donor_name",label:"Donor name"},{name:"branch_id",label:"Branch",lookup:{table:"church_branches",labelField:"name"}},{name:"donation_type",label:"Donation type"},{name:"amount",label:"Amount",type:"number"},{name:"currency_code",label:"Currency code"},{name:"donated_at",label:"Donation date",type:"datetime-local"},{name:"account_id",label:"Cash / bank account",lookup:{table:"financial_accounts",labelField:"name"}},{name:"income_account_id",label:"Income chart account",lookup:{table:"chart_of_accounts",labelField:"account_name",filterField:"account_type",filterValue:"income"}},{name:"payment_method",label:"Payment method"},{name:"notes",label:"Notes"}]}/> :
          active === "assets" ? <OperationsHub churchId={churchId} kind="assets"/> :
          active === "reports" ? <OperationsHub churchId={churchId} kind="reports"/> :
          <SettingsPage churchId={churchId}/>}
      </div>
    </main>

    {churchOpen && <Modal title="Church workspaces" onClose={() => setChurchOpen(false)}><div className="workspace-list"><h3>Your churches</h3>{churchOptions.length?churchOptions.map(item=><button key={item.id} className={item.id===churchId?"workspace-option selected":"workspace-option"} onClick={()=>{setChurchId(item.id);setChurchName(item.display_name);setChurchOpen(false);}}><Church size={18}/><span>{item.display_name}</span>{item.id===churchId&&<CheckCircle2 size={16}/>}</button>):<p className="muted">No church workspaces are assigned to this account yet.</p>}<div className="divider-line"></div><h3>Create another church</h3><p className="muted">Your signed-in account will become the first owner.</p><label>Church legal / registered name</label><input className="field" value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="Church registered name"/><label>Country code</label><input className="field" value={countryCode} maxLength={2} onChange={e => setCountryCode(e.target.value.toUpperCase())}/><label>Default currency</label><input className="field" value={currencyCode} maxLength={3} onChange={e => setCurrencyCode(e.target.value.toUpperCase())}/><div className="modal-actions"><button className="secondary-button" onClick={() => setChurchOpen(false)}>Cancel</button><button className="primary-button" onClick={createChurch} disabled={!userEmail || !legalName.trim()}>Create workspace</button></div></div></Modal>}
    {authOpen && <Modal title="Sign in to Church360" onClose={() => setAuthOpen(false)}><p className="muted">Use your church account. New accounts require an administrator to assign a church and role.</p><label>Email address</label><input className="field" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/><label>Password</label><input className="field" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"/><div className="modal-actions"><button className="secondary-button" onClick={signUp}>Create account</button><button className="primary-button" onClick={signIn}>Sign in</button></div></Modal>}
    {certOpen && <CertificateModal type={certType} setType={setCertType} churchId={churchId} countryCode={countryCode} onClose={() => setCertOpen(false)} onSave={async (payload) => { if (!supabase || !churchId) { setNotice("Sign in and create/select a church workspace before saving registrations."); return; } const { data, error } = await supabase.rpc("create_certificate_application", { p_church_id: churchId, p_certificate_type: certType, p_primary_person_name: payload.fullName, p_secondary_person_name: payload.secondName || null, p_event_date: payload.date || null, p_form_data: payload.formData, p_notes: payload.notes || null }); if (error) { setNotice(error.message); return; } const certId = data as string; const { data: authData } = await supabase.auth.getUser(); const { data: requirements } = await supabase.from("certificate_document_requirements").select("id,document_code").eq("church_id",churchId).eq("certificate_type",certType).eq("is_active",true).or("applicable_country.is.null,applicable_country.eq."+countryCode); for (const document of payload.documents.filter(item => item.file)) { const file = document.file!; const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_"); const path = churchId + "/" + certId + "/" + crypto.randomUUID() + "-" + safeName; const upload = await supabase.storage.from("church-private-documents").upload(path,file,{contentType:file.type,upsert:false}); if (upload.error) { setNotice("Registration saved, but an attachment upload failed: " + upload.error.message); return; } const requirement = requirements?.find(item => item.document_code === document.code); const saved = await supabase.from("certificate_attachments").insert({church_id:churchId,certificate_id:certId,requirement_id:requirement?.id??null,document_code:document.code,original_file_name:file.name,storage_path:path,mime_type:file.type,file_size_bytes:file.size,uploaded_by:authData.user?.id??null}); if (saved.error) { setNotice("Registration saved, but attachment metadata could not be saved: " + saved.error.message); return; } } const { data: record } = await supabase.from("certificates").select("registration_number").eq("id", certId).maybeSingle(); setCertOpen(false); setCertificateRefresh(value=>value+1); setNotice("Registration draft saved: " + (record?.registration_number ?? certId)); }}/>}
  </div>;
}

function Dashboard({ onNavigate, onNew, churchName, churchId }: { onNavigate: (key: ModuleKey) => void; onNew: () => void; churchName: string; churchId: string | null }) {
  const [stats,setStats]=useState([{label:"Registered Members",value:"—",hint:"Member directory",icon:Users},{label:"Families",value:"—",hint:"Family register",icon:HeartHandshake},{label:"Certificates Issued",value:"—",hint:"Certificate register",icon:FileBadge},{label:"Donations This Month",value:"—",hint:"Financial overview",icon:Banknote}]);
  const [loading,setLoading]=useState(false);
  useEffect(()=>{
    let alive=true;
    async function load(){
      if(!supabase||!churchId){setStats(old=>old.map(item=>({...item,value:"—"})));return;}
      setLoading(true);
      const now=new Date();const monthStart=new Date(now.getFullYear(),now.getMonth(),1).toISOString();const nextMonth=new Date(now.getFullYear(),now.getMonth()+1,1).toISOString();
      const [members,families,certificates,donations]=await Promise.all([
        supabase.from("members").select("id",{count:"exact",head:true}).eq("church_id",churchId),
        supabase.from("families").select("id",{count:"exact",head:true}).eq("church_id",churchId),
        supabase.from("certificates").select("id",{count:"exact",head:true}).eq("church_id",churchId).eq("status","issued"),
        supabase.from("donations").select("amount").eq("church_id",churchId).gte("donated_at",monthStart).lt("donated_at",nextMonth)
      ]);
      if(!alive)return;
      const total=(donations.data??[]).reduce((sum,row)=>sum+Number(row.amount??0),0);
      setStats([
        {label:"Registered Members",value:String(members.count??0),hint:"Member directory",icon:Users},
        {label:"Families",value:String(families.count??0),hint:"Family register",icon:HeartHandshake},
        {label:"Certificates Issued",value:String(certificates.count??0),hint:"Certificate register",icon:FileBadge},
        {label:"Donations This Month",value:new Intl.NumberFormat(undefined,{maximumFractionDigits:2}).format(total),hint:"Current church currency",icon:Banknote}
      ]);
      setLoading(false);
    }
    void load();return()=>{alive=false;};
  },[churchId]);
  return <><div className="welcome-row"><div><div className="eyebrow">CHURCH ADMINISTRATION</div><h2>{churchName ? "Welcome to " + churchName : "Welcome to your church workspace"}</h2><p>One secure place to manage people, records, ministries and resources.</p></div><button className="primary-button" onClick={onNew} disabled={!churchId}><Plus size={17}/> New registration</button></div>
    <div className="setup-banner"><div className="setup-icon"><ShieldCheck/></div><div><b>{churchId?"Church workspace connected":"Your workspace setup is next"}</b><p>{churchId?"Live summary data is being loaded from this church workspace.":"Sign in and create your first church workspace to manage records and invite authorized staff."}</p></div><span className="status-pill">{churchId?(loading?"Loading":"Connected"):"Setup pending"}</span></div>
    <div className="stat-grid">{stats.map(s=>{const Icon=s.icon;return <div className="stat-card" key={s.label}><div className="stat-top"><span>{s.label}</span><Icon size={19}/></div><strong>{s.value}</strong><small>{s.hint}</small></div>;})}</div>
    <div className="section-heading"><div><h3>Quick access</h3><p>Open a core area of your church administration.</p></div></div>
    <div className="quick-grid">{[{label:"Register a member",icon:Users,key:"members" as ModuleKey,desc:"Member profiles and household links"},{label:"Family register",icon:HeartHandshake,key:"families" as ModuleKey,desc:"Households and family relationships"},{label:"Certificates",icon:FileBadge,key:"certificates" as ModuleKey,desc:"Marriage, birth, death and baptism"},{label:"Church settings",icon:Settings,key:"settings" as ModuleKey,desc:"Branding, language and permissions"}].map(x=>{const Icon=x.icon;return <button className="quick-card" key={x.label} onClick={()=>onNavigate(x.key)}><span><Icon/></span><b>{x.label}</b><small>{x.desc}</small></button>;})}</div>
    <div className="section-heading"><div><h3>Development roadmap</h3><p>Build the full online system before beginning the testing phase.</p></div></div>
    <div className="roadmap"><div className="roadmap-step done"><CheckCircle2/><span><b>Project foundation</b><small>Repository and product scope</small></span><em>Created</em></div><div className="roadmap-step current"><Activity/><span><b>Core application and database</b><small>Modules, workflows and security policies</small></span><em>In progress</em></div><div className="roadmap-step"><ShieldCheck/><span><b>Complete feature implementation</b><small>All administration and church operations</small></span><em>In progress</em></div><div className="roadmap-step"><CheckCircle2/><span><b>Full testing and bug fixing</b><small>Functional, security and end-to-end testing</small></span><em>After build</em></div><div className="roadmap-step"><Baby/><span><b>Offline-capable edition</b><small>Installable PWA, local encrypted queue and sync</small></span><em>After testing</em></div></div>
  </>;
}

function Certificates({ churchId, onNew, refresh }: { churchId: string | null; onNew: () => void; refresh: number }) {
  const [printId,setPrintId] = useState<string|null>(null);
  const [records,setRecords] = useState<Array<Record<string,unknown>>>([]);
  const [message,setMessage] = useState("");
  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase || !churchId) { setRecords([]); return; }
      const {data,error} = await supabase.from("certificates").select("id,registration_number,certificate_type,primary_person_name,status,event_date,created_at").eq("church_id",churchId).order("created_at",{ascending:false});
      if (!alive) return;
      if (error) setMessage(error.message); else setRecords((data ?? []) as Array<Record<string,unknown>>);
    }
    void load();
    return () => { alive = false; };
  },[churchId,refresh]);
  async function advance(id:string,status:string,reason?:string){
    if(!supabase)return;
    setMessage("");
    const {error}=await supabase.rpc("transition_certificate",{p_certificate_id:id,p_target_status:status,p_reason:reason??null});
    if(error){setMessage("Unable to update certificate status: "+error.message);return;}
    setMessage("Certificate status updated to "+status.replaceAll("_"," ")+".");
    const {data,error:loadError}=await supabase.from("certificates").select("id,registration_number,certificate_type,primary_person_name,status,event_date,created_at").eq("church_id",churchId).order("created_at",{ascending:false});
    if(loadError)setMessage("Status updated, but the register could not refresh: "+loadError.message);
    else setRecords((data??[]) as Array<Record<string,unknown>>);
  }
  async function reissue(id:string){
    if(!supabase)return;
    const reason=window.prompt("Enter the correction or reissue reason:");
    if(!reason?.trim())return;
    const {error}=await supabase.rpc("reissue_certificate",{p_certificate_id:id,p_reason:reason.trim()});
    if(error){setMessage("Unable to reissue certificate: "+error.message);return;}
    setMessage("A replacement draft has been created. Complete its document review before issuing.");
    const {data:updated,error:loadError}=await supabase.from("certificates").select("id,registration_number,certificate_type,primary_person_name,status,event_date,created_at").eq("church_id",churchId).order("created_at",{ascending:false});
    if(loadError)setMessage("Replacement created, but register refresh failed: "+loadError.message);
    else setRecords((updated??[]) as Array<Record<string,unknown>>);
  }
  return <>
    <div className="page-intro"><div><h2>Certificates & Church Registers</h2><p>Manage applications, supporting documents, approvals and certificate issuance.</p></div><button className="primary-button" onClick={onNew}><Plus size={17}/> New registration</button></div>
    <div className="cert-grid">{certTypes.map(t => <div className="cert-card" key={t.value}><div className="cert-icon"><FileBadge/></div><div><b>{t.label}</b><small>{t.prefix}-YYYY-000001 numbering format</small></div><span className="soft-pill">Register</span></div>)}</div>
    <div className="panel"><div className="panel-heading"><div><h3>Registration register</h3><p>Draft, submitted, approved and issued church records.</p></div></div>
      {message && <div className="notice">{message}</div>}
      {records.length ? <div className="records-table"><div className="record-row record-head"><span>Registration no.</span><span>Type</span><span>Person / Family</span><span>Status</span><span>Date</span></div>{records.map(r=><div className="record-row" key={String(r.id)}><b>{String(r.registration_number)}</b><span>{String(r.certificate_type)}</span><span>{String(r.primary_person_name)}</span><span className="soft-pill">{String(r.status)}</span><span>{String(r.event_date ?? "—")}</span><span className="row-actions">{String(r.status)==="draft"&&<><button onClick={()=>void advance(String(r.id),"submitted")}>Submit</button><button onClick={()=>void advance(String(r.id),"cancelled","Cancelled by church administrator")}>Cancel</button></>}{String(r.status)==="submitted"&&<button onClick={()=>void advance(String(r.id),"under_review")}>Start review</button>}{String(r.status)==="under_review"&&<><button onClick={()=>void advance(String(r.id),"approved")}>Approve</button><button onClick={()=>{const reason=window.prompt("Enter the reason for rejecting this certificate:");if(reason?.trim())void advance(String(r.id),"rejected",reason.trim());}}>Reject</button></>}{String(r.status)==="approved"&&<button onClick={()=>void advance(String(r.id),"issued")}>Issue</button>}{String(r.status)==="issued"&&<><button onClick={()=>setPrintId(String(r.id))}>Print</button><button onClick={()=>void reissue(String(r.id))}>Correct / Reissue</button></>}</span></div>)}</div> : <div className="empty-state"><FileText/><b>No registrations yet</b><small>Start a registration to build the church's official register.</small></div>}
    </div>
    {printId&&<CertificatePrint certificateId={printId} onClose={()=>setPrintId(null)}/>}
  </>;
}
function People({ kind, churchId }: { kind: "members" | "families"; churchId: string | null }) {
  const family = kind === "families";
  const [rows,setRows] = useState<Array<Record<string,unknown>>>([]);
  const [familyOptions,setFamilyOptions] = useState<Array<{id:string;family_name:string}>>([]);
  const [branchOptions,setBranchOptions]=useState<Array<{id:string;name:string}>>([]);
  const [show,setShow] = useState(false);
  const [editingId,setEditingId] = useState<string|null>(null);
  const [search,setSearch] = useState("");
  const [selectedMemberId,setSelectedMemberId] = useState<string|null>(null);
  const [form,setForm] = useState<Record<string,string>>({});
  const [message,setMessage] = useState("");
  const [saving,setSaving] = useState(false);
  const [loading,setLoading] = useState(true);

  const memberFields = [
    ["first_name","First name"],["middle_name","Middle name"],["last_name","Last name"],
    ["gender","Gender"],["date_of_birth","Date of birth"],["phone","Phone"],["email","Email"],
    ["address","Address"],["identity_type","Identity type"],["identity_last4","Identity last 4 digits"],
    ["membership_status","Membership status"],["joined_on","Joined on"],["notes","Notes"]
  ] as const;
  const familyFields = [["family_name","Family name"],["phone","Phone"],["address","Address"],["notes","Notes"]] as const;

  async function load() {
    if(!supabase){setLoading(false);return;}
    setLoading(true);
    const activeChurchId=churchId;
    if(!activeChurchId){setRows([]);setFamilyOptions([]);setBranchOptions([]);setLoading(false);return;}
    const {data:familyData}=await supabase.from("families").select("id,family_name").eq("church_id",activeChurchId).order("family_name");
    const {data:branchData}=await supabase.from("church_branches").select("id,name").eq("church_id",activeChurchId).order("name");
    setBranchOptions((branchData??[]) as Array<{id:string;name:string}>);
    setFamilyOptions((familyData??[]) as Array<{id:string;family_name:string}>);
    const request=family
      ? supabase.from("families").select("id,family_number,family_name,phone,address,notes,branch_id,created_at").eq("church_id",activeChurchId).order("created_at",{ascending:false})
      : supabase.from("members").select("id,member_number,family_id,branch_id,first_name,middle_name,last_name,gender,date_of_birth,phone,email,address,identity_type,identity_last4,membership_status,joined_on,notes,created_at").eq("church_id",activeChurchId).order("created_at",{ascending:false});
    const {data,error}=await request;
    if(error)setMessage("Unable to load records: "+error.message);
    else setRows((data??[]) as Array<Record<string,unknown>>);
    setLoading(false);
  }
  useEffect(()=>{void load();},[family,churchId]);

  function openNew(){
    const initial:Record<string,string>={};
    (family?familyFields:memberFields).forEach(([key])=>initial[key]="");
    if(!family){initial.membership_status="active";initial.joined_on=new Date().toISOString().slice(0,10);initial.relationship="member";initial.is_primary_contact="false";}
    setForm(initial);setEditingId(null);setShow(true);
  }
  async function openEdit(row:Record<string,unknown>){
    const initial:Record<string,string>={};
    (family?familyFields:memberFields).forEach(([key])=>initial[key]=row[key]==null?"":String(row[key]).slice(0,key==="date_of_birth"||key==="joined_on"?10:undefined));
    if(!family){
      initial.family_id=String(row.family_id??"");initial.relationship="member";initial.is_primary_contact="false";
      if(row.family_id&&supabase){
        const {data}=await supabase.from("family_relationships").select("relationship,is_primary_contact").eq("church_id",churchId).eq("family_id",String(row.family_id)).eq("member_id",String(row.id)).maybeSingle();
        if(data){initial.relationship=String(data.relationship??"member");initial.is_primary_contact=String(data.is_primary_contact??false);}
      }
    }
    setForm(initial);setEditingId(String(row.id));setShow(true);
  }
  function change(key:string,value:string){setForm(old=>({...old,[key]:value}));}
  async function save(){
    if(!supabase||!churchId)return;
    const required=family?["family_name"]:["first_name","last_name"];
    if(required.some(key=>!(form[key]??"").trim())){setMessage("Please complete all required fields.");return;}
    setSaving(true);setMessage("");
    const keys=family?[...familyFields.map(([key])=>key),"branch_id"]:[...memberFields.map(([key])=>key),"family_id","branch_id"];
    const payload:Record<string,unknown>={church_id:churchId};
    keys.forEach(key=>{
      const value=form[key]??"";
      if(value.trim())payload[key]=value.trim();
      else if(["family_id","branch_id","middle_name","date_of_birth","email","address","identity_type","identity_last4","notes"].includes(key))payload[key]=null;
    });
    const result=editingId
      ? await supabase.from(family?"families":"members").update(payload).eq("id",editingId).eq("church_id",churchId).select("id").maybeSingle()
      : await supabase.from(family?"families":"members").insert(payload).select("id").single();
    if(result.error){setSaving(false);setMessage("Unable to save record: "+result.error.message);return;}
    const savedId=editingId??String(result.data?.id??"");
    if(!family&&savedId){
      const familyId=form.family_id??"";
      if(familyId){
        const {error:clearError}=await supabase.from("family_relationships").delete().eq("church_id",churchId).eq("member_id",savedId).neq("family_id",familyId);
        if(clearError){setSaving(false);setMessage("Member saved, but previous family link could not be cleared: "+clearError.message);await load();return;}
        const {error:relationshipError}=await supabase.from("family_relationships").upsert({
          church_id:churchId,family_id:familyId,member_id:savedId,
          relationship:form.relationship||"member",is_primary_contact:form.is_primary_contact==="true"
        },{onConflict:"family_id,member_id"});
        if(relationshipError){setSaving(false);setMessage("Member saved, but family relationship could not be updated: "+relationshipError.message);await load();return;}
      } else if(editingId) {
        const {error:relationshipError}=await supabase.from("family_relationships").delete().eq("church_id",churchId).eq("member_id",savedId);
        if(relationshipError){setSaving(false);setMessage("Member saved, but old family link could not be removed: "+relationshipError.message);await load();return;}
      }
    }
    setSaving(false);setShow(false);setEditingId(null);setMessage(family?"Family record saved.":"Member profile and family relationship saved.");await load();
  }
  async function archiveMember(row:Record<string,unknown>){
    if(!supabase||!churchId)return;
    const {error}=await supabase.from("members").update({membership_status:"inactive"}).eq("id",String(row.id)).eq("church_id",churchId);
    if(error)setMessage("Unable to archive member: "+error.message);
    else{setMessage("Member archived. The historical record has been retained.");await load();}
  }
  const visible=rows.filter(row=>JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));

  return <>
    <div className="page-intro"><div><h2>{family?"Family Registration":"Member Directory"}</h2><p>{family?"Maintain household profiles and contact details.":"Manage member identity, contact, membership and family information."}</p></div><button className="primary-button" onClick={openNew} disabled={!churchId}><Plus size={17}/>{family?"New family":"Add member"}</button></div>
    <div className="panel"><div className="form-grid"><div className="form-full"><label>Search register</label><input className="field" value={search} onChange={e=>setSearch(e.target.value)} placeholder={family?"Search family name, number or phone":"Search name, member number, phone or email"}/></div></div></div>
    {message&&<div className="notice">{message}</div>}
    {show&&<div className="panel form-panel"><h3>{editingId?"Edit":"New"} {family?"family":"member profile"}</h3><div className="form-grid">
      <div className="form-full"><label>Church branch</label><select className="field" value={form.branch_id??""} onChange={e=>change("branch_id",e.target.value)}><option value="">Main / default branch</option>{branchOptions.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      {(family?familyFields:memberFields).map(([key,label])=><div key={key} className={key==="address"||key==="notes"?"form-full":""}><label>{label}{(!family&&["first_name","last_name"].includes(key))||key==="family_name"?" *":""}</label>{key==="gender"?<select className="field" value={form[key]??""} onChange={e=>change(key,e.target.value)}><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="unspecified">Prefer not to say</option></select>:key==="membership_status"?<select className="field" value={form[key]??"active"} onChange={e=>change(key,e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="transferred">Transferred</option><option value="deceased">Deceased</option></select>:<input className="field" type={["date_of_birth","joined_on"].includes(key)?"date":"text"} value={form[key]??""} onChange={e=>change(key,e.target.value)}/>}</div>)}
      {!family&&<><div className="form-full"><label>Family household</label><select className="field" value={form.family_id??""} onChange={e=>change("family_id",e.target.value)}><option value="">No family linked</option>{familyOptions.map(item=><option key={item.id} value={item.id}>{item.family_name}</option>)}</select></div>{!!form.family_id&&<><div><label>Family relationship</label><select className="field" value={form.relationship??"member"} onChange={e=>change("relationship",e.target.value)}>{["head","spouse","son","daughter","parent","sibling","guardian","dependent","member","other"].map(item=><option key={item} value={item}>{item.replaceAll("_"," ")}</option>)}</select></div><div className="form-full"><label><input type="checkbox" checked={form.is_primary_contact==="true"} onChange={e=>change("is_primary_contact",String(e.target.checked))}/> Primary family contact</label></div></>}</>}
    </div><div className="modal-actions"><button className="secondary-button" onClick={()=>setShow(false)}>Cancel</button><button className="primary-button" disabled={saving} onClick={()=>void save()}>{saving?"Saving...":editingId?"Update profile":"Save record"}</button></div></div>}
    <div className="panel">{loading?<div className="empty-state">Loading records...</div>:visible.length?<div className="records-table"><div className="record-row record-head"><span>{family?"Family":"Member"}</span><span>Registration no.</span><span>Phone</span><span>{family?"Address":"Status"}</span><span>Actions</span></div>{visible.map(row=><div className="record-row" key={String(row.id)}><b>{family?String(row.family_name??""):[row.first_name,row.middle_name,row.last_name].filter(Boolean).join(" ")}</b><span>{String(family?row.family_number??"—":row.member_number??"—")}</span><span>{String(row.phone??"—")}</span><span>{String(family?row.address??"—":row.membership_status??"active")}</span><span className="record-actions"><button className="icon-button" title="Edit" onClick={()=>openEdit(row)}><Settings size={15}/></button>{!family&&<><button className="secondary-button" onClick={()=>setSelectedMemberId(selectedMemberId===String(row.id)?null:String(row.id))}>Documents</button><button className="secondary-button" onClick={()=>void archiveMember(row)} disabled={row.membership_status==="inactive"}>Archive</button></>}</span></div>)}</div>:<div className="empty-state"><Users/><b>{family?"No families registered":"No members registered"}</b><small>{churchId?"Add the first record to begin your register.":"Sign in and create a church workspace first."}</small></div>}</div>
    {!family&&selectedMemberId&&churchId&&<MemberDocuments churchId={churchId} memberId={selectedMemberId}/>}
    {family&&churchId&&<DataModule churchId={churchId} table="family_relationships" title="Family relationships" description="Connect members to households and define family roles and primary contacts." fields={[{name:"family_id",label:"Family",required:true,lookup:{table:"families",labelField:"family_name"}},{name:"member_id",label:"Member",required:true,lookup:{table:"members",labelField:"member_number"}},{name:"relationship",label:"Relationship",required:true,options:["head","spouse","child","parent","sibling","guardian","other"].map(value=>({value,label:value.charAt(0).toUpperCase()+value.slice(1)}))},{name:"is_primary_contact",label:"Primary contact",type:"boolean",defaultValue:"false"}]}/>}
  
  </>;
}

function SettingsPage({churchId}:{churchId:string|null}) {
  const [form,setForm]=useState<Record<string,string>>({legal_name:"",display_name:"",country_code:"PK",currency_code:"PKR",timezone:"Asia/Karachi",address:"",phone:"",email:"",website:"",header_text:"",footer_text:"",logo_path:""});
  const [message,setMessage]=useState("");
  const [logo,setLogo]=useState<File|null>(null);
  const [saving,setSaving]=useState(false);
  useEffect(()=>{
    let alive=true;
    async function load(){
      if(!supabase||!churchId)return;
      const {data,error}=await supabase.from("churches").select("legal_name,display_name,country_code,currency_code,timezone,address,phone,email,website,header_text,footer_text,logo_path").eq("id",churchId).maybeSingle();
      if(error){setMessage(error.message);return;}
      if(alive&&data)setForm(old=>({...old,...Object.fromEntries(Object.entries(data).map(([k,v])=>[k,String(v??"")]))}));
    }
    void load();return()=>{alive=false;};
  },[churchId]);
  function change(key:string,value:string){setForm(old=>({...old,[key]:value}));}
  async function save(){
    if(!supabase||!churchId)return;
    setSaving(true);setMessage("");
    let logoPath=form.logo_path;
    if(logo){
      const path=churchId+"/logo-"+crypto.randomUUID()+"."+logo.name.split(".").pop();
      const {error:uploadError}=await supabase.storage.from("church-branding").upload(path,logo,{contentType:logo.type,upsert:false});
      if(uploadError){setSaving(false);setMessage(uploadError.message);return;}
      logoPath=path;
    }
    const {error}=await supabase.from("churches").update({
      legal_name:form.legal_name,display_name:form.display_name,country_code:form.country_code.toUpperCase(),
      currency_code:form.currency_code.toUpperCase(),timezone:form.timezone,address:form.address,
      phone:form.phone,email:form.email,website:form.website,header_text:form.header_text,
      footer_text:form.footer_text,logo_path:logoPath,updated_at:new Date().toISOString()
    }).eq("id",churchId);
    setSaving(false);
    if(error){setMessage(error.message);return;}
    setForm(old=>({...old,logo_path:logoPath}));setLogo(null);setMessage("Church profile and certificate branding saved.");
  }
  const logoUrl=logo?URL.createObjectURL(logo):form.logo_path&&supabase?supabase.storage.from("church-branding").getPublicUrl(form.logo_path).data.publicUrl:"";
  return <>
    <div className="page-intro"><div><h2>Church Profile & Branding</h2><p>These details will be used on church records and certificate templates.</p></div><button className="primary-button" disabled={!churchId||saving} onClick={()=>void save()}>{saving?"Saving...":"Save settings"}</button></div>
    {!churchId&&<div className="notice">Sign in and create a church workspace before configuring settings.</div>}
    {message&&<div className="notice">{message}</div>}
    <div className="settings-form-grid">
      <div className="panel settings-panel"><h3>Church identity</h3><div className="form-grid">
        <div><label>Legal / registered name</label><input className="field" value={form.legal_name} onChange={e=>change("legal_name",e.target.value)}/></div>
        <div><label>Display name</label><input className="field" value={form.display_name} onChange={e=>change("display_name",e.target.value)}/></div>
        <div><label>Country code</label><input className="field" maxLength={2} value={form.country_code} onChange={e=>change("country_code",e.target.value)}/></div>
        <div><label>Currency code</label><input className="field" maxLength={3} value={form.currency_code} onChange={e=>change("currency_code",e.target.value)}/></div>
        <div className="form-full"><label>Time zone</label><input className="field" value={form.timezone} onChange={e=>change("timezone",e.target.value)} placeholder="Asia/Karachi"/></div>
        <div className="form-full"><label>Address</label><textarea className="field" rows={2} value={form.address} onChange={e=>change("address",e.target.value)}/></div>
        <div><label>Phone</label><input className="field" value={form.phone} onChange={e=>change("phone",e.target.value)}/></div>
        <div><label>Email</label><input className="field" type="email" value={form.email} onChange={e=>change("email",e.target.value)}/></div>
        <div className="form-full"><label>Website</label><input className="field" value={form.website} onChange={e=>change("website",e.target.value)}/></div>
      </div></div>
      <div className="panel settings-panel"><h3>Certificate logo, header & footer</h3>
        <label>Church logo (PNG, JPG or WebP)</label><input className="field" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setLogo(e.target.files?.[0]??null)}/>
        {logoUrl&&<div className="logo-preview"><img src={logoUrl} alt="Church logo preview"/></div>}
        <label>Certificate header text</label><textarea className="field" rows={3} value={form.header_text} onChange={e=>change("header_text",e.target.value)} placeholder="Church name, denomination, address..."/>
        <label>Certificate footer text</label><textarea className="field" rows={3} value={form.footer_text} onChange={e=>change("footer_text",e.target.value)} placeholder="Contact details, website, registration note..."/>
        <p className="helper">Logo is stored in the public branding bucket. Identity documents and personal attachments remain in private storage.</p>
      </div>
    </div>
    <div className="settings-panel-stack">
      <DataModule churchId={churchId} table="certificate_document_requirements" title="Certificate document requirements" description="Configure required supporting documents by certificate type and country. Leave country blank for a general requirement." fields={[
        {name:"certificate_type",label:"Certificate type",required:true,options:certTypes.map(item=>({value:item.value,label:item.label}))},{name:"document_code",label:"Document code",required:true},{name:"document_label",label:"Document label",required:true},{name:"description",label:"Description"},{name:"applicable_country",label:"Country code (optional)"},{name:"is_required",label:"Required",type:"boolean",defaultValue:"true"},{name:"max_file_size_bytes",label:"Maximum file size in bytes",type:"number"},{name:"sort_order",label:"Display order",type:"number"},{name:"is_active",label:"Active",type:"boolean",defaultValue:"true"}
      ]}/>
      <DataModule churchId={churchId} table="certificate_templates" title="Certificate templates" description="Configure certificate type, language, page layout, church text, pastor details and uploaded asset paths." fields={[
        {name:"certificate_type",label:"Certificate type",required:true,options:certTypes.map(item=>({value:item.value,label:item.label}))},{name:"name",label:"Template name",required:true},{name:"language_code",label:"Language code",defaultValue:"en",options:[{value:"en",label:"English"},{value:"ur",label:"Urdu"}]},{name:"page_size",label:"Page size",defaultValue:"A4",options:[{value:"A4",label:"A4"},{value:"Letter",label:"Letter"}]},{name:"orientation",label:"Orientation",defaultValue:"landscape",options:[{value:"landscape",label:"Landscape"},{value:"portrait",label:"Portrait"}]},{name:"header_text",label:"Header text"},{name:"footer_text",label:"Footer text"},{name:"pastor_name",label:"Pastor name"},{name:"logo_path",label:"Logo storage path"},{name:"background_path",label:"Background storage path"},{name:"pastor_signature_path",label:"Pastor signature storage path"},{name:"seal_path",label:"Church seal storage path"},{name:"is_default",label:"Default template",type:"boolean",defaultValue:"false"},{name:"is_active",label:"Active",type:"boolean",defaultValue:"true"}
      ]}/>
    </div>
    <CertificateTemplateAssets churchId={churchId}/>
    <div className="settings-grid">{[{title:"Certificate templates",desc:"Template layouts, signatures, seals, paper size and QR verification"},{title:"Document requirements",desc:"Required documents by certificate and jurisdiction"},{title:"Users & permissions",desc:"Roles, module access and action-level permissions"},{title:"Language & localization",desc:"English, Urdu, country, currency and time zone"},{title:"Security & audit",desc:"Access history, data retention and backups"},{title:"Branches & campuses",desc:"Manage multiple church locations"}].map(x=><div className="setting-card" key={x.title}><Settings size={18}/><b>{x.title}</b><small>{x.desc}</small></div>)}</div>
  </>;
}
function CertificateModal({ type, setType, churchId, countryCode, onClose, onSave }: { type: CertificateType; setType: (v: CertificateType) => void; churchId: string | null; countryCode: string; onClose: () => void; onSave: (payload: { fullName: string; secondName: string; date: string; eventPlace:string; familyId:string; branchId:string; notes: string; formData:Record<string,string>; documents: Array<{code:string;file:File|null}> }) => Promise<void> }) {
  const [fullName,setFullName] = useState("");
  const [secondName,setSecondName] = useState("");
  const [date,setDate] = useState("");
  const [eventPlace,setEventPlace] = useState("");
  const [familyId,setFamilyId] = useState("");
  const [branchId,setBranchId] = useState("");
  const [branchOptions,setBranchOptions] = useState<Array<{id:string;name:string}>>([]);
  const [familyOptions,setFamilyOptions] = useState<Array<{id:string;family_name:string}>>([]);
  const [primaryIdentity,setPrimaryIdentity] = useState("");
  const [secondaryIdentity,setSecondaryIdentity] = useState("");
  const [fatherName,setFatherName] = useState("");
  const [motherName,setMotherName] = useState("");
  const [witnessDetails,setWitnessDetails] = useState("");
  const [notes,setNotes] = useState("");
  const [documents,setDocuments] = useState<Record<string,File|null>>({});
  const [configuredRequirements,setConfiguredRequirements] = useState<Array<{code:string;label:string;required:boolean;acceptedMimeTypes?:string[];maxFileSizeBytes?:number}>>([]);
  const [documentError,setDocumentError]=useState("");
  useEffect(()=>{
    let alive=true;
    async function loadBranches(){
      if(!supabase||!churchId){setBranchOptions([]);return;}
      const {data}=await supabase.from("church_branches").select("id,name").eq("church_id",churchId).order("name");
      if(alive){const items=(data??[]) as Array<{id:string;name:string}>;setBranchOptions(items);if(!items.some(item=>item.id===branchId))setBranchId(items[0]?.id??"");}
    }
    void loadBranches();return()=>{alive=false;};
  },[churchId]);
  useEffect(()=>{
    let alive=true;
    async function loadFamilies(){
      if(type!=="family"||!supabase||!churchId){setFamilyOptions([]);return;}
      const {data}=await supabase.from("families").select("id,family_name").eq("church_id",churchId).order("family_name");
      if(alive)setFamilyOptions((data??[]) as Array<{id:string;family_name:string}>);
    }
    void loadFamilies();return()=>{alive=false;};
  },[type,churchId]);
  const requirements: Record<CertificateType,Array<{code:string;label:string;required:boolean;acceptedMimeTypes?:string[];maxFileSizeBytes?:number}>> = {
    marriage:[{code:"bride_cnic",label:"Bride CNIC copy",required:true},{code:"groom_cnic",label:"Groom CNIC copy",required:true},{code:"witness_1_id",label:"Witness 1 identity copy",required:true},{code:"witness_2_id",label:"Witness 2 identity copy",required:true},{code:"marriage_application",label:"Marriage application / supporting record",required:true}],
    birth:[{code:"father_id",label:"Father identity document",required:true},{code:"mother_id",label:"Mother identity document",required:true},{code:"birth_evidence",label:"Hospital slip / available birth evidence",required:true}],
    death:[{code:"deceased_id",label:"Deceased identity document (if available)",required:false},{code:"applicant_id",label:"Applicant identity document",required:true},{code:"death_evidence",label:"Hospital / death / burial evidence",required:true}],
    baptism:[{code:"member_record",label:"Member identity or church member record",required:true},{code:"guardian_consent",label:"Parent / guardian consent where applicable",required:false}],
    family:[{code:"family_head_id",label:"Family head identity document",required:true},{code:"spouse_id",label:"Spouse identity document",required:false},{code:"children_bform",label:"Children B-Forms / identity evidence",required:false}],
    membership:[{code:"identity",label:"Identity document (if available)",required:false},{code:"application",label:"Membership application",required:true}],
    dedication:[{code:"birth_evidence",label:"Child birth evidence",required:false},{code:"guardian_consent",label:"Parent / guardian identity and consent",required:true}],
    confirmation:[{code:"member_record",label:"Member record",required:true},{code:"class_record",label:"Confirmation class / pastoral record",required:false}],
    ordination:[{code:"candidate_identity",label:"Candidate identity",required:true},{code:"authorization",label:"Training and church authorization records",required:true}],
    transfer:[{code:"member_record",label:"Member identity or church record",required:true},{code:"receiving_church",label:"Receiving church details",required:true}]
  };
  useEffect(() => {
    let alive = true;
    async function loadRequirements() {
      if (!supabase || !churchId) { setConfiguredRequirements([]); return; }
      const { data, error } = await supabase.from("certificate_document_requirements")
        .select("document_code,document_label,is_required,accepted_mime_types,max_file_size_bytes")
        .eq("church_id",churchId).eq("certificate_type",type).eq("is_active",true)
        .or("applicable_country.is.null,applicable_country.eq."+countryCode)
        .order("sort_order",{ascending:true});
      if (!alive) return;
      if (error) { setConfiguredRequirements([]); return; }
      setConfiguredRequirements((data??[]).map(item=>({code:item.document_code,label:item.document_label,required:item.is_required,acceptedMimeTypes:item.accepted_mime_types as string[]|undefined,maxFileSizeBytes:Number(item.max_file_size_bytes??0)||undefined})));
    }
    void loadRequirements();
    return () => { alive = false; };
  },[churchId,type,countryCode]);
  const docs = configuredRequirements.length ? configuredRequirements : requirements[type];
  const missing = docs.filter(item=>item.required&&!documents[item.code]);
  return <Modal title="New certificate registration" onClose={onClose}>
    <div className="form-grid">
      <div className="form-full"><label>Certificate type</label><select className="field" value={type} onChange={e=>{setType(e.target.value as CertificateType);setDocuments({});setDocumentError("");if(e.target.value!=="family")setFamilyId("");}}>{certTypes.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
      <div><label>Primary person / family name</label><input className="field" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Full legal name"/></div>
      <div><label>{type==="marriage"?"Second party name":"Second person (if applicable)"}</label><input className="field" value={secondName} onChange={e=>setSecondName(e.target.value)} placeholder="Full name"/></div>
      <div><label>{type==="marriage"?"Marriage date":"Event / record date"}</label><input className="field" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
      <div><label>Church branch</label><select className="field" value={branchId} onChange={e=>setBranchId(e.target.value)}><option value="">Select branch</option>{branchOptions.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div><label>Event place / venue</label><input className="field" value={eventPlace} onChange={e=>setEventPlace(e.target.value)} placeholder="City, church or venue"/></div>{type==="family"&&<div><label>Link registered family</label><select className="field" value={familyId} onChange={e=>setFamilyId(e.target.value)}><option value="">Select family (optional)</option>{familyOptions.map(item=><option key={item.id} value={item.id}>{item.family_name}</option>)}</select></div>}<div><label>{type==="marriage"?"Bride CNIC / identity no.":type==="birth"?"Child B-Form / identity no.":type==="death"?"Deceased identity no.":"Primary person identity no."}</label><input className="field" value={primaryIdentity} onChange={e=>setPrimaryIdentity(e.target.value)}/></div>{type==="marriage"&&<div><label>Groom CNIC / identity no.</label><input className="field" value={secondaryIdentity} onChange={e=>setSecondaryIdentity(e.target.value)}/></div>}{["birth","death","dedication"].includes(type)&&<><div><label>Father name</label><input className="field" value={fatherName} onChange={e=>setFatherName(e.target.value)}/></div><div><label>Mother name</label><input className="field" value={motherName} onChange={e=>setMotherName(e.target.value)}/></div></>}{type==="marriage"&&<div className="form-full"><label>Witness names and details</label><textarea className="field" rows={2} value={witnessDetails} onChange={e=>setWitnessDetails(e.target.value)}/></div>}
      <div className="form-full"><label>Required and supporting documents</label><div className="document-upload-list">{docs.map(item=><div className="document-upload-row" key={item.code}><div><b>{item.label}</b><small>{item.required?"Required":"Optional"}</small></div><input type="file" accept={item.acceptedMimeTypes?.join(",")||".pdf,.jpg,.jpeg,.png"} onChange={e=>{const file=e.target.files?.[0]??null;const max=item.maxFileSizeBytes??10*1024*1024;if(file&&file.size>max){setDocumentError(item.label+" exceeds the allowed file size.");e.target.value="";return;}if(file&&item.acceptedMimeTypes?.length&&!item.acceptedMimeTypes.includes(file.type)){setDocumentError(item.label+" has an unsupported file type.");e.target.value="";return;}setDocumentError("");setDocuments(old=>({...old,[item.code]:file}));}}/></div>)}</div><small className="helper">Upload a separate accepted file for each document. Documents are kept in private church storage.</small>{documentError&&<div className="validation-note">{documentError}</div>}</div>
      <div className="form-full"><label>Notes</label><textarea className="field" rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Additional details"/></div>
    </div>
    <div className="legal-note"><ShieldCheck size={16}/> Church-issued records are separate from government civil certificates. Requirements must be checked for the applicable country and jurisdiction.</div>
    {missing.length>0&&<div className="validation-note">Missing required documents: {missing.map(item=>item.label).join(", ")}</div>}
    <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={()=>void onSave({fullName,secondName,date,eventPlace,familyId,branchId,notes,formData:{family_id:familyId,event_place:eventPlace,branch_id:branchId,primary_identity:primaryIdentity,secondary_identity:secondaryIdentity,father_name:fatherName,mother_name:motherName,witness_details:witnessDetails},documents:docs.map(item=>({code:item.code,file:documents[item.code]??null}))})} disabled={!fullName.trim()||!churchId||!date||missing.length>0}>Save draft</button></div>
  </Modal>;
}
function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal"><div className="modal-header"><h3>{title}</h3><button className="icon-button" onClick={onClose}><X/></button></div><div className="modal-body">{children}</div></div></div>;
}

export default App;
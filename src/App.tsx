import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity, Baby, Banknote, Bell, BookOpen, Building2, CalendarDays,
  CheckCircle2, ChevronDown, Church, ClipboardList, FileBadge, FileText,
  FolderLock, HeartHandshake, Home, LayoutDashboard, LogOut,
  Menu, Plus, Search, Settings, ShieldCheck, Users, Wallet, X
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import type { CertificateType, ModuleKey } from "./types";
import DataModule from "./components/DataModule";
import DocumentReview from "./components/DocumentReview";
import TeamManagement from "./components/TeamManagement";

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
      const { data: memberships } = await supabase.from("church_members").select("church_id, status").eq("status", "active").limit(1);
      const id = memberships?.[0]?.church_id as string | undefined;
      if (!alive || !id) { setChurchId(null); setChurchName(""); return; }
      const { data: church } = await supabase.from("churches").select("id, display_name").eq("id", id).maybeSingle();
      if (alive && church) { setChurchId(church.id); setChurchName(church.display_name); }
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
    setChurchId(data as string); setChurchName(legalName); setChurchOpen(false); setNotice("Church workspace created. You are its owner.");
  }
  async function signOut() {
    await supabase?.auth.signOut(); setNotice("You have signed out.");
  }

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
      <header className="topbar"><div className="top-left"><button className="icon-button menu-toggle" onClick={() => setSidebarOpen(true)}><Menu/></button><div><div className="breadcrumbs">Workspace <span>/</span> {activeItem.label}</div><h1>{activeItem.label}</h1></div></div><div className="top-actions"><span className={isSupabaseConfigured ? "connection online" : "connection"}><i/> {isSupabaseConfigured ? "Supabase configured" : "Setup required"}</span><button className="icon-button" title="Notifications"><Bell/></button>{userEmail ? <button className="user-chip" onClick={signOut}><span className="user-avatar">{userEmail[0]?.toUpperCase()}</span><span>{userEmail}</span><LogOut size={15}/></button> : <button className="primary-button small" onClick={() => setAuthOpen(true)}>Sign in</button>}</div></header>

      <div className="content">
        {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice("")}><X size={15}/></button></div>}
        {active === "dashboard" ? <Dashboard onNavigate={setActive} onNew={() => setCertOpen(true)}/> :
          active === "certificates" ? <Certificates onNew={() => setCertOpen(true)} refresh={certificateRefresh}/> :
          active === "members" || active === "families" ? <People kind={active}/> :
          active === "team" ? <TeamManagement churchId={churchId}/> :\n          active === "churches" ? <DataModule churchId={churchId} table="church_branches" title="Church Branches & Campuses" description="Manage campuses, branch contact details and locations for this church." fields={[{name:"name",label:"Branch name"},{name:"branch_code",label:"Branch code"},{name:"address",label:"Address"},{name:"phone",label:"Phone"}]}/> :
          active === "documents" ? <DocumentReview/> :
          active === "attendance" ? <DataModule churchId={churchId} table="church_services" title="Services & Attendance" description="Create worship services and maintain the service register." fields={[{name:"title",label:"Service title"},{name:"service_type",label:"Service type"},{name:"starts_at",label:"Starts at",type:"datetime-local"},{name:"location",label:"Location"}]}/> :
          active === "ministries" ? <DataModule churchId={churchId} table="ministries" title="Ministries" description="Organize ministry teams, leaders and activities." fields={[{name:"name",label:"Ministry name"},{name:"description",label:"Description"}]}/> :
          active === "events" ? <DataModule churchId={churchId} table="church_events" title="Events & Calendar" description="Plan worship services, celebrations, meetings and community events." fields={[{name:"title",label:"Event title"},{name:"event_type",label:"Event type"},{name:"starts_at",label:"Starts at",type:"datetime-local"},{name:"location",label:"Location"},{name:"description",label:"Description"}]}/> :
          active === "pastoral" ? <Placeholder title="Pastoral Care" description="Restricted pastoral appointments, prayer requests and care follow-ups." icon={<HeartHandshake/>} items={["Prayer requests","Counseling appointments","Hospital visits","Home visits","Confidential case notes"]}/> :
          active === "finance" ? <DataModule churchId={churchId} table="expenses" title="Accounts & Expenses" description="Record church expenses with finance-role restrictions." fields={[{name:"expense_category",label:"Expense category"},{name:"description",label:"Description"},{name:"amount",label:"Amount",type:"number"},{name:"spent_at",label:"Expense date",type:"datetime-local"}]}/> : active === "donations" ? <DataModule churchId={churchId} table="donations" title="Tithes & Donations" description="Record tithes, offerings, mission and charity donations." fields={[{name:"donor_name",label:"Donor name"},{name:"donation_type",label:"Donation type"},{name:"amount",label:"Amount",type:"number"},{name:"donated_at",label:"Donation date",type:"datetime-local"},{name:"payment_method",label:"Payment method"}]}/> :
          active === "assets" ? <DataModule churchId={churchId} table="church_assets" title="Assets & Inventory" description="Track church property, equipment, instruments and maintenance." fields={[{name:"asset_code",label:"Asset code"},{name:"name",label:"Asset name"},{name:"category",label:"Category"},{name:"purchase_cost",label:"Purchase cost",type:"number"},{name:"location",label:"Location"}]}/> :
          active === "reports" ? <Placeholder title="Reports & Audit" description="Operational summaries, exports and immutable audit history." icon={<Activity/>} items={["Membership reports","Certificate register","Attendance analytics","Financial reports","Audit trail"]}/> :
          <SettingsPage churchId={churchId}/>}
      </div>
    </main>

    {churchOpen && <Modal title="Create church workspace" onClose={() => setChurchOpen(false)}><p className="muted">Create your church profile. Your signed-in account will become the first church owner.</p><label>Church legal / registered name</label><input className="field" value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="Church registered name"/><label>Country code</label><input className="field" value={countryCode} maxLength={2} onChange={e => setCountryCode(e.target.value.toUpperCase())}/><label>Default currency</label><input className="field" value={currencyCode} maxLength={3} onChange={e => setCurrencyCode(e.target.value.toUpperCase())}/><div className="modal-actions"><button className="secondary-button" onClick={() => setChurchOpen(false)}>Cancel</button><button className="primary-button" onClick={createChurch} disabled={!userEmail || !legalName.trim()}>Create workspace</button></div></Modal>}
    {authOpen && <Modal title="Sign in to Church360" onClose={() => setAuthOpen(false)}><p className="muted">Use your church account. New accounts require an administrator to assign a church and role.</p><label>Email address</label><input className="field" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/><label>Password</label><input className="field" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"/><div className="modal-actions"><button className="secondary-button" onClick={signUp}>Create account</button><button className="primary-button" onClick={signIn}>Sign in</button></div></Modal>}
    {certOpen && <CertificateModal type={certType} setType={setCertType} churchId={churchId} onClose={() => setCertOpen(false)} onSave={async (payload) => { if (!supabase || !churchId) { setNotice("Sign in and create/select a church workspace before saving registrations."); return; } const { data, error } = await supabase.rpc("create_certificate_application", { p_church_id: churchId, p_certificate_type: certType, p_primary_person_name: payload.fullName, p_secondary_person_name: payload.secondName || null, p_event_date: payload.date || null, p_form_data: {}, p_notes: payload.notes || null }); if (error) { setNotice(error.message); return; } const certId = data as string; const { data: authData } = await supabase.auth.getUser(); const { data: requirements } = await supabase.from("certificate_document_requirements").select("id,document_code").eq("church_id",churchId).eq("certificate_type",certType).eq("is_active",true); for (const document of payload.documents.filter(item => item.file)) { const file = document.file!; const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_"); const path = churchId + "/" + certId + "/" + crypto.randomUUID() + "-" + safeName; const upload = await supabase.storage.from("church-private-documents").upload(path,file,{contentType:file.type,upsert:false}); if (upload.error) { setNotice("Registration saved, but an attachment upload failed: " + upload.error.message); return; } const requirement = requirements?.find(item => item.document_code === document.code); const saved = await supabase.from("certificate_attachments").insert({church_id:churchId,certificate_id:certId,requirement_id:requirement?.id??null,document_code:document.code,original_file_name:file.name,storage_path:path,mime_type:file.type,file_size_bytes:file.size,uploaded_by:authData.user?.id??null}); if (saved.error) { setNotice("Registration saved, but attachment metadata could not be saved: " + saved.error.message); return; } } const { data: record } = await supabase.from("certificates").select("registration_number").eq("id", certId).maybeSingle(); setCertOpen(false); setCertificateRefresh(value=>value+1); setNotice("Registration draft saved: " + (record?.registration_number ?? certId)); }}/>}
  </div>;
}

function Dashboard({ onNavigate, onNew, churchName }: { onNavigate: (key: ModuleKey) => void; onNew: () => void; churchName: string }) {
  const stats = [{ label: "Registered Members", value: "—", hint: "Connect your church workspace", icon: Users }, { label: "Families", value: "—", hint: "Family register", icon: HeartHandshake }, { label: "Certificates Issued", value: "—", hint: "Certificate register", icon: FileBadge }, { label: "Donations This Month", value: "—", hint: "Financial overview", icon: Banknote }];
  return <><div className="welcome-row"><div><div className="eyebrow">CHURCH ADMINISTRATION</div><h2>{churchName ? "Welcome to " + churchName : "Welcome to your church workspace"}</h2><p>One secure place to manage people, records, ministries and resources.</p></div><button className="primary-button" onClick={onNew}><Plus size={17}/> New registration</button></div>
    <div className="setup-banner"><div className="setup-icon"><ShieldCheck/></div><div><b>Your workspace setup is next</b><p>Connect Supabase, create your first church, then invite authorized staff. Live statistics will appear after database setup.</p></div><span className="status-pill">Setup pending</span></div>
    <div className="stat-grid">{stats.map(s => { const Icon = s.icon; return <div className="stat-card" key={s.label}><div className="stat-top"><span>{s.label}</span><Icon size={19}/></div><strong>{s.value}</strong><small>{s.hint}</small></div>; })}</div>
    <div className="section-heading"><div><h3>Quick access</h3><p>Open a core area of your church administration.</p></div></div>
    <div className="quick-grid">{[{label:"Register a member",icon:Users,key:"members" as ModuleKey,desc:"Member profiles and household links"},{label:"Family register",icon:HeartHandshake,key:"families" as ModuleKey,desc:"Households and family relationships"},{label:"Certificates",icon:FileBadge,key:"certificates" as ModuleKey,desc:"Marriage, birth, death and baptism"},{label:"Church settings",icon:Settings,key:"settings" as ModuleKey,desc:"Branding, language and permissions"}].map(x => { const Icon=x.icon; return <button className="quick-card" key={x.label} onClick={() => onNavigate(x.key)}><span><Icon/></span><b>{x.label}</b><small>{x.desc}</small></button>; })}</div>
    <div className="section-heading"><div><h3>Development roadmap</h3><p>Build the full online system before beginning the testing phase.</p></div></div>
    <div className="roadmap"><div className="roadmap-step done"><CheckCircle2/><span><b>Project foundation</b><small>Repository and product scope</small></span><em>Created</em></div><div className="roadmap-step current"><Activity/><span><b>Core application and database</b><small>Modules, workflows and security policies</small></span><em>In progress</em></div><div className="roadmap-step"><ShieldCheck/><span><b>Complete feature implementation</b><small>All administration and church operations</small></span><em>Next</em></div><div className="roadmap-step"><CheckCircle2/><span><b>Full testing and bug fixing</b><small>Functional, security and end-to-end testing</small></span><em>After build</em></div><div className="roadmap-step"><Baby/><span><b>Offline-capable edition</b><small>Installable PWA, local encrypted queue and sync</small></span><em>After testing</em></div></div>
  </>;
}

function Certificates({ onNew, refresh }: { onNew: () => void; refresh: number }) {
  const [records,setRecords] = useState<Array<Record<string,unknown>>>([]);
  const [message,setMessage] = useState("");
  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) return;
      const {data: membership} = await supabase.from("church_members").select("church_id").eq("status","active").limit(1);
      const churchId = membership?.[0]?.church_id as string|undefined;
      if (!churchId) { setRecords([]); return; }
      const {data,error} = await supabase.from("certificates").select("id,registration_number,certificate_type,primary_person_name,status,event_date,created_at").eq("church_id",churchId).order("created_at",{ascending:false});
      if (!alive) return;
      if (error) setMessage(error.message); else setRecords((data ?? []) as Array<Record<string,unknown>>);
    }
    void load();
    return () => { alive = false; };
  },[]);
  return <>
    <div className="page-intro"><div><h2>Certificates & Church Registers</h2><p>Manage applications, supporting documents, approvals and certificate issuance.</p></div><button className="primary-button" onClick={onNew}><Plus size={17}/> New registration</button></div>
    <div className="cert-grid">{certTypes.map(t => <div className="cert-card" key={t.value}><div className="cert-icon"><FileBadge/></div><div><b>{t.label}</b><small>{t.prefix}-YYYY-000001 numbering format</small></div><span className="soft-pill">Register</span></div>)}</div>
    <div className="panel"><div className="panel-heading"><div><h3>Registration register</h3><p>Draft, submitted, approved and issued church records.</p></div></div>
      {message && <div className="notice">{message}</div>}
      {records.length ? <div className="records-table"><div className="record-row record-head"><span>Registration no.</span><span>Type</span><span>Person / Family</span><span>Status</span><span>Date</span></div>{records.map(r=><div className="record-row" key={String(r.id)}><b>{String(r.registration_number)}</b><span>{String(r.certificate_type)}</span><span>{String(r.primary_person_name)}</span><span className="soft-pill">{String(r.status)}</span><span>{String(r.event_date ?? "—")}</span><span className="row-actions">{String(r.status)==="draft"&&<button onClick={()=>void advance(String(r.id),"submitted")}>Submit</button>}{String(r.status)==="submitted"&&<button onClick={()=>void advance(String(r.id),"under_review")}>Start review</button>}{String(r.status)==="under_review"&&<button onClick={()=>void advance(String(r.id),"approved")}>Approve</button>}{String(r.status)==="approved"&&<button onClick={()=>void advance(String(r.id),"issued")}>Issue</button>}</span></div>)}</div> : <div className="empty-state"><FileText/><b>No registrations yet</b><small>Start a registration to build the church's official register.</small></div>}
    </div>
  </>;
}
function People({ kind }: { kind: "members" | "families" }) {
  const family = kind === "families";
  const [rows,setRows] = useState<Array<Record<string,unknown>>>([]);
  const [show,setShow] = useState(false);
  const [first,setFirst] = useState("");
  const [last,setLast] = useState("");
  const [phone,setPhone] = useState("");
  const [address,setAddress] = useState("");
  const [churchId,setChurchId] = useState<string|null>(null);
  const [message,setMessage] = useState("");
  const [saving,setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) return;
      const {data: membership} = await supabase.from("church_members").select("church_id").eq("status","active").limit(1);
      const id = membership?.[0]?.church_id as string|undefined;
      if (!alive || !id) { setChurchId(null); setRows([]); return; }
      setChurchId(id);
      const query = family
        ? supabase.from("families").select("id,family_number,family_name,phone,address").eq("church_id",id).order("created_at",{ascending:false})
        : supabase.from("members").select("id,member_number,first_name,last_name,phone,membership_status").eq("church_id",id).order("created_at",{ascending:false});
      const {data,error} = await query;
      if (!alive) return;
      if (error) setMessage(error.message); else setRows((data ?? []) as Array<Record<string,unknown>>);
    }
    void load();
    return () => { alive = false; };
  },[family]);

  async function save() {
    if (!supabase || !churchId || !first.trim()) return;
    setSaving(true); setMessage("");
    const result = family
      ? await supabase.from("families").insert({church_id:churchId,family_name:first.trim(),phone,address}).select("id").single()
      : await supabase.from("members").insert({church_id:churchId,first_name:first.trim(),last_name:last.trim(),phone,membership_status:"active"}).select("id").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setShow(false); setFirst(""); setLast(""); setPhone(""); setAddress("");
    const query = family
      ? supabase.from("families").select("id,family_number,family_name,phone,address").eq("church_id",churchId).order("created_at",{ascending:false})
      : supabase.from("members").select("id,member_number,first_name,last_name,phone,membership_status").eq("church_id",churchId).order("created_at",{ascending:false});
    const {data} = await query;
    setRows((data ?? []) as Array<Record<string,unknown>>);
    setMessage(family ? "Family record saved." : "Member record saved.");
  }

  return <>
    <div className="page-intro"><div><h2>{family ? "Family Registration" : "Member Directory"}</h2><p>{family ? "Create family profiles and connect household records." : "Manage member profiles, contact details and membership status."}</p></div><button className="primary-button" onClick={() => setShow(true)} disabled={!churchId}><Plus size={17}/>{family ? "New family" : "Add member"}</button></div>
    {message && <div className="notice">{message}</div>}
    {show && <div className="panel form-panel"><div className="form-grid"><div><label>{family ? "Family name" : "First name"}</label><input className="field" value={first} onChange={e=>setFirst(e.target.value)}/></div>{!family && <div><label>Last name</label><input className="field" value={last} onChange={e=>setLast(e.target.value)}/></div>}<div><label>Phone</label><input className="field" value={phone} onChange={e=>setPhone(e.target.value)}/></div>{family && <div><label>Address</label><input className="field" value={address} onChange={e=>setAddress(e.target.value)}/></div>}</div><div className="modal-actions"><button className="secondary-button" onClick={()=>setShow(false)}>Cancel</button><button className="primary-button" disabled={!first.trim()||saving} onClick={()=>void save()}>{saving ? "Saving..." : "Save record"}</button></div></div>}
    <div className="panel">{rows.length ? <div className="records-table">{rows.map(row=><div className="record-row" key={String(row.id)}><b>{family ? String(row.family_name ?? "") : [row.first_name,row.last_name].filter(Boolean).join(" ")}</b><span>{family ? String(row.family_number ?? "Family") : String(row.member_number ?? "Member")}</span><span>{String(row.phone ?? "—")}</span><span>{family ? String(row.address ?? "—") : String(row.membership_status ?? "active")}</span></div>)}</div> : <div className="empty-state"><Users/><b>{family ? "No families registered" : "No members registered"}</b><small>{churchId ? "Add the first record to begin your register." : "Sign in and create a church workspace first."}</small></div>}</div>
  </>;
}
function Placeholder({ title, description, icon, items }: { title: string; description: string; icon: ReactNode; items: string[] }) {
  return <><div className="page-intro"><div><h2>{title}</h2><p>{description}</p></div><button className="secondary-button"><Plus size={16}/> Add new</button></div><div className="feature-grid">{items.map((item, i) => <div className="feature-card" key={item}><span>{icon}</span><b>{item}</b><small>{i === 0 ? "Core workspace" : "Included in the full module"}</small></div>)}</div><div className="panel"><div className="empty-state"><ClipboardList/><b>{title} workspace</b><small>Module screen established. Database workflows and actions will be connected during implementation.</small></div></div></>;
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
    <div className="settings-grid">{[{title:"Certificate templates",desc:"Template layouts, signatures, seals, paper size and QR verification"},{title:"Document requirements",desc:"Required documents by certificate and jurisdiction"},{title:"Users & permissions",desc:"Roles, module access and action-level permissions"},{title:"Language & localization",desc:"English, Urdu, country, currency and time zone"},{title:"Security & audit",desc:"Access history, data retention and backups"},{title:"Branches & campuses",desc:"Manage multiple church locations"}].map(x=><div className="setting-card" key={x.title}><Settings size={18}/><b>{x.title}</b><small>{x.desc}</small></div>)}</div>
  </>;
}
function CertificateModal({ type, setType, churchId, onClose, onSave }: { type: CertificateType; setType: (v: CertificateType) => void; churchId: string | null; onClose: () => void; onSave: (payload: { fullName: string; secondName: string; date: string; notes: string; documents: Array<{code:string;file:File|null}> }) => Promise<void> }) {
  const [fullName,setFullName] = useState("");
  const [secondName,setSecondName] = useState("");
  const [date,setDate] = useState("");
  const [notes,setNotes] = useState("");
  const [documents,setDocuments] = useState<Record<string,File|null>>({});
  const requirements: Record<CertificateType,Array<{code:string;label:string;required:boolean}>> = {
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
  const docs = requirements[type];
  const missing = docs.filter(item=>item.required&&!documents[item.code]);
  return <Modal title="New certificate registration" onClose={onClose}>
    <div className="form-grid">
      <div className="form-full"><label>Certificate type</label><select className="field" value={type} onChange={e=>{setType(e.target.value as CertificateType);setDocuments({});}}>{certTypes.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
      <div><label>Primary person / family name</label><input className="field" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Full legal name"/></div>
      <div><label>{type==="marriage"?"Second party name":"Second person (if applicable)"}</label><input className="field" value={secondName} onChange={e=>setSecondName(e.target.value)} placeholder="Full name"/></div>
      <div><label>{type==="marriage"?"Marriage date":"Event / record date"}</label><input className="field" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
      <div><label>Registration number</label><input className="field" value="Generated securely when saved" disabled/></div>
      <div className="form-full"><label>Required and supporting documents</label><div className="document-upload-list">{docs.map(item=><div className="document-upload-row" key={item.code}><div><b>{item.label}</b><small>{item.required?"Required":"Optional"}</small></div><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>setDocuments(old=>({...old,[item.code]:e.target.files?.[0]??null}))}/></div>)}</div><small className="helper">Upload a separate PDF or image for each document. Documents are kept in private church storage.</small></div>
      <div className="form-full"><label>Notes</label><textarea className="field" rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Additional details"/></div>
    </div>
    <div className="legal-note"><ShieldCheck size={16}/> Church-issued records are separate from government civil certificates. Requirements must be checked for the applicable country and jurisdiction.</div>
    {missing.length>0&&<div className="validation-note">Missing required documents: {missing.map(item=>item.label).join(", ")}</div>}
    <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={()=>void onSave({fullName,secondName,date,notes,documents:docs.map(item=>({code:item.code,file:documents[item.code]??null}))})} disabled={!fullName.trim()||!churchId||!date||missing.length>0}>Save draft</button></div>
  </Modal>;
}
function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal"><div className="modal-header"><h3>{title}</h3><button className="icon-button" onClick={onClose}><X/></button></div><div className="modal-body">{children}</div></div></div>;
}

export default App;
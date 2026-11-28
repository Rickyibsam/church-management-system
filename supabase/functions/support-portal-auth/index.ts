import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const origin = Deno.env.get("APP_ALLOWED_ORIGIN");
const headers = {
  "Access-Control-Allow-Origin": origin ?? "null",
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });

function temporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, value => alphabet[value % alphabet.length]).join("");
}

Deno.serve(async (req) => {
  if (!origin || req.headers.get("Origin") !== origin) return reply({ error: "Support portal origin is not configured." }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !secret) return reply({ error: "Server configuration is incomplete." }, 500);
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

  let body: {
    action?: string; username?: string; password?: string; setupKey?: string;
    churchId?: string; status?: string; targetUserId?: string; planName?: string;
    monthlyFee?: number; currencyCode?: string; billingCycle?: string;
    frequency?: string; runTime?: string; timezone?: string; retentionCount?: number;
    from?: string; to?: string;
  };
  try { body = await req.json(); } catch { return reply({ error: "Invalid request body." }, 400); }
  const action = body.action;

  async function requireOwner() {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) return { error: "Authentication required.", user: null };
    const client = createClient(url!, anon!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: auth, error } = await client.auth.getUser(token);
    if (error || !auth.user || auth.user.app_metadata?.platform_role !== "support_owner")
      return { error: "Support Owner access required.", user: null };
    const { data: account } = await admin.from("platform_support_accounts").select("user_id,username")
      .eq("singleton", true).maybeSingle();
    if (!account || account.user_id !== auth.user.id) return { error: "Support Owner access required.", user: null };
    return { error: null, user: auth.user, account };
  }

  if (action === "register") {
    const username = body.username?.trim();
    const password = body.password ?? "";
    if (!username || !/^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$/.test(username) || password.length < 12 || password.length > 128)
      return reply({ error: "Enter a valid username and a password of at least 12 characters." }, 400);
    const setupKey = Deno.env.get("SUPPORT_BOOTSTRAP_KEY");
    if (!setupKey || !body.setupKey || body.setupKey.length !== setupKey.length ||
      ![...setupKey].every((ch, i) => ch === body.setupKey![i]))
      return reply({ error: "Support owner setup is not authorized. Contact the system owner." }, 403);
    const { data: existing, error: checkError } = await admin.from("platform_support_accounts").select("singleton")
      .eq("singleton", true).maybeSingle();
    if (checkError) return reply({ error: "Unable to verify support owner registration status." }, 500);
    if (existing) return reply({ error: "Support owner registration is permanently locked." }, 409);
    const authEmail = "support-" + crypto.randomUUID() + "@login.church360.invalid";
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: authEmail, password, email_confirm: true, user_metadata: { username },
      app_metadata: { platform_role: "support_owner" }
    });
    if (createError || !created.user) return reply({ error: "Unable to create the Support Owner account." }, 400);
    const { error: insertError } = await admin.from("platform_support_accounts").insert({
      singleton: true, user_id: created.user.id, username, auth_email: authEmail
    });
    if (insertError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return reply({ error: insertError.code === "23505" ? "Support owner registration is permanently locked." : "Unable to complete Support Owner registration." }, 409);
    }
    const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: login, error: loginError } = await client.auth.signInWithPassword({ email: authEmail, password });
    if (loginError || !login.session) return reply({ error: "Support Owner created. Please sign in using the Support Portal." });
    return reply({ session: login.session, username, mode: "support_owner", message: "Support Owner registered successfully. Registration is now locked." });
  }

  if (action === "login") {
    const username = body.username?.trim();
    const password = body.password ?? "";
    if (!username || !password) return reply({ error: "Enter your Support Portal username and password." }, 400);
    const { data: account } = await admin.from("platform_support_accounts")
      .select("auth_email,user_id,username").eq("singleton", true).eq("username", username).maybeSingle();
    if (!account) return reply({ error: "Invalid Support Portal username or password." }, 401);
    const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.signInWithPassword({ email: account.auth_email, password });
    if (error || !data.session || data.user?.id !== account.user_id || data.user?.app_metadata?.platform_role !== "support_owner")
      return reply({ error: "Invalid Support Portal username or password." }, 401);
    return reply({ session: data.session, username: account.username, mode: "support_owner", message: "Signed in successfully." });
  }

  const auth = await requireOwner();
  if (auth.error || !auth.user) return reply({ error: auth.error }, 403);

  if (action === "overview") {
    const [churchResult, controlsResult, memberResult, messageCount, backupResult] = await Promise.all([
      admin.from("churches").select("id,display_name,church_code,email,created_at").order("created_at", { ascending: false }).limit(500),
      admin.from("platform_church_controls").select("church_id,access_status,plan_name,monthly_fee,currency_code,billing_cycle,next_billing_date"),
      admin.from("church_members").select("church_id,status,role"),
      admin.from("platform_support_messages").select("id", { count: "exact", head: true }).eq("direction", "inbound").eq("is_read", false),
      admin.from("platform_backup_runs").select("id,status,church_id,created_at,completed_at").order("created_at", { ascending: false }).limit(10)
    ]);
    if (churchResult.error) return reply({ error: "Unable to load church directory." }, 500);
    const controls = new Map((controlsResult.data ?? []).map(row => [row.church_id, row]));
    const memberCounts = new Map<string, number>();
    for (const member of memberResult.data ?? []) memberCounts.set(member.church_id, (memberCounts.get(member.church_id) ?? 0) + (member.status === "active" ? 1 : 0));
    const churches = (churchResult.data ?? []).map(church => ({
      ...church, ...(controls.get(church.id) ?? { access_status: "active", plan_name: "Free", monthly_fee: 0, currency_code: "PKR", billing_cycle: "free", next_billing_date: null }),
      activeUsers: memberCounts.get(church.id) ?? 0
    }));
    return reply({
      mode: "support_owner", username: auth.account?.username, churches, totalChurches: churches.length,
      activeChurches: churches.filter(c => c.access_status === "active").length,
      suspendedChurches: churches.filter(c => c.access_status === "suspended").length,
      unreadMessages: messageCount.count ?? 0, recentBackups: backupResult.data ?? []
    });
  }

  if (action === "church_users") {
    const churchId = body.churchId?.trim();
    if (!churchId) return reply({ error: "Select a church first." }, 400);
    const [accounts, members] = await Promise.all([
      admin.from("church_login_accounts").select("user_id,username,branch_id,is_active,created_at").eq("church_id", churchId).order("created_at"),
      admin.from("church_members").select("user_id,role,status,branch_id").eq("church_id", churchId)
    ]);
    if (accounts.error || members.error) return reply({ error: "Unable to load church users." }, 500);
    const memberMap = new Map((members.data ?? []).map(row => [row.user_id, row]));
    return reply({ users: (accounts.data ?? []).map(row => ({ ...row, ...(memberMap.get(row.user_id) ?? { role: "unknown", status: "unknown" }) })) });
  }

  if (action === "set_church_access") {
    const churchId = body.churchId?.trim();
    const status = body.status;
    if (!churchId || !["active", "suspended"].includes(status ?? "")) return reply({ error: "Select a valid church status." }, 400);
    const { data: church } = await admin.from("churches").select("id").eq("id", churchId).maybeSingle();
    if (!church) return reply({ error: "Church not found." }, 404);
    const { data: existing } = await admin.from("platform_church_controls").select("suspended_user_state,access_status").eq("church_id", churchId).maybeSingle();
    if (status === "suspended") {
      const [accounts, members] = await Promise.all([
        admin.from("church_login_accounts").select("user_id,is_active").eq("church_id", churchId),
        admin.from("church_members").select("user_id,status").eq("church_id", churchId)
      ]);
      if (accounts.error || members.error) return reply({ error: "Unable to read church account state." }, 500);
      const memberMap = new Map((members.data ?? []).map(row => [row.user_id, row.status]));
      const state = (accounts.data ?? []).map(row => ({
        user_id: row.user_id, is_active: row.is_active, membership_status: memberMap.get(row.user_id) ?? "active"
      }));
      const { error: controlError } = await admin.from("platform_church_controls").upsert({
        church_id: churchId, access_status: "suspended", suspended_user_state: state, updated_by: auth.user.id, updated_at: new Date().toISOString()
      }, { onConflict: "church_id" });
      if (controlError) return reply({ error: "Unable to save church suspension state." }, 500);
      const [accountUpdate, memberUpdate] = await Promise.all([
        admin.from("church_login_accounts").update({ is_active: false }).eq("church_id", churchId),
        admin.from("church_members").update({ status: "suspended" }).eq("church_id", churchId).eq("status", "active")
      ]);
      if (accountUpdate.error || memberUpdate.error) return reply({ error: "Church access was recorded, but some user statuses could not be updated. Retry or inspect the audit state." }, 500);
    } else {
      const states = Array.isArray(existing?.suspended_user_state) ? existing.suspended_user_state : [];
      for (const state of states) {
        await admin.from("church_login_accounts").update({ is_active: Boolean(state.is_active) }).eq("church_id", churchId).eq("user_id", state.user_id);
        await admin.from("church_members").update({ status: state.membership_status }).eq("church_id", churchId).eq("user_id", state.user_id);
      }
      const { error } = await admin.from("platform_church_controls").upsert({
        church_id: churchId, access_status: "active", suspended_user_state: [], updated_by: auth.user.id, updated_at: new Date().toISOString()
      }, { onConflict: "church_id" });
      if (error) return reply({ error: "Unable to reactivate church access." }, 500);
    }
    return reply({ message: status === "suspended" ? "Church access suspended. Its saved account states can be restored when reactivated." : "Church access reactivated using its saved account states." });
  }

  if (action === "reset_user_password") {
    const churchId = body.churchId?.trim();
    const targetUserId = body.targetUserId?.trim();
    if (!churchId || !targetUserId) return reply({ error: "Select a church user first." }, 400);
    const { data: target } = await admin.from("church_login_accounts").select("user_id,username").eq("church_id", churchId).eq("user_id", targetUserId).maybeSingle();
    if (!target) return reply({ error: "The selected user does not belong to this church." }, 404);
    const newPassword = temporaryPassword();
    const { error } = await admin.auth.admin.updateUserById(targetUserId, { password: newPassword });
    if (error) return reply({ error: "Password reset failed. Please try again." }, 400);
    return reply({ message: "Password reset successfully. Copy this temporary password now; it will not be shown again.", username: target.username, temporaryPassword: newPassword });
  }

  if (action === "set_plan") {
    const churchId = body.churchId?.trim();
    const planName = body.planName?.trim() || "Free";
    const monthlyFee = Number(body.monthlyFee ?? 0);
    const currencyCode = (body.currencyCode ?? "PKR").toUpperCase();
    const billingCycle = body.billingCycle ?? "monthly";
    if (!churchId || !Number.isFinite(monthlyFee) || monthlyFee < 0 || monthlyFee > 100000000 || !/^[A-Z]{3}$/.test(currencyCode) || !["monthly", "yearly", "free"].includes(billingCycle))
      return reply({ error: "Enter a valid plan and monthly fee." }, 400);
    const { error } = await admin.from("platform_church_controls").upsert({
      church_id: churchId, plan_name: planName.slice(0, 60), monthly_fee: monthlyFee, currency_code: currencyCode,
      billing_cycle: billingCycle, updated_by: auth.user.id, updated_at: new Date().toISOString()
    }, { onConflict: "church_id" });
    if (error) return reply({ error: "Unable to save church plan." }, 500);
    return reply({ message: "Church plan and fee saved." });
  }

  if (action === "backup_schedule") {
    const churchId = body.churchId?.trim();
    if (!churchId) return reply({ error: "Select a church first." }, 400);
    const frequency = body.frequency ?? "weekly";
    const runTime = body.runTime ?? "02:00";
    const timezone = body.timezone ?? "Asia/Karachi";
    const retentionCount = Number(body.retentionCount ?? 7);
    if (!["daily", "weekly", "monthly"].includes(frequency) || !/^\d{2}:\d{2}$/.test(runTime) ||
      !Number.isInteger(retentionCount) || retentionCount < 1 || retentionCount > 90)
      return reply({ error: "Enter a valid backup schedule." }, 400);
    const { error } = await admin.from("platform_backup_schedules").upsert({
      church_id: churchId, is_enabled: true, frequency, run_time: runTime, timezone, retention_count: retentionCount,
      updated_by: auth.user.id, updated_at: new Date().toISOString()
    }, { onConflict: "church_id" });
    if (error) return reply({ error: "Unable to save backup schedule." }, 500);
    return reply({ message: "Backup schedule saved. Automatic execution will be enabled after the backup worker is deployed and verified." });
  }

  if (action === "backup_history") {
    const churchId = body.churchId?.trim();
    let query = admin.from("platform_backup_runs").select("id,church_id,status,backup_type,storage_path,file_size_bytes,records_included,started_at,completed_at,created_at,error_message").order("created_at", { ascending: false }).limit(100);
    if (churchId) query = query.eq("church_id", churchId);
    const { data, error } = await query;
    if (error) return reply({ error: "Unable to load backup history." }, 500);
    return reply({ backups: data ?? [] });
  }

  if (action === "inbox") {
    const { data, error } = await admin.from("platform_support_messages")
      .select("id,church_id,sender_user_id,sender_label,direction,message_kind,body,attachment_path,attachment_name,attachment_mime_type,attachment_size_bytes,is_read,created_at")
      .order("created_at", { ascending: false }).limit(100);
    if (error) return reply({ error: "Unable to load support inbox." }, 500);
    return reply({ messages: data ?? [] });
  }

  if (action === "mark_message_read") {
    const id = body.targetUserId;
    if (!id) return reply({ error: "Message ID is required." }, 400);
    const { error } = await admin.from("platform_support_messages").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id);
    if (error) return reply({ error: "Unable to update message status." }, 500);
    return reply({ message: "Message marked as read." });
  }

  if (action === "report") {
    const from = body.from ? new Date(body.from).toISOString() : new Date(Date.now() - 30 * 86400000).toISOString();
    const to = body.to ? new Date(body.to).toISOString() : new Date().toISOString();
    const [churches, members, donations, expenses, events, certificates] = await Promise.all([
      admin.from("churches").select("id", { count: "exact", head: true }),
      admin.from("members").select("id", { count: "exact", head: true }),
      admin.from("donations").select("id,amount,donated_at").gte("donated_at", from).lte("donated_at", to).limit(5000),
      admin.from("expenses").select("id,amount,expense_date").gte("expense_date", from.slice(0,10)).lte("expense_date", to.slice(0,10)).limit(5000),
      admin.from("church_events").select("id", { count: "exact", head: true }),
      admin.from("certificates").select("id", { count: "exact", head: true })
    ]);
    const donationTotal = (donations.data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const expenseTotal = (expenses.data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    return reply({ report: {
      churches: churches.count ?? 0, members: members.count ?? 0, events: events.count ?? 0, certificates: certificates.count ?? 0,
      donationCount: donations.data?.length ?? 0, donationTotal, expenseCount: expenses.data?.length ?? 0, expenseTotal,
      periodFrom: from, periodTo: to, currency: "PKR"
    }});
  }

  return reply({ error: "Unsupported Support Portal action." }, 400);
});
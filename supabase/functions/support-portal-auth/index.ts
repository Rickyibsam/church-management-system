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

Deno.serve(async (req) => {
  if (!origin || req.headers.get("Origin") !== origin) return reply({ error: "Support portal origin is not configured." }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !secret) return reply({ error: "Server configuration is incomplete." }, 500);

  let body: { action?: string; username?: string; password?: string; setupKey?: string };
  try { body = await req.json(); } catch { return reply({ error: "Invalid request body." }, 400); }

  const action = body.action;
  const username = body.username?.trim();
  const password = body.password ?? "";
  if (!username || !/^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$/.test(username) || password.length < 12 || password.length > 128) {
    return reply({ error: "Enter a valid username and a password of at least 12 characters." }, 400);
  }

  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  if (action === "register") {
    const setupKey = Deno.env.get("SUPPORT_BOOTSTRAP_KEY");
    if (!setupKey || !body.setupKey || body.setupKey.length !== setupKey.length ||
      !crypto.subtle || ![...setupKey].every((ch, i) => ch === body.setupKey![i])) {
      return reply({ error: "Support owner setup is not authorized. Contact the system owner." }, 403);
    }
    const { data: existing, error: checkError } = await admin.from("platform_support_accounts").select("singleton").eq("singleton", true).maybeSingle();
    if (checkError) return reply({ error: "Unable to verify support owner registration status." }, 500);
    if (existing) return reply({ error: "Support owner registration is permanently locked." }, 409);

    const authEmail = "support-" + crypto.randomUUID() + "@login.church360.invalid";
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: { username },
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
    if (loginError || !login.session) return reply({ error: "Support Owner created. Please sign in using the Support Portal." }, 200);
    return reply({ session: login.session, username, mode: "support_owner", message: "Support Owner registered successfully. Registration is now locked." });
  }

  if (action === "login") {
    const { data: account } = await admin.from("platform_support_accounts")
      .select("auth_email,user_id,username").eq("singleton", true).eq("username", username).maybeSingle();
    if (!account) return reply({ error: "Invalid Support Portal username or password." }, 401);
    const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.signInWithPassword({ email: account.auth_email, password });
    if (error || !data.session || data.user?.id !== account.user_id ||
      data.user?.app_metadata?.platform_role !== "support_owner") {
      return reply({ error: "Invalid Support Portal username or password." }, 401);
    }
    return reply({ session: data.session, username: account.username, mode: "support_owner", message: "Signed in successfully." });
  }

  return reply({ error: "Unsupported support portal action." }, 400);
});

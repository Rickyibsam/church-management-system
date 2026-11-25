# Email invitation delivery configuration

The church invitation flow is implemented by the authenticated `invite-church-member` Edge Function. It verifies the signed-in caller, checks owner/admin authority, validates the church branch and role, creates or reuses the Auth account, and inserts the church membership. New invitations activate access only after email confirmation.

## Required Supabase Edge Function secrets

Open Supabase Dashboard → Project → Edge Functions → Secrets and add:

- `APP_ALLOWED_ORIGIN`: the exact deployed Cloudflare application origin, including `https://` and no trailing slash (for example, the Worker custom domain or its `.workers.dev` origin).
- `APP_REDIRECT_URL`: the exact public application URL that should receive the user after email confirmation (usually the app root URL).

The platform-provided `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must remain managed by Supabase. Never put the service-role key in the browser or GitHub.

## Required Supabase Auth email settings

Open Supabase Dashboard → Authentication → SMTP Settings:

1. Configure a verified SMTP sender with the provider's host, port, username and password.
2. Set a sender email address on the verified domain and a recognizable sender name.
3. Open Authentication → URL Configuration and set the Site URL to the deployed app URL.
4. Add the deployed app URL to the allowed Redirect URLs list.
5. Confirm the provider's SPF/DKIM DNS records are verified before sending real invitations.

The built-in default email sender is suitable only for limited development/testing and should not be treated as reliable production delivery. A custom SMTP provider may have a free tier, but its domain verification and sending limits are controlled by that provider.

## Verification checklist

- The Edge Function remains deployed with JWT verification enabled.
- The browser request origin exactly matches `APP_ALLOWED_ORIGIN`.
- Confirmation links resolve to `APP_REDIRECT_URL`.
- A new user receives the confirmation email and becomes an active church member only after confirmation.
- Existing confirmed users are assigned the selected church role without creating a duplicate Auth account.
- An administrator cannot invite another administrator; only the church owner can grant that role.
- Invitation errors are displayed in English and do not expose secrets.

This final SMTP and origin configuration requires the deployed application URL and credentials from the selected email provider. Keep those credentials in Supabase Dashboard secrets/settings only; do not paste them into source files or public chat.

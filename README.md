# Church Management System

A multi-church management platform for churches in Pakistan and international communities. Each church operates in its own tenant workspace with church-scoped records, roles and permissions.

## Product scope

- Multi-church and multi-branch administration
- Member directory, family registration, family relationships and private member documents
- Church registers and certificates: marriage, birth, death, baptism, membership, dedication, confirmation, ordination, transfer and family registration
- Country-specific document requirements, private uploads, review/approval, certificate correction/reissue, branded templates, PDF archival and QR verification
- Service schedules, visitor/member attendance and attendance reports
- Ministries, events and pastoral-care requests with assigned-case confidentiality
- Cash/bank accounts, chart of accounts, donation receipts, expense approval, double-entry journal posting, budgets and financial reporting
- Asset register, maintenance records and branch-aware inventory stock management with low-stock alerts
- Individual user/module/action permissions, email invitations, audit history and persistent notifications
- CSV, Excel and PDF exports from operational registers
- Version 5 church backup exports with private storage files and owner-only transactional database restore into a new empty workspace
- English-only application interface (no Roman Urdu in screens, controls, reports or system messages); certificate templates may contain Urdu-script document content where configured
- Responsive web application; offline PWA work is deliberately deferred

## Architecture

- Frontend: React, TypeScript and Vite
- Backend/database: Supabase PostgreSQL, Auth, Row Level Security, private Storage and Edge Functions
- Hosting target: Cloudflare Workers Static Assets (Free plan); Supabase remains the database/auth/storage backend
- Source control: GitHub

## Security principles

- Every church-owned record carries a `church_id` and is protected by Row Level Security.
- Identity documents, member documents, signatures, seals and certificate PDFs use private storage.
- Public QR verification returns limited certificate verification details only.
- Email invitations are handled by a JWT-protected Supabase Edge Function that checks active owner/admin membership server-side.
- Never commit database passwords, Supabase secret/service-role keys, access tokens or real member data.
- Church-issued records are distinct from government-issued civil certificates. Requirements must be checked for the applicable country and jurisdiction.

## Cloudflare Workers Free deployment

This repository deploys the Vite single-page app to the existing Cloudflare Worker named `church-management-system`. `wrangler.jsonc` publishes `dist/` as static assets and routes unknown paths to the SPA entry point. Static asset delivery is free and unlimited under Workers Static Assets; Worker-invoked requests remain subject to the Free plan limits.

1. In the Cloudflare Worker `church-management-system`, connect this GitHub repository and select the production branch.
2. Set the build command to `npm ci && npm run build` (or `npm install && npm run build` if no lockfile is present) and configure the build output through `wrangler.jsonc`.
3. Add the public build variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the Cloudflare build environment. These are public client configuration values; never add a database password or service-role key.
4. For manual deployment, run `npm install`, then `npm run cf:deploy` after authenticating Wrangler with `npx wrangler login`.
5. Use `npm run cf:dev` to preview the built static app through Wrangler.

The current database remains on the selected Supabase project. Cloudflare hosts the web application; no paid Cloudflare feature is required for the static frontend. Do not migrate or delete Supabase data as part of this hosting change.

## Local setup

1. Install Node.js LTS and Git.
2. Clone this repository.
3. Copy `.env.example` to `.env.local`.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` using the selected Supabase project's public connection values.
5. Run `npm install`.
6. Run `npm run dev` for local development.

Do not place a database password or service-role key in frontend environment variables.

## Supabase invitation setup

The `invite-church-member` Edge Function is deployed with JWT verification enabled. Before using real email invitations, configure a verified SMTP sender in Supabase Auth (**Authentication → Emails → SMTP Settings**), add the deployed application URL under **Authentication → URL Configuration** (Site URL and allowed redirect URLs), and set the Edge Function secrets `APP_ALLOWED_ORIGIN` to the exact deployed application origin (scheme + host, no trailing slash) and `APP_REDIRECT_URL` to the allowed invitation landing URL. The function rejects requests until the exact origin is configured. Never put SMTP passwords or service-role keys in GitHub or frontend build variables. The function uses the platform-provided Supabase URL, anon key and service-role key at runtime; no service-role key belongs in this repository.

## Current implementation status

The online build is in progress. The database schema and a growing set of online workflows are implemented, including member/family registers, certificates, private documents, permissions, invitations, attendance, pastoral care, accounting, reports and notifications. Inventory, branch-scoped low-stock alerts, UI/RLS action permissions and transactional backup restore foundations are implemented. Full restore/failure-injection testing, remaining integrations and other advanced workflows are still in progress.

**The application is not production-ready. Cloudflare hosting configuration is now in the repository; a successful production deployment has not yet been verified.** Per project-owner instruction, functional, security and end-to-end testing are deferred until online feature development is complete. The offline edition will begin only after the online build is complete and its testing/bug-fixing phase has passed.

See `docs/implementation-status.md` for the current implementation and remaining work.

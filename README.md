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
- Asset register and maintenance records
- Individual user/module/action permissions, email invitations, audit history and persistent notifications
- CSV, Excel and PDF exports from operational registers
- English-first interface; localization and Urdu coverage remain in the online roadmap
- Responsive web application; offline PWA work is deliberately deferred

## Architecture

- Frontend: React, TypeScript and Vite
- Backend/database: Supabase PostgreSQL, Auth, Row Level Security, private Storage and Edge Functions
- Hosting target: Render (not deployed yet)
- Source control: GitHub

## Security principles

- Every church-owned record carries a `church_id` and is protected by Row Level Security.
- Identity documents, member documents, signatures, seals and certificate PDFs use private storage.
- Public QR verification returns limited certificate verification details only.
- Email invitations are handled by a JWT-protected Supabase Edge Function that checks active owner/admin membership server-side.
- Never commit database passwords, Supabase secret/service-role keys, access tokens or real member data.
- Church-issued records are distinct from government-issued civil certificates. Requirements must be checked for the applicable country and jurisdiction.

## Local setup

1. Install Node.js LTS and Git.
2. Clone this repository.
3. Copy `.env.example` to `.env.local`.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` using the selected Supabase project's public connection values.
5. Run `npm install`.
6. Run `npm run dev` for local development.

Do not place a database password or service-role key in frontend environment variables.

## Supabase invitation setup

The `invite-church-member` Edge Function is deployed with JWT verification enabled. Before using real email invitations, configure a verified SMTP sender in Supabase Auth and set the function's `APP_ALLOWED_ORIGIN` secret to the deployed application origin. The function uses the platform-provided Supabase URL, anon key and service-role key at runtime; no service-role key belongs in this repository.

## Current implementation status

The online build is in progress. The database schema and a growing set of online workflows are implemented, including member/family registers, certificates, private documents, permissions, invitations, attendance, pastoral care, accounting, reports and notifications. Some modules and advanced workflows are still incomplete.

**The application is not production-ready and has not been deployed to Render.** Per project-owner instruction, functional, security and end-to-end testing are deferred until online feature development is complete. The offline edition will begin only after the online build is complete and its testing/bug-fixing phase has passed.

See `docs/implementation-status.md` for the current implementation and remaining work.

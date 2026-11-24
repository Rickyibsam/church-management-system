# Church Management System

A global, multi-church management platform for churches in Pakistan and worldwide.

## Product scope

- Multi-church and multi-branch administration with tenant isolation
- Members, households and family registration
- Church registers and certificate workflows: marriage, birth/child record, death, baptism, membership, dedication and family registration
- Required-document checklists, private attachments, review and approval
- Branded certificate templates with church logo, header, footer, signatures, seals, serial numbers and QR verification
- Attendance, ministries, events, pastoral care, donations, finance, assets and reporting
- English-first interface with localization support, including Urdu
- Responsive web application and installable PWA

## Planned architecture

- Frontend: React + TypeScript (framework choice to be finalized)
- Backend and database: Supabase PostgreSQL, Auth and private Storage
- Hosting: Render (free-tier suitability and limits to be validated before deployment)
- Source control: GitHub

## Security principles

- Every church-owned record must carry a `church_id` and be protected by Row Level Security (RLS).
- Identity documents and certificate attachments must live in private storage, never in the public repository or public buckets.
- Never commit database passwords, Supabase secret/service-role keys, access tokens, or real member data.
- Authorization must use trusted server-side role data, not user-editable profile metadata.
- Church-issued records must be clearly distinguished from government-issued civil certificates. Legal requirements vary by country and jurisdiction.

## Local setup

1. Install Node.js LTS, Git and the Supabase CLI.
2. Clone this repository.
3. Copy `.env.example` to `.env.local` and fill in the Supabase project URL and publishable key.
4. Run `npm install` after the frontend workspace is added.
5. Follow the Supabase CLI documentation and use `supabase --help` to confirm commands supported by your installed CLI version.

The dedicated Supabase project has the initial church, membership, certificate, document-storage, audit and permission schema applied. Versioned SQL migrations are stored in `supabase/migrations/`. The full application is still under development; do not treat the current screens as production-ready.

## Project status

Repository initialized. Product requirements and architecture are being documented before implementation. See `docs/`.

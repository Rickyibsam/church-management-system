# Development Status

Delivery order requested by the project owner:
1. Complete the online Church ERP.
2. Only after feature completion, perform full functional, security and end-to-end testing and fix defects.
3. Build the offline edition after the online release passes testing.

## Implemented foundation
- React + TypeScript + Vite application shell and responsive navigation.
- Supabase Auth client wiring and first-church onboarding RPC.
- Multi-church schema foundation with branch and church membership records.
- RLS policies and role-aware access for church data, finance, pastoral notes and certificate documents.
- Member and family starter registers.
- Branch, service, ministry, event, expense, donation and asset starter forms.
- Certificate registration with transaction-safe church/year/type numbering.
- Default document checklists for marriage, birth, death, baptism and family registrations.
- Private certificate document upload and document verification workflow.
- Certificate submission, review, approval and issue workflow.
- Church logo/header/footer profile settings.
- Branded print preview, browser Print/Save PDF and privacy-minimized QR verification.
- Church team membership and custom permission storage foundation.
- Audit trigger foundation and Render static-site blueprint.

## Still to build before testing
- Full CRUD/edit/delete/restore policies and action-level permission enforcement across every module.
- Member profile completeness, family tree and relationship management.
- Invitation-by-email and complete staff onboarding.
- Full certificate template designer, signatures/seals, PDF archival, correction/reissue/cancellation and country-specific requirements.
- Complete service attendance check-in, visitor flows and reports.
- Pastoral appointments, prayer requests and restricted case workflow.
- Chart of accounts, cash/bank reconciliation, receipts, budgets, donor statements and financial reports.
- Asset lifecycle, inventory and maintenance.
- Notifications, exports, backups/restore, dashboards, localization and accessibility.
- Deployment environment setup and operational documentation.

## Testing and offline
No functional, security or end-to-end test phase has been started, per the requested order. Offline caching, local queues and synchronization are deferred until online feature completion and testing.


## Online build additions (current development pass)
- Expanded the online database for member identity-document metadata and family-to-member relationships.
- Extended attendance records for event attendance, visitor contact details and check-in attribution.
- Added pastoral follow-up scheduling, chart of accounts, journal headers/lines, annual budgets and budget lines.
- Added donation pledge tracking, asset maintenance records and audit-export job metadata.
- Added a unified online operations workspace for pastoral care, finance/accounting registers, assets/maintenance, notifications and audit records.
- Repaired literal escaped newline sequences in the main application source and connected the operations workspace to navigation.
- The migration is applied to the selected Supabase project and its SQL is committed to the repository.
- These are development additions, not a claim of complete production workflows. Posting controls, balanced journal enforcement, sensitive pastoral authorization, file retention/export generation, invitation delivery, complete member/family editing and full reports remain to be implemented.
- Per project-owner instruction, functional, security and end-to-end testing remain deferred until the online feature build is complete.

- Added a dedicated attendance workspace with service scheduling and member/visitor check-in registers; the generic register component now supports table-specific sort columns.

- Added a JWT-protected Supabase Edge Function for church-owner/admin email invitations, including role validation, existing-account assignment, and server-side membership checks. Team management now invokes this function instead of requiring a raw user UUID.
- Added an individual module/action permission editor and connected the database permission helper to RLS policies for core member, certificate, attendance, ministry, asset and finance tables. Certificate history remains read-only.
- Expanded member and family registers with search, profile editing, family linking and archive-without-delete behavior.
- Generic data registers now support record editing, deletion where RLS permits, required-field and numeric/date validation, loading states and read-only report registers.

- Added country-specific certificate-document requirement lookup, with configured requirements taking precedence over built-in defaults for the selected church country.
- Added multi-church workspace selection so users with multiple active church memberships can switch workspaces without signing out.
- Added journal posting RPC with debit/credit balance validation, active same-church account validation, and immutable posted-entry/line triggers. Journal registers now expose a Post action.
- Restricted pastoral follow-up records to church owners/admins, pastors, and the pastor assigned to the related case.
- Added invitation-confirmation activation so newly invited users receive active church membership after email confirmation; the invite function was redeployed with existing-account handling.

- Added live dashboard counts and monthly donation totals, and corrected member, certificate and document-review screens to follow the currently selected church workspace in multi-church accounts.
- Added family relationship labels and primary household contact assignment from member profiles.
- Connected certificate status actions to the database workflow, including submission, review, approval, rejection with a reason, cancellation and issuance.
- Added PDF generation and private storage archival for issued certificates, with signed-link access to the archived file.
- Certificate approval now evaluates required supporting documents for the church's configured country rather than mixing requirements from other countries.

- Reconciled the repository migration filenames with the actual applied Supabase migration versions, including the separate read-only certificate-history policy correction, to prevent duplicate migration execution during future deployment workflows.

- Added a private member-document manager for identity and supporting records, including file-type/size checks, signed-link viewing, document verification metadata and church-scoped access.
- Added attendance integrity rules requiring a member or visitor name, restricting attendance statuses/methods and recording the authenticated check-in user by default.

- Added editable certificate document-requirement and certificate-template registers in church settings, including country applicability, required/active flags, language, paper layout, header/footer and pastor details. Default template text and configured signature/seal assets are now reflected in certificate preview/PDF output.
- Added private member-document upload and verification controls, and connected them to the member directory.
- Added accounting links between cash/bank accounts and chart-of-accounts assets, donation income accounts and expense accounts. Donation posting generates a receipt number and balanced journal entry; expenses require approval before posting. Posted source records are locked.
- Added a read-only posted financial ledger view and UI actions for donation posting and expense approval/posting.

- Added church-scoped foreign-key dropdowns to operational forms for cash/bank accounts, chart accounts, journal entries, budgets, pastoral requests, attendance services/events/members and asset maintenance, replacing several manual UUID fields.

- Financial forms now use same-church account selectors rather than requiring staff to type account UUIDs. Donation registers show generated receipt numbers and posting status; expense registers show approval/posting status; the financial ledger displays the full posted transaction summary.

- Added church-scoped, read-only reporting views for member directory, certificate register, attendance summaries, monthly posted financial summaries and donor statements; connected them to the Reports workspace.

- Added a persistent notification inbox with per-user read/unread state and a mark-all-read action. Certificate status transitions and accepted church invitations now generate notifications, and the header bell opens the inbox.

- Completed the default document-requirement catalogue for every certificate type (including membership, dedication, confirmation, ordination and transfer) and seeded both new and existing church workspaces. Approval checks now have configured requirements to validate against.

- Added CSV, Excel (.xlsx) and PDF export actions to generic registers, including read-only report views and permission-filtered data.

- Expanded certificate application forms to capture event location, identity references, parents and witness details in structured form data; selected family/witness details now appear on the certificate preview and archived PDF without printing private identity numbers.

- Certificate document uploads now enforce the configured MIME allow-list and maximum file size for each requirement, with a 10 MB fallback limit.

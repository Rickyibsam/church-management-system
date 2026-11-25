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
- Audit trigger foundation and Cloudflare Workers Static Assets hosting configuration.

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

- Issued certificate PDF generation now honors the active default template's A4/Letter paper size and portrait/landscape orientation.

- Added a controlled certificate reissue workflow: issued certificates remain unchanged, a replacement draft receives a fresh registration number, links to the original record and records the correction reason in history.

- Certificate creation, document review, approval and issuance now call the action-level permission helper; the team permission editor includes explicit approve and issue overrides as well as view/create/edit/delete.

- Applied action-level permissions to confidential pastoral requests and follow-ups while retaining access for the pastor assigned to an individual case. Owners/admins and explicit pastoral permission overrides are enforced through RLS.

- Added a certificate-template asset uploader for pastor signatures, church seals and background images. Uploaded assets are stored in private church storage and applied to the print preview and archived PDF.

- Replaced several free-text values with controlled dropdowns for chart-account types, cash/bank types, attendance status/method and certificate types; default attendance values are preselected.

- Added fixed-asset straight-line depreciation schedules and disposal workflows. Monthly depreciation and asset disposal generate balanced journal entries using mapped asset, accumulated-depreciation, expense, gain/loss and cash/bank accounts; disposed assets are locked against direct changes.

- Added account-activity and budget-versus-actual reports based on posted double-entry journal lines, with church-scoped read-only views in the Finance workspace.

- Added budget-line entry and approval workflow. Budgets must contain at least one line before approval; approved/closed budgets and their lines are protected from direct edits, and budget-vs-actual reporting is available.

- Added a family-relationship register with household/member selectors, relationship types and primary-contact designation, linked from the Family Directory.

- Family registration certificates can now link directly to an existing household during secure certificate creation; family and event-place references are validated and saved in the same database operation.

- Added database-level same-church reference checks across member/family, certificate, attendance, pastoral, accounting, budget, asset, permission and document records to prevent cross-tenant foreign-key references.

- Extended tenant integrity checks to branch assignments, pastoral case assignees and notification recipients so referenced users must belong to the same church workspace.

- Deployed invitation function version 3 with JWT verification still enabled. Only active church owners/admins may invite; only the church owner may grant the administrator role. The team UI now labels the action as an invitation.


## Hosting target update

- Hosting target changed from Render to Cloudflare Workers Static Assets on the Free plan, using the existing Worker name `church-management-system`.
- Added `wrangler.jsonc` for the `dist/` Vite output with SPA fallback, plus `cf:dev` and `cf:deploy` scripts.
- Removed the obsolete Render Blueprint. Supabase remains the selected database, authentication and private file-storage backend; no database migration or data deletion is part of this hosting change.
- Cloudflare production deployment has not been verified from this repository session. The existing Worker must be connected to this GitHub repository under Settings > Builds, with build command `npm install && npm run build`, deploy command `npx wrangler deploy`, and the two public `VITE_SUPABASE_*` build variables configured.

- Family relationship rules now enforce one household head and one primary contact per family; assigning a relationship as `head` synchronizes the family record's head-member reference.

- Family member editing now removes stale household links when a member is moved. Family-head and primary-contact assignments automatically replace previous assignments and stay synchronized when relationships change or are removed.


- Finance workspace hardening: removed duplicate Budget Lines navigation/register entry and removed the editable journal status field. Journal entries now start as drafts and must use the validated Post action to enter the ledger workflow; entry number, date and description are required in the draft form.

- Added ministry leader assignment and a ministry-team membership register with member/ministry selectors; database constraints prevent duplicate assignments and cross-church membership links.
- Pastoral care workspace now uses controlled request categories and the database-supported open/in-progress/closed lifecycle; follow-up records expose due and completion timestamps for the care team.

- Completed pastoral case forms with member linkage, active-pastor assignment and case status, plus follow-up scheduling/assignment. Assigned pastors receive private notifications when cases or follow-ups are assigned or updated.

- Member and family profiles now support branch assignment from the active church's branch list, with same-church reference validation at the database layer.

- Added branch assignment to certificate applications and branch selectors to event, ministry, donation, expense, service and asset registers, extending the multi-branch workflows.

- Updated the secure invitation Edge Function to accept a validated branch assignment; new and existing-account invitations can now be assigned to a specific church branch. JWT verification remains enabled and only owners can invite administrators.

- Deployed invitation function version 5. Existing unconfirmed accounts receive a renewed signup confirmation email, and new invitations can use the configured application redirect URL (`APP_REDIRECT_URL`).

- Added restrictive branch-scope RLS policies across branch-owned records and their related documents, attendance, pastoral, ministry and accounting rows. Existing non-admin team memberships were assigned to the head-office branch; owners/admins retain church-wide access. Invitations without an explicit branch now default to head office.

- Existing branch-owned records without a branch were assigned to head office. New member, family, certificate, service, event, ministry, donation, expense and asset records now default to the active user's branch (or head office for central users).

- Private Storage access now follows the same branch and action-level permissions as the database: member documents, certificate attachments and template assets are checked against their parent records before read/upload/update/delete.

- New church workspaces now receive a starter chart of accounts and a mapped Cash on Hand account automatically; existing church workspaces were backfilled so donation, expense and asset workflows have usable account defaults.


## Additional online development pass
- Expanded the Donation Pledges register with linked member selection, pledge date, due date, currency, notes and explicit open/partially-paid/fulfilled/cancelled status fields.
- Removed a duplicate Journal Lines register definition so the finance navigation has a single unambiguous entry.
- Hardened CSV export against spreadsheet formula injection by prefixing dangerous formula-leading cell values before quoting and exporting.
- These are implementation changes only; the requested full functional/security/end-to-end test phase remains deferred until online feature development is complete.


## Certificate document review refinement
- The document review UI now requires a non-empty reviewer reason before a rejection can be submitted; the reject action remains disabled until a reason is entered.
- The RPC receives the trimmed reviewer note. Database-side authorization and workflow constraints remain authoritative and still require comprehensive testing in the planned test phase.

- Donation pledge status is displayed read-only in the register until pledge receipt/allocation workflows are implemented; users cannot manually mark a pledge partially paid or fulfilled without recorded payments.

## Donation pledge payment allocation (online development)

- Added an append-only `donation_pledge_allocations` register linking posted donation receipts to pledges.
- Added the `allocate_donation_to_pledge` RPC. It requires an authenticated user with donation edit permission, checks same-church and branch access, requires a posted receipt and matching currency, and prevents allocation beyond either the pledge balance or receipt balance.
- Pledge status is recalculated as open, partially paid, or fulfilled from recorded allocations. Direct status edits are blocked; amount/currency changes are blocked after allocations exist.
- Allocation records cannot be edited or deleted through the client. Multiple partial allocations from the same receipt to the same pledge are supported.
- Added the Donation Pledge Payments workspace for selecting pledges and posted receipts, allocating a payment amount, and reviewing recent allocations.
- Fixed a malformed currency field declaration in the pledge register discovered during source inspection.
- This is implementation work only; end-to-end and security testing remain intentionally deferred until online feature development is complete. Production deployment is not confirmed.
- Added a security-invoker pledge balance report showing pledged, allocated and outstanding amounts; it follows the underlying pledge/allocation row-level access rules.


## Bank statement reconciliation (online development)
- Added a church-scoped bank reconciliation register for cash/bank statement lines, including statement date, reference, description, amount, currency and matching status.
- Added database RLS policies tied to the existing Accounts view/create/edit/delete permissions.
- Added database validation so a statement item can only be matched to a posted journal line in the same church and the chart-of-accounts asset mapped to the selected active financial account. A ledger line cannot be reconciled twice.
- Added the Bank Reconciliation workspace under Finance & Accounting.
- Supabase migration `20261125072855_bank_statement_reconciliation` is applied and the new table is visible in the selected project.
- This is a first reconciliation workflow increment. Statement-file import, reconciliation summary/totals, and full verification remain outstanding; the full testing phase is still deferred until online feature completion.

## Operational notifications expansion (online development)
- Added database-triggered notifications when a journal entry is posted, a financial budget is approved, or a church asset is marked disposed.
- Notifications are delivered individually to active church owners, administrators, pastors and secretaries, excluding the acting user where available.
- Notification text is intentionally generic and does not disclose donor, transaction, or confidential pastoral details.
- Applied Supabase migration `operational_event_notifications` and verified that all three database triggers are installed.
- This increment has not yet undergone functional/security end-to-end testing; production frontend deployment is not confirmed.


## Bank statement import and reconciliation reporting (online development)
- Added CSV statement import to the Bank Reconciliation workspace. It accepts Date, Description and Amount headers, plus optional Reference; signed positive/negative amounts are retained.
- Added validation for required headers, date and non-zero numeric amounts, three-letter currency code, 10 MB file size and 5,000-row import cap.
- Added duplicate reference/date checks against both the CSV itself and existing statement records before inserting.
- Added a security-invoker reconciliation summary view grouped by church, bank account and currency, showing matched, pending and ignored counts plus net amounts and statement date range.
- Added the summary report as a read-only finance register. The CSV import and summary UI are committed; the summary view migration is applied to Supabase.
- Statement file bytes are not retained after import; only normalized statement rows are stored. CSV import and reconciliation matching still require the deferred functional/security test phase.


## Church data backup export (online development)
- Added an owner/admin-only JSON data snapshot export in Church Settings.
- Export is restricted to the selected church workspace and reads through the signed-in user's existing RLS policies. The export includes row counts and a format/version manifest.
- Authentication credentials are excluded. Private Storage file bytes are not included; document metadata may retain storage paths.
- This is a data export foundation, not a complete disaster-recovery backup. A safe transactional restore workflow is still outstanding and the UI explicitly warns users not to manually import the snapshot into production.
- Full backup/restore verification remains part of the deferred acceptance and security test phase.


- GitHub Actions production TypeScript/Vite build passed for the bank CSV import and church backup settings integration (run 45570122849, commit `e3f3491`). This is a compile/build check only, not end-to-end or security acceptance testing.


## Realtime notification inbox (online development)
- Enabled the notifications table in the Supabase Realtime publication.
- The inbox subscribes to new inserts for the selected church and displays only rows addressed to the signed-in user; existing per-user RLS remains in force.
- Realtime publication membership was verified in the selected Supabase project. Functional multi-user delivery and reconnect behavior remain for the deferred acceptance test phase.


## Dashboard KPI expansion (online development)
- Expanded the live dashboard from four to six church-scoped KPIs: registered members, families, issued certificates, pending certificate reviews, monthly attendance check-ins and monthly posted donation totals.
- Donation totals now include posted receipts only, excluding drafts/unposted records.
- This remains a summary dashboard; full operational alert thresholds and report drill-downs are still to be completed and verified.


- GitHub Actions build passed after fixing the nullable Supabase client guard in the realtime notification subscription (run 45570409248, commit `39b5ffd`). This build includes the dashboard KPI and realtime inbox changes.

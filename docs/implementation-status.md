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


## Family registration code and child profiles
- New family records receive a church-scoped, system-generated registration code in the format `FAM-000001`; users cannot manually change the code.
- Existing family records with a missing code are backfilled when the migration runs. Number allocation is transaction-locked per church to prevent concurrent duplicate codes.
- The Family Register displays the code and provides a family detail view showing linked household members, relationship, member code, date of birth and primary-contact status. Children are identified by the configured child relationship and remain linked to their own member profiles.
- The application interface remains English; Roman Urdu is not used in software labels, forms, reports or system messages.
- Basic implementation/build verification is separate from the deferred full functional, security and end-to-end testing phase.


## Family register and English interface update
- Family registration numbers are generated server-side in the format `FAM-000001`, scoped to each church, protected from manual edits, and unique by the existing `(church_id, family_number)` constraint.
- The family detail view now displays the family code and all linked members. The child count uses the configured `child` relationship value and child rows include member code, gender, date of birth and membership status.
- The application interface is English-only. Roman Urdu is not used in labels, navigation, reports, notifications or errors. Urdu-script text may still be configured as certificate/document content, while the surrounding application controls remain English.
- Family UI changes and the system-generated code migration have passed GitHub build verification.

## Invitation delivery hardening
- The invitation Edge Function now requires the exact `APP_ALLOWED_ORIGIN` secret and rejects requests when the origin is missing or mismatched; wildcard CORS is no longer used.
- Newly invited users are assigned to the resolved branch, including the head-office default. If account creation succeeds but church membership insertion fails, the temporary invited Auth user is deleted to avoid an orphan account.
- The function is deployed with JWT verification enabled. Actual email delivery still requires a verified custom SMTP sender in Supabase Auth, an allowed Site URL/redirect URL, and the `APP_ALLOWED_ORIGIN` and `APP_REDIRECT_URL` Edge Function secrets. Those provider credentials and the final app origin must be configured by the project owner in the dashboard; they are not stored in source control.

## Database RPC security hardening
- Revoked anonymous/public execution from expense approval, budget approval, asset disposal, depreciation posting, donation posting, expense posting, journal posting and certificate reissue RPCs; authenticated execution remains granted and each function retains its in-function church/action permission checks.
- The public certificate QR verification RPC remains intentionally available to anonymous users and returns only its limited verification projection.
- Supabase Security Advisor now reports no anonymous-executable SECURITY DEFINER RPCs other than the intentionally public certificate verification function. Authenticated SECURITY DEFINER functions remain subject to their own authorization checks and are reviewed during the deferred full security test phase.


## Backup snapshot coverage update
- The JSON snapshot now includes certificate numbering sequences (owner/admin read-only access), audit export metadata and the current user's notification records, in addition to the previously listed church-scoped tables.
- The backup format version is now 2 so that future restore validation can reject older snapshots that omit sequence and operational metadata.
- The export still does not include Auth identities/passwords or private Storage object bytes. A transactional restore is not enabled until the restore path can validate those dependencies and safely recover private files.


## Finance notification coverage
- Donation receipts now notify active owner/admin/accountant/finance users when a receipt transitions to posted; the posting user is excluded.
- Expenses now notify active owner/admin/accountant/finance users when an approved expense transitions to posted; the posting user is excluded.
- Notification bodies are generic and do not disclose donor details, amounts, private notes or pastoral case information. The existing realtime inbox delivers the records to each recipient.


## Action-specific permission defaults
- The server-side `private.has_church_permission` helper now applies separate defaults for view, create, edit, delete, approve and issue instead of granting every action merely because a role can access a module.
- The team permission editor uses the same action-specific defaults. Owners and administrators retain full access; explicit per-user permission overrides continue to take precedence for other roles.
- Existing RLS policies and protected RPCs call the shared helper, so the tightened defaults apply at the database boundary as well as in the UI.


## Family code sequence durability
- Family codes now use a private per-church sequence table instead of calculating the next number from the highest visible family record.
- Deleting a family cannot cause its code to be reused. The sequence table is not exposed through the public API; only the server-side trigger can advance it.
- The selected database currently has no family records, so no existing family data was changed by this update.


## Family-to-child relationship consistency
- Member profiles now use the same `child` relationship value as the Family Relationships register; older `son`/`daughter` values remain visible and counted for compatibility.
- The member-to-family selector displays both family name and the generated Family Code, reducing the chance of linking a child to the wrong household.


## Family relationship validation alignment
- Expanded the database relationship constraint to accept the relationship values used by both the member profile and family relationship forms, including child, grandparent, sibling, guardian, dependent and member.
- The forms now share the same relationship vocabulary. Existing son/daughter values remain valid so historical links are not invalidated.


## Church inventory module
- Added branch-aware inventory item records with unique church-scoped stock codes, categories, units, reorder levels and optional branch restrictions.
- Added append-only stock movement records for receipts, issues and adjustments. Database validation checks item/branch ownership, quantity direction and prevents stock from falling below zero.
- Added read-only stock-on-hand and low-stock report views grouped by branch.
- Low-stock threshold crossings create generic notifications for active church owners, administrators, pastors, secretaries and staff; the user posting the movement is excluded.
- Added Inventory to the action-level permission editor and Assets & Maintenance workspace. Stock movements cannot be edited or deleted; corrections must be entered as adjustments.
- Added inventory records to the church data export and advanced the snapshot format to version 3.
- Inventory workflows are implementation-complete at the schema/UI level but remain untested until the planned full functional/security/E2E phase.


## Inventory branch notification privacy
- Low-stock notifications are now restricted to church staff whose membership is global or assigned to the affected branch. Staff assigned to another branch do not receive the alert.


## Register pagination
- Generic operational registers now fetch records in 500-row pages instead of silently stopping at the first 100.
- The UI supports up to 10,000 rows per register load and displays an English warning when that safety cap is reached; larger datasets should be narrowed by date or exported in smaller ranges.


## Approval permission enforcement
- Financial approval/posting RPCs now require the explicit `approve` action instead of treating ordinary `edit` permission as approval authority.
- This covers expense approval/posting, budget approval, donation posting, journal posting and asset depreciation/disposal. Document verification/rejection also requires the certificate-documents `approve` action.
- Asset disposal/depreciation additionally require accounting edit permission for the ledger impact.


## UI action permission enforcement
- Added an authenticated, read-only permission-check RPC that delegates to the same database permission helper used by RLS.
- Generic registers now hide Add, Edit, Delete and approval/posting actions when the signed-in user lacks the corresponding action permission.
- Member and family screens now hide create/edit/archive/document controls according to their module permissions. Database RLS and protected RPC checks remain the final authority.


## Dependency security update
- Replaced the stale npm-registry SheetJS package with the official SheetJS 0.20.3 tarball from the vendor CDN.
- Upgraded jsPDF to 4.2.1 and Vite to 6.4.5 to address published security advisories.
- GitHub production build completed successfully after the upgrades; the install step reported **0 npm audit vulnerabilities**.


## Dashboard inventory alert KPI
- Added a low-stock item count to the dashboard. The count is shown only when the current user has inventory view permission; otherwise the KPI displays `Restricted` rather than leaking branch inventory information.


## Certificate workflow notifications
- Certificate status transitions (submitted, under review, approved, issued, rejected or cancelled) now send generic notifications to active church reviewers and the applicant, where applicable.
- Notifications are branch-scoped for reviewers, exclude the acting user, avoid duplicate applicant delivery and do not disclose personal details or private reviewer notes.


## Backup storage coverage
- Version 5 JSON exports now include the binary contents of files under the church's private-document and branding storage folders, with MIME type, path and size metadata.
- Export safety limits are 2,000 files and 50 MB total. If listing or downloading any file fails, the export is aborted rather than silently creating a partial archive.
- Added owner/admin-only read access for listing branding assets. Private documents continue to use the existing church document view policy.
- Authentication identities and passwords remain excluded. The transactional restore procedure is still pending; file-complete export does not mean restore is ready.


## Transactional backup restore implementation
- Added an owner-only `restore_church_backup` RPC that restores the database snapshot in one PostgreSQL transaction. Any validation or foreign-key failure rolls back all database changes.
- Restore is restricted to a newly created target church containing only its initial owner and head-office branch. It refuses to overwrite a workspace that already has operational data.
- The current signed-in owner must also be the active owner in the source backup. Referenced Auth users must still exist in the same Supabase project; passwords and Auth identities are not recreated.
- Restore preserves original family codes, certificate numbering sequences, chart-of-account hierarchy, member/family links and certificate correction chains. Inventory history is replayed chronologically and checked for negative running balances.
- Private documents and branding files are uploaded to the target church paths before the database transaction. If file upload or the database transaction fails, uploaded files are removed as a compensating rollback. PostgreSQL data is atomic; Supabase Storage and PostgreSQL cannot share one cross-service ACID transaction.
- The UI accepts version 5 JSON backups, validates row/file counts and sizes, and requires explicit confirmation before restoring. Safety limits: 100,000 database records, 2,000 files and 50 MB storage data.
- **Restore is implemented but not yet functionally tested.** The selected Supabase project currently has no Auth users or church workspaces, so a real owner-to-empty-workspace restore test cannot be run until the first owner account and test workspaces exist. Full restore, storage cleanup and failure-injection tests remain in the planned acceptance phase.

- Version 5 restore now validates the exact storage object manifest, bucket, target path, file count and byte totals inside the database restore transaction; direct RPC calls cannot skip the file upload step.

- Notification backup rows remain scoped to the signed-in owner by the existing per-user inbox RLS policy; other members' inbox notifications are intentionally not exported.


## Database performance hygiene
- Added covering indexes for all public foreign-key columns to prevent slow parent-row deletes/updates and improve joins as church data grows.
- Removed redundant duplicate indexes and combined overlapping branch/profile SELECT policies without weakening their access conditions.
- Optimized pastoral RLS policies to evaluate the current authenticated user once per statement.
- The Supabase performance advisor now reports no unindexed foreign keys, duplicate indexes or multiple-permissive-policy warnings. It still lists unused indexes because this project currently has no real church workload; retain the FK indexes until workload-based measurements justify any removal.

- Additional custom UI gates now cover certificate submit/review/approve/issue/reissue/print actions, dashboard member registration and bank-statement CSV import.


## Backup restore integrity hardening
- Corrected the server-side row remapper so every restored database record is reassigned from the source `church_id` to the target workspace while retaining source record UUIDs to preserve all snapshot foreign-key relationships.
- Tenant-scoped storage paths are remapped to the target workspace. The remapper rejects any row whose source tenant key does not match the declared backup workspace.
- The remapping helper was applied to Supabase and included as migration `20261125190000_fix_backup_restore_tenant_remapping.sql`. A direct SQL unit check confirmed that both `church_id` and storage paths map to the target while unrelated fields remain unchanged.
- The browser restore flow now avoids deleting uploaded storage files when the RPC outcome is ambiguous (for example, a network failure after the server may have committed). It cleans up only when the database explicitly rejects the transaction, preventing a committed restore from being left with missing files.

## Family registration and child workflow
- Family registration codes are generated by the database sequence and displayed in the family register and family detail view.
- Family detail now provides an Add child / member action that opens a member profile pre-linked to that family. Relationship choices distinguish child, son and daughter; member profile captures gender, date of birth and membership status.

## Access matrix coverage
- Added member-document actions to the team custom permission matrix. Server-side RLS remains the enforcement boundary; UI checks are supplementary.
- Software interface copy is maintained in English; Roman Urdu is not used in application labels or system messages.


## Reporting and email delivery notes
- Added the read-only `family_directory_report` view (security-invoker) with generated family code, family name, primary contact, linked member count and child count. It is available in the Reports hub and inherits row-level security from its source tables.
- The invitation Edge Function is deployed with JWT verification and server-side role/branch checks. SMTP delivery is code-ready but still requires the deployed app origin, redirect URL and a verified SMTP sender to be configured in Supabase Dashboard. See `docs/email-invitations.md`; credentials must never be committed to Git.
- Build checks have passed for the family report migration and UI commits. Full transactional restore testing still requires a controlled source backup and a newly created empty target workspace; it is not being simulated against live church data.

- Added a confidential, security-invoker pastoral due/overdue follow-up register. It exposes only the case subject, due time, assigned user and overdue flag; access continues to follow the source pastoral tables' RLS policies.

- Standardized date, time and number formatting to the explicit English `en-GB` locale instead of inheriting the browser language. Certificate PDF generation selects English templates so the generated document language matches the current PDF renderer; Urdu-script PDF output is not advertised until proper font shaping is implemented.

- Added source/target tenant remapping and strict storage-path validation to backup restore. Both the browser and transactional database function reject dot-segment paths; a SQL check confirmed normal target paths are accepted and traversal paths are rejected.
- Restore now rejects database storage references that are not inside the source church folder, in addition to validating every uploaded manifest path and rejecting `.` / `..` path segments. A SQL check confirmed valid tenant-scoped paths are remapped to the target workspace.
- The separate church workspace logo path is also validated against the source tenant before it is remapped; blank logo paths remain null. This closes the metadata path outside the table-row restore path.
- Added an owner-only server-side restore preflight. Before any file upload, the RPC verifies the target has only its initial owner/head-office branch, no operational rows and no objects in either church storage bucket. Anonymous execution is revoked; authenticated execution is granted. This prevents overwriting existing target storage during restore.

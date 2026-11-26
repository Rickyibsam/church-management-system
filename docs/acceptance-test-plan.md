# Acceptance Test Plan

Status: planned; full execution is intentionally deferred until the online feature build is complete.

## Test environment prerequisites

- A dedicated Supabase test project or isolated test workspace.
- A first owner account and at least two test church workspaces.
- Two or more test users with different roles and branch assignments.
- A verified SMTP sender and the deployed application origin/redirect URL.
- A version 5 backup from a source workspace and a newly created empty target workspace.
- A deployed Cloudflare Worker build corresponding to the tested Git commit.

Never use real CNIC scans, medical/pastoral details or donor financial data in test fixtures.

## Authentication, tenancy and invitations

- Register a church with a required official church email; verify the email is persisted on the church record.
- Reject missing/invalid church email, duplicate usernames and weak passwords; confirm failed registration leaves no orphan church or Auth user.
- Sign in/out with Church ID + username + password. Staff users must not need individual email addresses.
- Verify password reset works through the supported church-admin recovery flow.
- Create the first church and verify the creator becomes its owner.
- Switch between multiple church workspaces without leaking data.
- Invite a new user, confirm email, and verify membership activation.
- Assign an existing confirmed user and prevent duplicate memberships.
- Confirm only the owner can grant the administrator role.
- Reject unauthorized, expired, wrong-origin and cross-church invitation requests.

## Platform Supporting Portal

- Confirm the Supporting Portal is a separate login tab and is not available to church staff accounts.
- Configure the exact allowed Worker origin and a private one-time Support Owner bootstrap key.
- Register the single Support Owner; verify a second registration is permanently rejected, including concurrent attempts.
- Verify incorrect username/password, missing setup key, wrong origin and non-Support-Owner tokens are rejected.
- Verify only the registered singleton Support Owner can load the church directory; normal church admins cannot enumerate other churches.
- Confirm the Support Owner identity is separate from all church memberships and does not bypass church RLS through the browser.

## Members, families and children

- Create a family and verify the database generates a unique `FAM-000001`-style code.
- Verify users cannot manually set or change the generated code.
- Delete a family and confirm its sequence number is never reused.
- Create a child from the family detail action and verify the family link is saved.
- Verify family detail lists children, parents, gender, date of birth and membership status.
- Confirm family and member reports show the same family code and relationship totals.
- Verify duplicate relationships and cross-church links are rejected.

## Certificates and private documents

- Submit each certificate type with its required supporting documents.
- Test country-specific document requirements, MIME restrictions and file-size limits.
- Verify review, rejection-note requirement, approval, issue, cancellation and reissue flows.
- Verify issued certificate numbers are unique and immutable.
- Verify PDF template layout, signatures/seals, QR verification and archived-file retrieval.
- Confirm public QR verification reveals only the approved minimal fields.
- Confirm private identity documents cannot be accessed through public URLs or another church.

## Attendance, services and events

- Create services and events; check in members and visitors.
- Validate visitor name/phone and attendance status/method.
- Verify duplicate or invalid attendance entries are rejected.
- Compare daily attendance summaries with the underlying register.
- Verify branch-scoped attendance access.

## Pastoral care

- Create a confidential case and assign a pastor.
- Verify assignment notifications contain no case subject or private notes.
- Schedule, reassign and complete follow-ups.
- Verify due/overdue report access is limited by pastoral RLS.
- Confirm unrelated staff cannot read confidential case details or attachments.

## Finance, donations, assets and inventory

- Verify chart-of-account and cash/bank mappings are church-scoped.
- Post donations and expenses and verify balanced journal entries.
- Reject unbalanced journals and edits to posted entries.
- Allocate posted donations to pledges; test partial payments, currency mismatch and over-allocation.
- Import bank CSV with quoted fields, duplicates, invalid dates and oversized files.
- Match/ignore reconciliation rows and verify bank summary totals.
- Approve budgets and compare planned vs posted actuals.
- Post asset depreciation and disposal; verify balanced journal impact.
- Receive, issue and adjust inventory; reject negative stock and verify branch-scoped low-stock alerts.

## Permissions, RLS and storage security

- Test view/create/edit/delete/approve/issue independently for every module.
- Repeat sensitive actions by calling the database RPC directly, bypassing UI controls.
- Verify cross-church and cross-branch reads/writes are denied.
- Verify member-document and certificate storage access with signed URLs and expiry.
- Verify notification inbox rows are visible only to their intended user.
- Review Supabase security and performance advisors and resolve unintended findings.

## Backup and restore

- Export a source workspace and verify row counts, table list and binary storage files.
- Restore to a newly created empty target workspace as the same active owner.
- Verify every restored row uses the target church ID while preserving intra-snapshot foreign keys.
- Verify family codes, certificate sequences, chart-account hierarchy and inventory history.
- Reject a non-empty target, wrong owner, malformed counts, unsupported backup version, invalid storage path, path traversal and missing/oversized files.
- Inject upload and database failures; verify database rollback and safe storage cleanup.
- Simulate an ambiguous network outcome and confirm uploaded files are retained for recovery rather than deleted.

## Reports, notifications and exports

- Reconcile member, family, certificate, attendance, financial, donor, pledge, bank, budget, inventory and pastoral reports with source records.
- Verify CSV, XLSX and PDF exports contain only authorized rows.
- Verify notification creation, realtime delivery, read/unread state and duplicate suppression.
- Verify all displayed dates and numbers use English formatting.

## Release and offline readiness

- Test desktop, tablet and mobile layouts, keyboard navigation and screen-reader labels.
- Verify the production Cloudflare Worker serves the tested commit and Supabase environment.
- Record defects, fixes, test evidence and release approval.
- Only after all online acceptance tests pass, begin the offline PWA phase. Do not cache identity documents or sensitive pastoral notes by default.

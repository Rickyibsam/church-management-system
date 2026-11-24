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

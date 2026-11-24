# Implementation Roadmap

The requested delivery order is:

## Phase A — Build the complete online system
- Complete database model and migrations
- Authentication, church tenancy, roles and action permissions
- All navigation modules and CRUD workflows
- Family/member relationships
- Certificate registration, configurable document checklist, private uploads, review/approval, branded templates, PDF issuance and QR verification
- Finance, donations, attendance, events, ministries, pastoral care, assets, reports and audit logs
- Admin settings, localization and responsive layouts
- Hosting and deployment configuration

## Phase B — Testing after feature completion
Do not treat placeholder screens or a successful build as feature completion. Once the feature set is implemented, run unit, integration, RLS/security, storage access, workflow and end-to-end tests; fix defects and document remaining limitations.

## Phase C — Offline edition after testing
- Installable PWA and service worker
- Cache application shell and explicitly approved reference data
- Offline draft entry for permitted forms
- IndexedDB local queue, idempotency keys and retry/backoff
- Conflict detection and a user-visible resolution workflow
- Encrypted local data where supported and automatic local expiry
- No offline access to sensitive CNIC/identity attachments by default
- Sync status, last successful sync and manual retry
- Cross-device and reconnect synchronization tests

Offline data access must be minimized on shared devices. Users must be able to sign out and clear local data. Sensitive pastoral notes and identity documents require stricter controls and should not be cached offline by default.

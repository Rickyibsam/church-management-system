# Product Scope

## Tenancy
- A user may belong to more than one church.
- Churches may have branches/campuses and departments/ministries.
- Every tenant-owned record is scoped to a church.
- Cross-church access is denied by default.

## Core modules
1. Church setup, branches, staff, roles and permissions
2. Member directory and household/family register
3. Certificates and official church registers
4. Private document collection and verification
5. Attendance and service management
6. Ministries, events and volunteer management
7. Pastoral care with restricted access
8. Donations, tithes, offerings, expenses and financial reporting
9. Assets, inventory and maintenance
10. Notifications, audit trail, exports and dashboards

## Certificate types
- Marriage register/certificate
- Birth or child record; child dedication certificate
- Death register/memorial or funeral record
- Baptism certificate
- Membership certificate
- Family registration certificate
- Confirmation, ordination, transfer, recommendation and participation certificates

The product must label church-issued records accurately. Government civil registration and church religious records are separate processes; country- and jurisdiction-specific legal requirements must be configurable and reviewed before launch.

## Registration workflow
Draft -> Documents Pending -> Submitted -> Under Review -> Approved -> Issued

Alternative terminal states: Rejected, Withdrawn, Cancelled, Superseded.

Each workflow stores who performed the action and when. Corrections and reissues retain the original record and a full history rather than silently overwriting issued certificates.

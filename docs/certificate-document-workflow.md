# Certificate and Document Workflow

## Configurable document checklists
Each certificate type has configurable required/optional document types, accepted file formats, maximum file size, applicant instructions and jurisdiction/branch applicability.

Example supporting evidence (not a universal legal checklist):
- Marriage: bride and groom identity documents; witness identity documents; application and ceremony details; any locally required supporting evidence.
- Birth/child record: parents' identity documents and available hospital/birth evidence.
- Death: deceased identity document when available, applicant identity and available death/burial/hospital evidence.
- Baptism: member identity/member record and guardian consent/evidence where applicable for minors.
- Family registration: family-head and spouse identity, children's B-Forms/identity evidence where applicable, and relationship evidence.

Church administrators must be able to change checklists. The system must display that official government registration may require a separate process and authority.

## Attachment security
- Store files in a private Supabase Storage bucket.
- Use opaque object paths; do not put names or CNIC numbers in object keys.
- Validate MIME type and file size; scan uploads for malware before staff download/open where infrastructure permits.
- Serve files through short-lived authorized signed URLs.
- Restrict access by church, role and record assignment.
- Record uploader, timestamp, document type, verification status and reviewer notes.
- Never expose attachments through public URLs or place them in Git.

## Certificate template designer
Per-church configurable logo, header, footer, church contact details, page size/orientation, language, typography, border/background, signature images and official church seal. Preview before issue; preserve the exact issued PDF/template version.

## Numbering and verification
Use a transaction-safe per-church, per-certificate-type sequence. Suggested display formats: MAR-YYYY-000001, BIR-YYYY-000001, DEA-YYYY-000001, BAP-YYYY-000001 and FAM-YYYY-000001. A QR code should resolve to a minimal verification page showing only approved public verification fields, never identity documents or private family data.

## Auditability
Track submissions, document review, approval, issuance, print/reprint, correction, cancellation and verification. Reissue must reference the superseded certificate.

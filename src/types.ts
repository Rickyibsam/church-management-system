export type ModuleKey =
  | "dashboard" | "churches" | "team" | "members" | "families" | "certificates"
  | "documents" | "attendance" | "ministries" | "events" | "pastoral"
  | "finance" | "donations" | "assets" | "reports" | "settings" | "support";

export type CertificateType =
  | "marriage" | "birth" | "death" | "baptism" | "family"
  | "membership" | "dedication" | "confirmation" | "ordination" | "transfer";

export type WorkflowStatus =
  | "draft" | "documents_pending" | "submitted" | "under_review"
  | "approved" | "issued" | "rejected" | "cancelled" | "superseded";

export interface ChurchProfile {
  id: string;
  name: string;
  country: string;
  currency: string;
  timezone: string;
}
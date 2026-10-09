export type UserRole = "censio_admin" | "client_admin" | "client_user"

export type LeadSource = "demo" | "meta" | "website" | "landing" | "manual" | "import"

export type OrganizationRow = {
  id: string
  slug: string
  name: string
  logo_url: string | null
  logo_background?: string | null
  demo_mode: boolean
  lead_sheet_template_id?: string | null
  /** Set when the lead sheet changed while webhooks existed; cleared once reviewed. */
  webhook_payload_stale_since?: string | null
  /** When this client's lead sheet last changed; Meta form mappings older than this need review. */
  lead_sheet_changed_at?: string | null
  cvr?: string | null
  address?: string | null
  zip_code?: string | null
  city?: string | null
  country?: string | null
  primary_contact_name?: string | null
  primary_contact_email?: string | null
  primary_contact_phone?: string | null
  website_url?: string | null
  /** Hvidbjerg certified marketing program (admin-only). */
  hvidbjerg_partner?: boolean
  created_at: string
  updated_at: string
}

export type OnboardingApplicationStatus = "pending" | "approved" | "rejected"
export type OnboardingApplicationSource = "public_form" | "admin_manual"

export type OnboardingApplicationRow = {
  id: string
  status: OnboardingApplicationStatus
  source: OnboardingApplicationSource
  submitted_at: string
  company_name: string
  cvr: string | null
  contact_full_name: string
  contact_email: string
  contact_phone: string
  address: string
  zip_code: string
  city: string
  country: string
  website_url: string | null
  consent_given: boolean
  notes: string | null
  rejection_reason: string | null
  organization_id: string | null
  approved_by: string | null
  approved_at: string | null
  submitter_ip_hash: string | null
  created_at: string
  updated_at: string
}

export type ProfileRow = {
  id: string
  organization_id: string | null
  role: UserRole
  email: string | null
  full_name: string | null
  avatar_url: string | null
  preferred_locale: string
  created_at: string
  updated_at: string
}

export type LeadFunnelPlatform = "website" | "landing" | "manual"

export type LeadFunnelRow = {
  id: string
  organization_id: string
  name: string
  slug: string
  platform: LeadFunnelPlatform
  webhook_secret: string
  field_mapping: Record<string, string>
  enabled: boolean
  /** Field names the sender uses: `ours` ignores any saved mapping, `own` applies it. */
  data_format: "ours" | "own"
  /** Set while the webhook waits for one request to use as a sample (no lead is created). */
  sample_listening_until: string | null
  sample_payload: Record<string, unknown> | null
  sample_received_at: string | null
  /** Why the last request could not be used as a sample. */
  sample_error: string | null
  created_at: string
  updated_at: string
}

export type LeadRow = {
  id: string
  organization_id: string
  legacy_id: string | null
  lead_date: string
  lead_time: string | null
  full_name: string
  email: string
  phone: string
  segment: string
  company_name: string
  address: string
  zip_code: string
  city: string
  service_ids: string[]
  service_legacy: string
  platform: string
  meta_ad_id: string
  meta_form_id: string | null
  meta_extra: Record<string, string>
  status: string
  sales_price: number | null
  profit: number | null
  source: LeadSource
  locked_fields: string[]
  custom_fields: Record<string, unknown>
  /** The import that created this lead, if any (used to undo an import). */
  import_id: string | null
  created_at: string
  updated_at: string
}

export type CustomerRow = {
  id: string
  organization_id: string
  lead_id: string
  closed_date: string
  full_name: string
  email: string
  phone: string
  segment: string
  company_name: string
  address: string
  zip_code: string
  city: string
  service_ids: string[]
  sales_price: number
  profit: number
  source: string
  created_at: string
  updated_at: string
}

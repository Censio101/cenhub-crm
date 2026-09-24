export type UserRole = "censio_admin" | "client_admin" | "client_user"

export type LeadSource = "demo" | "meta" | "website" | "landing" | "manual"

export type OrganizationRow = {
  id: string
  slug: string
  name: string
  logo_url: string | null
  demo_mode: boolean
  cvr?: string | null
  address?: string | null
  zip_code?: string | null
  city?: string | null
  country?: string | null
  primary_contact_name?: string | null
  primary_contact_email?: string | null
  primary_contact_phone?: string | null
  website_url?: string | null
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
  created_at: string
  updated_at: string
}

export type LeadRow = {
  id: string
  organization_id: string
  legacy_id: string | null
  lead_date: string
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
  status: string
  sales_price: number | null
  profit: number | null
  source: LeadSource
  locked_fields: string[]
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

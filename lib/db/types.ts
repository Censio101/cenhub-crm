export type UserRole = "censio_admin" | "client_admin" | "client_user"

export type LeadSource = "demo" | "meta" | "website" | "landing" | "manual"

export type OrganizationRow = {
  id: string
  slug: string
  name: string
  logo_url: string | null
  demo_mode: boolean
  created_at: string
  updated_at: string
}

export type ProfileRow = {
  id: string
  organization_id: string | null
  role: UserRole
  email: string | null
  full_name: string | null
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

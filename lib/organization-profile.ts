import type { OrganizationRow } from "@/lib/db/types"
import {
  isOnboardingContactEmailValid,
  normalizeWebsiteUrl,
} from "@/lib/onboarding/application-input"
import {
  normalizeOnboardingCvr,
  normalizeOnboardingZipCode,
} from "@/lib/onboarding/digit-fields"
import { normalizeOnboardingContactPhone } from "@/lib/onboarding/phone"

export type OrganizationProfile = {
  name: string
  cvr: string | null
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone: string
  address: string
  zipCode: string
  city: string
  country: string
  websiteUrl: string | null
}

export type OrganizationProfilePatchInput = Partial<
  OrganizationProfile & { slug?: string }
>

export type ProfileValidationResult =
  | { ok: true; patch: Partial<OrganizationRow> }
  | { ok: false; error: string }

function trim(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function organizationProfileFromRow(
  row: OrganizationProfileCompletenessFields &
    Pick<OrganizationRow, "cvr" | "country" | "website_url">
): OrganizationProfile {
  return {
    name: row.name,
    cvr: row.cvr ?? null,
    primaryContactName: row.primary_contact_name ?? "",
    primaryContactEmail: row.primary_contact_email ?? "",
    primaryContactPhone: row.primary_contact_phone ?? "",
    address: row.address ?? "",
    zipCode: row.zip_code ?? "",
    city: row.city ?? "",
    country: row.country ?? "DK",
    websiteUrl: row.website_url ?? null,
  }
}

export type OrganizationProfileCompletenessFields = Pick<
  OrganizationRow,
  | "name"
  | "primary_contact_name"
  | "primary_contact_email"
  | "primary_contact_phone"
  | "address"
  | "zip_code"
  | "city"
>

export function isOrganizationProfileComplete(row: OrganizationProfileCompletenessFields): boolean {
  const name = row.name?.trim()
  const contactName = row.primary_contact_name?.trim()
  const contactEmail = row.primary_contact_email?.trim()
  const contactPhone = row.primary_contact_phone?.trim()
  const address = row.address?.trim()
  const zip = row.zip_code?.trim()
  const city = row.city?.trim()

  return Boolean(
    name &&
      contactName &&
      contactEmail &&
      isOnboardingContactEmailValid(contactEmail) &&
      contactPhone &&
      address &&
      zip &&
      city
  )
}

export function missingOrganizationProfileFields(row: OrganizationRow): string[] {
  const missing: string[] = []
  if (!row.name?.trim()) missing.push("name")
  if (!row.primary_contact_name?.trim()) missing.push("primary_contact_name")
  if (!row.primary_contact_email?.trim() || !isOnboardingContactEmailValid(row.primary_contact_email)) {
    missing.push("primary_contact_email")
  }
  if (!row.primary_contact_phone?.trim()) missing.push("primary_contact_phone")
  if (!row.address?.trim()) missing.push("address")
  if (!row.zip_code?.trim()) missing.push("zip_code")
  if (!row.city?.trim()) missing.push("city")
  return missing
}

/** Full profile save (all required fields must be present and valid). */
export function parseOrganizationProfileBody(body: unknown): ProfileValidationResult {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {}

  const name = trim(record.name)
  const contactFullName = trim(record.primaryContactName ?? record.contactFullName)
  const contactEmail = trim(record.primaryContactEmail ?? record.contactEmail).toLowerCase()
  const contactPhoneRaw = trim(record.primaryContactPhone ?? record.contactPhone)
  const contactPhone = contactPhoneRaw ? normalizeOnboardingContactPhone(contactPhoneRaw) : null
  const address = trim(record.address)
  const zipCodeRaw = trim(record.zipCode)
  const zipCode = zipCodeRaw ? normalizeOnboardingZipCode(zipCodeRaw) : null
  const city = trim(record.city)
  const country = trim(record.country) || "DK"
  const cvrRaw = trim(record.cvr)
  const cvr = cvrRaw ? normalizeOnboardingCvr(cvrRaw) : null
  const websiteRaw = trim(record.websiteUrl)
  const websiteUrl = websiteRaw ? normalizeWebsiteUrl(websiteRaw) : null

  if (!name) return { ok: false, error: "company_name_required" }
  if (!contactFullName) return { ok: false, error: "contact_name_required" }
  if (!contactEmail || !isOnboardingContactEmailValid(contactEmail)) {
    return { ok: false, error: "contact_email_invalid" }
  }
  if (!contactPhone) return { ok: false, error: "contact_phone_invalid" }
  if (!address) return { ok: false, error: "address_required" }
  if (!zipCode) return { ok: false, error: "zip_code_invalid" }
  if (!city) return { ok: false, error: "city_required" }
  if (cvrRaw && !cvr) return { ok: false, error: "cvr_invalid" }
  if (websiteRaw && !websiteUrl) return { ok: false, error: "website_url_invalid" }

  return {
    ok: true,
    patch: {
      name,
      cvr: cvr ?? null,
      primary_contact_name: contactFullName,
      primary_contact_email: contactEmail,
      primary_contact_phone: contactPhone,
      address,
      zip_code: zipCode,
      city,
      country,
      website_url: websiteUrl,
    },
  }
}

/** Partial patch for admin (only validates fields present in body). */
export function parseOrganizationProfilePartialBody(body: unknown): ProfileValidationResult {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  const patch: Partial<OrganizationRow> = {}

  if (record.name !== undefined) {
    const name = trim(record.name)
    if (!name) return { ok: false, error: "company_name_required" }
    patch.name = name
  }

  if (record.cvr !== undefined) {
    const cvrRaw = trim(record.cvr)
    if (!cvrRaw) {
      patch.cvr = null
    } else {
      const cvr = normalizeOnboardingCvr(cvrRaw)
      if (!cvr) return { ok: false, error: "cvr_invalid" }
      patch.cvr = cvr
    }
  }

  if (record.primaryContactName !== undefined) {
    const v = trim(record.primaryContactName)
    if (!v) return { ok: false, error: "contact_name_required" }
    patch.primary_contact_name = v
  }

  if (record.primaryContactEmail !== undefined) {
    const v = trim(record.primaryContactEmail).toLowerCase()
    if (!v || !isOnboardingContactEmailValid(v)) {
      return { ok: false, error: "contact_email_invalid" }
    }
    patch.primary_contact_email = v
  }

  if (record.primaryContactPhone !== undefined) {
    const raw = trim(record.primaryContactPhone)
    const phone = raw ? normalizeOnboardingContactPhone(raw) : null
    if (!phone) return { ok: false, error: "contact_phone_invalid" }
    patch.primary_contact_phone = phone
  }

  if (record.address !== undefined) {
    const v = trim(record.address)
    if (!v) return { ok: false, error: "address_required" }
    patch.address = v
  }

  if (record.zipCode !== undefined) {
    const raw = trim(record.zipCode)
    const zip = raw ? normalizeOnboardingZipCode(raw) : null
    if (!zip) return { ok: false, error: "zip_code_invalid" }
    patch.zip_code = zip
  }

  if (record.city !== undefined) {
    const v = trim(record.city)
    if (!v) return { ok: false, error: "city_required" }
    patch.city = v
  }

  if (record.country !== undefined) {
    patch.country = trim(record.country) || "DK"
  }

  if (record.websiteUrl !== undefined) {
    const raw = trim(record.websiteUrl)
    if (!raw) {
      patch.website_url = null
    } else {
      const url = normalizeWebsiteUrl(raw)
      if (!url) return { ok: false, error: "website_url_invalid" }
      patch.website_url = url
    }
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "no_fields" }
  }

  return { ok: true, patch }
}

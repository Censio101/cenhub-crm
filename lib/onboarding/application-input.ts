import {
  normalizeOnboardingCvr,
  normalizeOnboardingZipCode,
} from "@/lib/onboarding/digit-fields"
import { normalizeOnboardingContactPhone } from "@/lib/onboarding/phone"

export type OnboardingApplicationInput = {
  companyName: string
  cvr?: string
  contactFullName: string
  contactEmail: string
  contactPhone: string
  address: string
  zipCode: string
  city: string
  country?: string
  websiteUrl?: string
  consentGiven?: boolean
  notes?: string
}

export type ApplicationValidationResult =
  | { ok: true; value: OnboardingApplicationInput }
  | { ok: false; error: string }

function trim(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isOnboardingContactEmailValid(email: string): boolean {
  const normalized = normalizeEmail(email)
  if (!normalized) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

/** Accepts https://…, www.example.com, example.com — stores as https URL. */
export function normalizeWebsiteUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  let candidate = trimmed
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate.replace(/^\/\//, "")}`
  }

  try {
    const parsed = new URL(candidate)
    const host = parsed.hostname.toLowerCase()
    if (!host || host.length > 253) return null
    if (!host.includes(".") && host !== "localhost") return null
    if (!/^[a-z0-9.-]+$/i.test(host)) return null
    if (host.startsWith(".") || host.endsWith(".") || host.includes("..")) return null

    if (parsed.pathname === "/" && !parsed.search && !parsed.hash) {
      return parsed.origin
    }
    return parsed.href
  } catch {
    return null
  }
}

export function parseOnboardingApplicationBody(
  body: unknown,
  options: { requireConsent?: boolean } = {}
): ApplicationValidationResult {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {}

  const companyName = trim(record.companyName)
  const contactFullName = trim(record.contactFullName)
  const contactEmail = normalizeEmail(trim(record.contactEmail))
  const contactPhoneRaw = trim(record.contactPhone)
  const contactPhone = contactPhoneRaw ? normalizeOnboardingContactPhone(contactPhoneRaw) : null
  const address = trim(record.address)
  const zipCodeRaw = trim(record.zipCode)
  const zipCode = zipCodeRaw ? normalizeOnboardingZipCode(zipCodeRaw) : null
  const city = trim(record.city)
  const country = trim(record.country) || "DK"
  const cvrRaw = trim(record.cvr)
  const cvr = cvrRaw ? normalizeOnboardingCvr(cvrRaw) : undefined
  const websiteRaw = trim(record.websiteUrl)
  const websiteUrl = websiteRaw ? normalizeWebsiteUrl(websiteRaw) : null
  const notes = trim(record.notes)
  const consentGiven = Boolean(record.consentGiven)

  if (!companyName) return { ok: false, error: "company_name_required" }
  if (!contactFullName) return { ok: false, error: "contact_name_required" }
  if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { ok: false, error: "contact_email_invalid" }
  }
  if (!contactPhone) {
    return { ok: false, error: "contact_phone_invalid" }
  }
  if (!address) return { ok: false, error: "address_required" }
  if (!zipCode) return { ok: false, error: "zip_code_invalid" }
  if (!city) return { ok: false, error: "city_required" }
  if (cvrRaw && !cvr) return { ok: false, error: "cvr_invalid" }
  if (options.requireConsent && !consentGiven) {
    return { ok: false, error: "consent_required" }
  }
  if (websiteRaw && !websiteUrl) {
    return { ok: false, error: "website_url_invalid" }
  }

  return {
    ok: true,
    value: {
      companyName,
      cvr,
      contactFullName,
      contactEmail,
      contactPhone,
      address,
      zipCode,
      city,
      country,
      websiteUrl: websiteUrl ?? undefined,
      consentGiven,
      notes: notes || undefined,
    },
  }
}

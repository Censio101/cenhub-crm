import { getSupabaseUrl } from "@/lib/supabase/config"

export const ORGANIZATION_LOGO_BUCKET = "organization-logos"

export const ORGANIZATION_LOGO_MAX_BYTES = 2 * 1024 * 1024

const ALLOWED_LOGO_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
])

export const ORGANIZATION_LOGO_BACKGROUNDS = ["transparent", "white", "dark"] as const

export type OrganizationLogoBackground = (typeof ORGANIZATION_LOGO_BACKGROUNDS)[number]

export function isOrganizationLogoBackground(value: unknown): value is OrganizationLogoBackground {
  return (
    typeof value === "string" &&
    (ORGANIZATION_LOGO_BACKGROUNDS as readonly string[]).includes(value)
  )
}

/** Unknown / missing values fall back to a white backdrop (safe for dark logos on dark headers). */
export function parseOrganizationLogoBackground(value: unknown): OrganizationLogoBackground {
  return isOrganizationLogoBackground(value) ? value : "white"
}

export function isAllowedOrganizationLogoMime(type: string): boolean {
  return ALLOWED_LOGO_MIME.has(type)
}

export function organizationLogoObjectPath(organizationId: string, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png"
  return `${organizationId}/logo.${safeExt}`
}

/** logo_url column: storage object path or absolute/static URL. */
export function resolveOrganizationLogoUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl?.trim()) return null
  const value = logoUrl.trim()
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/") ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value
  }
  const base = getSupabaseUrl().replace(/\/$/, "")
  return `${base}/storage/v1/object/public/${ORGANIZATION_LOGO_BUCKET}/${value}`
}

export function organizationLogoExtFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase()
  if (fromName === "svg" || fromName === "png" || fromName === "jpg" || fromName === "jpeg" || fromName === "webp") {
    if (fromName === "jpg") return "jpeg"
    return fromName
  }
  if (file.type === "image/svg+xml") return "svg"
  if (file.type === "image/png") return "png"
  if (file.type === "image/webp") return "webp"
  return "jpeg"
}

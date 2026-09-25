const RESERVED_ADMIN_SEGMENTS = new Set([
  "meta",
  "meta-sync",
  "settings",
  "konto",
  "admins",
  "integrations",
  "onboarding",
  "clients",
])

/** Internal/demo clients hidden from the admin header client switcher. */
const HIDDEN_CLIENT_SWITCHER_SLUGS = new Set(["demo-meta-client"])

export function isVisibleInClientSwitcher(slug: string): boolean {
  return !HIDDEN_CLIENT_SWITCHER_SLUGS.has(slug)
}

export type AdminClientSection = "overview" | "meta" | "demo" | "users" | "funnels"

export function parseAdminClientSlug(pathname: string): string | null {
  const canonical = pathname.match(/^\/admin\/clients\/([^/]+)(?:\/|$)/)
  if (canonical) {
    return decodeURIComponent(canonical[1])
  }

  const legacy = pathname.match(/^\/admin\/([^/]+)(?:\/|$)/)
  if (!legacy) return null
  const slug = decodeURIComponent(legacy[1])
  if (RESERVED_ADMIN_SEGMENTS.has(slug)) return null
  return slug
}

function sectionSuffix(pathname: string, slug: string): AdminClientSection | null {
  const canonicalBase = `/admin/clients/${slug}`
  const legacyBase = `/admin/${slug}`

  if (pathname === canonicalBase || pathname === `${canonicalBase}/`) {
    return "overview"
  }
  if (pathname.startsWith(`${canonicalBase}/demo`) || pathname.startsWith(`${legacyBase}/demo`)) {
    return "demo"
  }
  if (pathname.startsWith(`${canonicalBase}/users`) || pathname.startsWith(`${legacyBase}/users`)) {
    return "users"
  }
  if (
    pathname.startsWith(`${canonicalBase}/funnels`) ||
    pathname.startsWith(`${legacyBase}/funnels`)
  ) {
    return "funnels"
  }
  if (pathname.startsWith(`${canonicalBase}/meta`) || pathname.startsWith(`${legacyBase}/meta`)) {
    return "meta"
  }
  if (pathname === legacyBase || pathname === `${legacyBase}/`) {
    return "overview"
  }
  return null
}

export function adminClientSection(pathname: string): AdminClientSection | null {
  const slug = parseAdminClientSlug(pathname)
  if (!slug) return null
  return sectionSuffix(pathname, slug)
}

export function isAdminClientSettingsScope(pathname: string): boolean {
  return isClientManagePath(pathname) || isLegacyAdminClientPath(pathname)
}

/** True for `/admin/clients/{slug}` and section subpaths — not the directory alone. */
export function isClientManagePath(pathname: string): boolean {
  return /^\/admin\/clients\/[^/]+(?:\/|$)/.test(pathname)
}

/** Workspace admin routes (hub, directory, onboarding, …) — not per-client manage shell. */
export function isAdminWorkspacePath(pathname: string): boolean {
  if (!pathname.startsWith("/admin")) return false
  if (isClientManagePath(pathname)) return false
  if (isLegacyAdminClientPath(pathname)) return false
  return true
}

export function isLegacyAdminClientPath(pathname: string): boolean {
  const match = pathname.match(/^\/admin\/([^/]+)(?:\/|$)/)
  if (!match) return false
  const segment = decodeURIComponent(match[1])
  if (RESERVED_ADMIN_SEGMENTS.has(segment)) return false
  return true
}

/** Canonical settings home for a client. */
export function adminClientSettingsBasePath(slug: string) {
  return `/admin/clients/${slug}`
}

export function adminClientSettingsSectionPath(slug: string, section: AdminClientSection) {
  if (section === "overview") return adminClientSettingsBasePath(slug)
  return `/admin/clients/${slug}/${section}`
}

export function adminClientBasePath(slug: string) {
  return adminClientSettingsSectionPath(slug, "meta")
}

/** Map a legacy `/admin/{slug}/…` URL to the canonical client settings URL. */
export function legacyAdminClientPathToCanonical(pathname: string): string | null {
  if (!isLegacyAdminClientPath(pathname)) return null
  const slug = parseAdminClientSlug(pathname)
  if (!slug) return null
  const section = sectionSuffix(pathname, slug)
  if (!section) return adminClientSettingsBasePath(slug)
  return adminClientSettingsSectionPath(slug, section)
}

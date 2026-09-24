const RESERVED_ADMIN_SEGMENTS = new Set([
  "meta",
  "meta-sync",
  "settings",
  "konto",
  "admins",
  "integrations",
  "onboarding",
])

/** Internal/demo clients hidden from the admin header client switcher. */
const HIDDEN_CLIENT_SWITCHER_SLUGS = new Set(["demo-meta-client"])

export function isVisibleInClientSwitcher(slug: string): boolean {
  return !HIDDEN_CLIENT_SWITCHER_SLUGS.has(slug)
}

export function parseAdminClientSlug(pathname: string): string | null {
  const match = pathname.match(/^\/admin\/([^/]+)(?:\/|$)/)
  if (!match) return null
  const slug = decodeURIComponent(match[1])
  if (RESERVED_ADMIN_SEGMENTS.has(slug)) return null
  return slug
}

export function adminClientSection(
  pathname: string
): "meta" | "demo" | "users" | "funnels" | null {
  const slug = parseAdminClientSlug(pathname)
  if (!slug) return null
  if (pathname.startsWith(`/admin/${slug}/demo`)) return "demo"
  if (pathname.startsWith(`/admin/${slug}/users`)) return "users"
  if (pathname.startsWith(`/admin/${slug}/funnels`)) return "funnels"
  if (pathname.startsWith(`/admin/${slug}/meta`) || pathname === `/admin/${slug}`) {
    return "meta"
  }
  return null
}

export function adminClientBasePath(slug: string) {
  return `/admin/${slug}/meta`
}

const DEFAULT_SITE_URL = "https://cenhub-crm.vercel.app"

/** Public base URL for Meta webhooks and copy-paste in admin UI. */
export function resolvePublicSiteUrl(request?: Request): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    process.env.CRM_SITE_URL?.trim().replace(/\/$/, "") ||
    ""
  if (fromEnv) return fromEnv

  if (request) {
    try {
      return new URL(request.url).origin
    } catch {
      // ignore
    }
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000"
  }

  return DEFAULT_SITE_URL
}

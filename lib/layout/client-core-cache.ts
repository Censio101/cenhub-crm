import { hasCustomersCache, hasLeadsCache } from "@/lib/data/client-cache"

/** True when the target core route can render from memory without a cold load. */
export function hasCacheForClientCorePath(pathname: string, organizationSlug: string | null) {
  if (pathname === "/kunder") return hasCustomersCache(organizationSlug)
  if (pathname === "/" || pathname === "/leads") return hasLeadsCache(organizationSlug)
  return false
}

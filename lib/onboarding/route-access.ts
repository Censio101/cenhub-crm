/** Ruter der må åbnes uden login (tilbud til kunder, velkommen, login). */

const PUBLIC_PAGE_PREFIXES = [
  "/login",
  "/log-ind",
  "/logget-ud",
  "/tilbud/",
  "/velkommen/",
  "/admin/invitation/",
] as const

const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/offers/",
  "/api/invite/",
  "/api/admin/invitation/",
] as const

export function isPublicPagePath(pathname: string): boolean {
  if (pathname === "/log-ind") return true
  return PUBLIC_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  )
}

export function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function isPublicRequest(pathname: string): boolean {
  return isPublicPagePath(pathname) || isPublicApiPath(pathname)
}

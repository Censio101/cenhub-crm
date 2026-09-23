const LOGGED_OUT_PATHS = new Set(["/logget-ud", "/login"])

export function isLoggedOutPath(pathname: string) {
  return LOGGED_OUT_PATHS.has(pathname)
}

export function isAdminPath(pathname: string) {
  return pathname.startsWith("/admin")
}

export function isClientDashboardPath(pathname: string) {
  if (isLoggedOutPath(pathname) || isAdminPath(pathname)) return false

  return (
    pathname === "/" ||
    pathname.startsWith("/overblik") ||
    pathname.startsWith("/leads") ||
    pathname.startsWith("/kunder") ||
    pathname.startsWith("/lead-performance") ||
    pathname.startsWith("/indstillinger")
  )
}

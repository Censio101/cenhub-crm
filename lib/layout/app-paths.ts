const LOGGED_OUT_PATHS = new Set(["/logget-ud", "/login"])

export function isLoggedOutPath(pathname: string) {
  return LOGGED_OUT_PATHS.has(pathname)
}

export function isAuthPath(pathname: string) {
  return (
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/auth/invite") ||
    pathname.startsWith("/auth/setup-password")
  )
}

export function isPublicSignupPath(pathname: string) {
  return pathname === "/tilmelding" || pathname.startsWith("/tilmelding/")
}

/** Public pages shown to prospects: logo + login only, no app navigation. */
export function isGuestShellPath(pathname: string) {
  return isLoggedOutPath(pathname) || isAuthPath(pathname) || isPublicSignupPath(pathname)
}

export function isMinimalHeaderPath(pathname: string) {
  return isGuestShellPath(pathname)
}

export function isAdminPath(pathname: string) {
  return pathname.startsWith("/admin")
}

export function isClientPickerPath(pathname: string) {
  return pathname === "/klienter" || pathname.startsWith("/klienter/")
}

export function isClientDashboardPath(pathname: string) {
  if (isLoggedOutPath(pathname) || isAdminPath(pathname)) return false
  if (isPublicSignupPath(pathname)) return false

  return (
    pathname === "/" ||
    pathname.startsWith("/overblik") ||
    pathname.startsWith("/leads") ||
    pathname.startsWith("/kunder") ||
    pathname.startsWith("/lead-performance") ||
    pathname.startsWith("/indstillinger") ||
    isClientPickerPath(pathname)
  )
}

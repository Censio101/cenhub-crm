export const CLIENT_ALLOWED_PATHS = ["/", "/leads", "/kunder", "/virksomhed", "/konto"] as const

export function isClientAllowedPath(pathname: string): boolean {
  for (const allowed of CLIENT_ALLOWED_PATHS) {
    if (allowed === "/") {
      if (pathname === "/") return true
      continue
    }
    if (pathname === allowed || pathname.startsWith(`${allowed}/`)) return true
  }
  return false
}

export const CLIENT_LEGACY_REDIRECTS: Record<string, string> = {
  "/indstillinger": "/virksomhed",
  "/onboarding": "/",
  "/kontakt": "/",
  "/overblik": "/",
  "/lead-performance": "/",
}

export function clientLegacyRedirectTarget(pathname: string): string | null {
  if (CLIENT_LEGACY_REDIRECTS[pathname]) {
    return CLIENT_LEGACY_REDIRECTS[pathname]
  }
  for (const [prefix, target] of Object.entries(CLIENT_LEGACY_REDIRECTS)) {
    if (prefix !== "/" && pathname.startsWith(`${prefix}/`)) {
      return target
    }
  }
  return null
}

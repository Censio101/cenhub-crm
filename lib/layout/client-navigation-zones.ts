export type NavigationZone = "clientCore" | "clientSettings" | "admin" | "other"

const CLIENT_CORE = new Set(["/", "/leads", "/kunder"])
const CLIENT_SETTINGS_PREFIXES = ["/virksomhed", "/konto", "/indstillinger"]

export function getNavigationZone(pathname: string): NavigationZone {
  if (pathname.startsWith("/admin")) return "admin"
  if (CLIENT_CORE.has(pathname)) return "clientCore"
  for (const prefix of CLIENT_SETTINGS_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return "clientSettings"
    }
  }
  return "other"
}

export function isClientCorePath(pathname: string): boolean {
  return getNavigationZone(pathname) === "clientCore"
}

export function isClientSettingsPath(pathname: string): boolean {
  return getNavigationZone(pathname) === "clientSettings"
}

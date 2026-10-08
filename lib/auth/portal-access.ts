export const PORTAL_PASSWORD_MIN_LENGTH = 8

export type PortalAccessMethod = "email" | "password"

export type PortalAccess =
  | { method: "email" }
  | { method: "password"; password: string }

export function isPortalPasswordValid(password: string): boolean {
  return password.length >= PORTAL_PASSWORD_MIN_LENGTH
}

/** Parses `access` from an admin request body. Missing access means an email invite. */
export function parsePortalAccess(
  value: unknown
): { ok: true; access: PortalAccess } | { ok: false; error: string } {
  if (value === undefined || value === null) {
    return { ok: true, access: { method: "email" } }
  }
  if (typeof value !== "object") {
    return { ok: false, error: "Invalid access method" }
  }

  const { method, password } = value as { method?: unknown; password?: unknown }
  if (method === "email") {
    return { ok: true, access: { method: "email" } }
  }
  if (method === "password") {
    if (typeof password !== "string" || !isPortalPasswordValid(password)) {
      return {
        ok: false,
        error: `Password must be at least ${PORTAL_PASSWORD_MIN_LENGTH} characters`,
      }
    }
    return { ok: true, access: { method: "password", password } }
  }
  return { ok: false, error: "Invalid access method" }
}

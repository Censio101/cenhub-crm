/**
 * Forget the admin's active client so the next dashboard visit starts at "Select client".
 * Best-effort: non-admins get a 403 and network errors are ignored, so it never blocks login/logout.
 */
export async function clearActiveOrganization(): Promise<void> {
  try {
    await fetch("/api/admin/active-organization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ slug: null }),
      signal: AbortSignal.timeout(3000),
    })
  } catch {
    // ignore — the cookie is a session cookie anyway
  }
}

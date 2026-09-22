export function getCronSecret(): string {
  return process.env.CRON_SECRET || ""
}

export function isCronAuthorized(request: Request): boolean {
  const secret = getCronSecret()
  if (!secret) return false

  const authHeader = request.headers.get("authorization") ?? ""
  if (authHeader === `Bearer ${secret}`) return true

  try {
    const url = new URL(request.url)
    return url.searchParams.get("secret") === secret
  } catch {
    return false
  }
}

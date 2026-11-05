export function getCronSecret(): string {
  return process.env.CRON_SECRET || ""
}

export function isCronAuthorized(request: Request): boolean {
  const secret = getCronSecret()
  if (!secret) return false

  const authHeader = request.headers.get("authorization") ?? ""
  return authHeader === `Bearer ${secret}`
}

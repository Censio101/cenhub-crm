import { createHash } from "node:crypto"

export function clientIp(request: Request): string {
  const vercel = request.headers.get("x-vercel-forwarded-for")
  if (vercel) return vercel.split(",")[0]?.trim() || "unknown"
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown"
  return request.headers.get("x-real-ip") ?? "unknown"
}

export function hashClientIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32)
}

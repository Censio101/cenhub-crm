type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

const WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS = 8

export function checkOnboardingRateLimit(key: string): {
  allowed: boolean
  retryAfterSeconds: number
} {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (existing.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  existing.count += 1
  buckets.set(key, existing)
  return { allowed: true, retryAfterSeconds: 0 }
}

export function hashRateLimitKey(ip: string, email: string): string {
  return `${ip}:${email.trim().toLowerCase()}`
}

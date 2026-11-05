import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

const TOKEN_RE = /^[a-f0-9]{64}$/

export function createInviteRedeemToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex")
  return { token, hash: hashInviteRedeemToken(token) }
}

export function hashInviteRedeemToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/** True only when the emailed token matches the hash stored on the auth user. */
export function inviteRedeemTokenMatches(storedHash: unknown, token: string): boolean {
  if (typeof storedHash !== "string" || !TOKEN_RE.test(storedHash)) return false
  if (!TOKEN_RE.test(token)) return false
  const stored = Buffer.from(storedHash, "hex")
  const given = Buffer.from(hashInviteRedeemToken(token), "hex")
  return timingSafeEqual(stored, given)
}

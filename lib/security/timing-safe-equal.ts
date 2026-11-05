import { timingSafeEqual } from "node:crypto"

/** Compares secrets without short-circuiting on length (returns false if lengths differ). */
export function timingSafeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

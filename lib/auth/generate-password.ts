/** Unambiguous characters (no 0/O, 1/l/I, dashes or slashes). */
const LOWER = "abcdefghjkmnpqrstuvwxyz"
const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ"
const DIGITS = "23456789"
const SYMBOLS = "!@#$%&*?"

const ALL = LOWER + UPPER + DIGITS + SYMBOLS

function randomIndex(max: number): number {
  const limit = Math.floor(4294967296 / max) * max
  const buffer = new Uint32Array(1)
  for (;;) {
    crypto.getRandomValues(buffer)
    if (buffer[0] < limit) return buffer[0] % max
  }
}

function pick(chars: string): string {
  return chars[randomIndex(chars.length)]
}

function shuffle(values: string[]): string[] {
  const copy = [...values]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Strong single-line password (similar to browser “suggest password”): mixed case, digits and symbols, no separators.
 */
export function generatePortalPassword(length = 16): string {
  const size = Math.max(12, length)
  const required = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)]
  const rest = Array.from({ length: size - required.length }, () => pick(ALL))
  return shuffle([...required, ...rest]).join("")
}

export function portalPasswordStrengthScore(password: string): 0 | 1 | 2 | 3 | 4 {
  if (password.length < 8) return 0
  let score = 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4
}

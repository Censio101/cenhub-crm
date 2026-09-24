/** Practical validation for admin notification addresses (not full RFC 5322). */
const LOCAL_PART_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/
const DOMAIN_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

export function isValidNotifyEmail(raw: string): boolean {
  const email = raw.trim().toLowerCase()
  if (!email || email.length > 254) return false

  const at = email.indexOf("@")
  if (at <= 0 || at !== email.lastIndexOf("@")) return false

  const local = email.slice(0, at)
  const domain = email.slice(at + 1)

  if (local.length > 64) return false
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false
  if (!LOCAL_PART_RE.test(local)) return false

  if (!domain.includes(".")) return false
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return false

  const labels = domain.split(".")
  if (labels.length < 2) return false

  const tld = labels[labels.length - 1] ?? ""
  if (tld.length < 2 || !/^[a-z]+$/.test(tld)) return false

  for (const label of labels) {
    if (!label || !DOMAIN_LABEL_RE.test(label)) return false
  }

  return true
}

export function splitNotifyEmailTokens(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function parseNotifyEmailList(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  const tokens = splitNotifyEmailTokens(raw)
  const seen = new Set<string>()
  const emails: string[] = []
  for (const token of tokens) {
    const normalized = token.toLowerCase()
    if (!isValidNotifyEmail(normalized)) continue
    if (seen.has(normalized)) continue
    seen.add(normalized)
    emails.push(normalized)
  }
  return emails
}

export function validateNotifyEmailList(raw: string | null | undefined):
  | { ok: true; emails: string[]; normalized: string | null }
  | { ok: false; invalid: string[] } {
  if (!raw?.trim()) {
    return { ok: true, emails: [], normalized: null }
  }

  const tokens = splitNotifyEmailTokens(raw)
  const invalid: string[] = []
  const seen = new Set<string>()
  const emails: string[] = []

  for (const token of tokens) {
    const normalized = token.toLowerCase()
    if (!isValidNotifyEmail(normalized)) {
      invalid.push(token)
      continue
    }
    if (seen.has(normalized)) continue
    seen.add(normalized)
    emails.push(normalized)
  }

  if (invalid.length > 0) {
    return { ok: false, invalid }
  }

  return {
    ok: true,
    emails,
    normalized: emails.length > 0 ? emails.join(", ") : null,
  }
}

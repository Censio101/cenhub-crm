/** Same-origin path only. Blocks protocol-relative and off-site redirects after login. */
export function safeNextPath(raw: string | null | undefined, fallback = "/"): string {
  const next = raw?.trim() || fallback
  if (!next.startsWith("/") || next.startsWith("//")) return fallback
  if (next.includes("\\") || next.includes("\0")) return fallback
  return next
}

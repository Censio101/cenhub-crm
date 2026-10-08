/** Demo / stock assets that must never show for signed-in users. */
const BLOCKED_PROFILE_IMAGE_PATHS = new Set([
  "/company-avatar.jpg",
  "/company-avatar.png",
  "/nordkystens-tomrer-logo.svg",
])

export function isBlockedProfileImage(src: string): boolean {
  const trimmed = src.trim()
  if (!trimmed) return false
  if (BLOCKED_PROFILE_IMAGE_PATHS.has(trimmed)) return true
  const lower = trimmed.toLowerCase()
  if (lower.includes("company-avatar")) return true
  return false
}

/** Drop demo URLs from localStorage or cached settings; keep data URLs and real uploads. */
export function sanitizeStoredProfileImage(src: string | null | undefined): string {
  if (typeof src !== "string") return ""
  const trimmed = src.trim()
  if (!trimmed || isBlockedProfileImage(trimmed)) return ""
  return trimmed
}

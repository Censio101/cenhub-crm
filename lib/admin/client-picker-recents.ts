const STORAGE_KEY = "censio.admin.recentDashboardClients"
const MAX_RECENTS = 3

export function readRecentClientSlugs(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENTS)
  } catch {
    return []
  }
}

export function recordRecentClientSlug(slug: string) {
  if (typeof window === "undefined" || !slug.trim()) return
  const trimmed = slug.trim()
  const next = [trimmed, ...readRecentClientSlugs().filter((s) => s !== trimmed)].slice(
    0,
    MAX_RECENTS
  )
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

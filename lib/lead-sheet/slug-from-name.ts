const SLUG_RE = /^[a-z0-9-]{2,64}$/

/** Stable internal key from a display name (not shown in admin UI). */
export function slugifyIndustryName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)

  if (base.length >= 2) return base
  if (base.length === 1) return `${base}x`
  return "industry"
}

export function isValidIndustrySlug(slug: string): boolean {
  return SLUG_RE.test(slug)
}

export function uniqueSlug(base: string, exists: (candidate: string) => boolean): string {
  if (!isValidIndustrySlug(base)) {
    base = slugifyIndustryName(base)
  }
  if (!exists(base)) return base
  for (let n = 2; n < 1000; n++) {
    const suffix = `-${n}`
    const trimmed = base.slice(0, Math.max(2, 64 - suffix.length))
    const candidate = `${trimmed}${suffix}`
    if (isValidIndustrySlug(candidate) && !exists(candidate)) return candidate
  }
  return `${base.slice(0, 50)}-${Date.now().toString(36).slice(-8)}`
}

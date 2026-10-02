/** Lower-case ASCII slug; Danish letters are transliterated. */
export function slugifyServiceLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56)
}

/** A slug that satisfies the database check (2-64 chars) and is not already taken. */
export function uniqueServiceSlug(label: string, taken: ReadonlySet<string>): string {
  let base = slugifyServiceLabel(label)
  if (base.length < 2) base = `service-${Date.now().toString(36)}`
  let slug = base
  let suffix = 2
  while (taken.has(slug)) {
    slug = `${base}-${suffix}`
    suffix += 1
  }
  return slug
}

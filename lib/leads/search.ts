/**
 * Case-insensitive "contains" search over a row's text fields. Phone numbers also match when the
 * query is typed with different spacing or punctuation ("20 11 22 33" finds "+45 20112233").
 */
export function matchesSearch(
  fields: ReadonlyArray<string | null | undefined>,
  query: string
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const queryDigits = q.replace(/\D/g, "")

  return fields.some((field) => {
    if (!field) return false
    const text = field.toLowerCase()
    if (text.includes(q)) return true
    return queryDigits.length >= 3 && text.replace(/\D/g, "").includes(queryDigits)
  })
}

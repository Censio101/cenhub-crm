/** Single display name (new rows store the same value in da/en). */
export function businessCategoryLabel(item: { nameDa: string; nameEn: string }): string {
  const da = item.nameDa.trim()
  const en = item.nameEn.trim()
  if (da === en) return da
  return da || en
}

export function normalizeBusinessCategoryName(name: string): string {
  return name.trim()
}

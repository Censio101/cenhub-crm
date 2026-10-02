/**
 * Helpers that decide whether an integration mapping (Meta form or webhook funnel) still
 * matches the client's lead sheet. Mappings are `target -> source` records; custom lead sheet
 * columns use a prefixed target (`custom:<key>` for Meta, `customFields.<key>` for funnels).
 */

export type TargetMapping = Record<string, string>

/** Prefix of a custom column target for Meta form mappings. */
export const META_TARGET_PREFIX = "custom:"

/** Prefix of a custom column target for webhook funnel mappings. */
export const FUNNEL_TARGET_PREFIX = "customFields."

type ColumnRef = { key: string }

function hasSource(source: unknown): boolean {
  return String(source ?? "").trim().length > 0
}

/** True when at least one target has a non-empty source. */
export function isMappingConfigured(mapping: TargetMapping): boolean {
  return Object.values(mapping).some(hasSource)
}

/** Custom column keys a mapping targets that no longer exist on the sheet. */
export function findDanglingCustomTargets(
  mapping: TargetMapping,
  prefix: string,
  validKeys: Iterable<string>
): string[] {
  const valid = new Set(validKeys)
  const dangling: string[] = []
  for (const [target, source] of Object.entries(mapping)) {
    if (!target.startsWith(prefix) || !hasSource(source)) continue
    const key = target.slice(prefix.length)
    if (key && !valid.has(key)) dangling.push(key)
  }
  return dangling
}

/** Custom columns on the sheet that the mapping does not fill yet. */
export function findUnmappedColumns<T extends ColumnRef>(
  mapping: TargetMapping,
  prefix: string,
  columns: readonly T[]
): T[] {
  return columns.filter((column) => !hasSource(mapping[`${prefix}${column.key}`]))
}

function isAfter(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a) return false
  if (!b) return true
  return new Date(a).getTime() > new Date(b).getTime()
}

/**
 * A mapped form needs another look when it targets a removed column, or when the lead sheet
 * changed after the mapping was last saved / kept as is. Forms without a mapping are ignored.
 */
export function formNeedsRemap(input: {
  mapping: TargetMapping
  changedAt: string | null | undefined
  reviewedAt: string | null | undefined
  danglingCount: number
}): boolean {
  if (!isMappingConfigured(input.mapping)) return false
  if (input.danglingCount > 0) return true
  return isAfter(input.changedAt, input.reviewedAt)
}

export type MappingStatus = {
  needsRemap: boolean
  /** Custom column keys the mapping still targets but the sheet no longer has. */
  dangling: string[]
  /** Keys of custom columns that have no mapping yet. */
  unmapped: string[]
}

/** Full status of one mapping against the client's current custom columns. */
export function mappingStatus(input: {
  mapping: TargetMapping
  prefix: string
  customFields: readonly ColumnRef[]
  changedAt: string | null | undefined
  reviewedAt: string | null | undefined
}): MappingStatus {
  const dangling = findDanglingCustomTargets(
    input.mapping,
    input.prefix,
    input.customFields.map((c) => c.key)
  )
  const unmapped = findUnmappedColumns(input.mapping, input.prefix, input.customFields).map(
    (c) => c.key
  )
  return {
    needsRemap: formNeedsRemap({
      mapping: input.mapping,
      changedAt: input.changedAt,
      reviewedAt: input.reviewedAt,
      danglingCount: dangling.length,
    }),
    dangling,
    unmapped,
  }
}

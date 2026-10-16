import type { SupabaseClient } from "@supabase/supabase-js"

import { foldServiceMatchKey } from "@/lib/services/fold-match-key"

export type ServiceInboundAlias = {
  id: string
  alias: string
  serviceId: string
  serviceSlug: string
}

type AliasRow = {
  id: string
  alias: string
  alias_normalized: string
  service_id: string
  services: { slug: string } | { slug: string }[] | null
}

const ALIAS_MAX = 160
const ALIAS_COUNT_MAX = 500

function normalizeAliasInput(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim().replace(/\s+/g, " ")
  if (!trimmed || trimmed.length > ALIAS_MAX) return null
  return trimmed
}

function slugFromRow(row: AliasRow): string {
  const rel = row.services
  if (!rel) return ""
  if (Array.isArray(rel)) return rel[0]?.slug ?? ""
  return rel.slug
}

export async function listOrganizationServiceAliases(
  supabase: SupabaseClient,
  organizationId: string
): Promise<ServiceInboundAlias[]> {
  const { data, error } = await supabase
    .from("organization_service_aliases")
    .select("id, alias, alias_normalized, service_id, services(slug)")
    .eq("organization_id", organizationId)
    .order("alias")
  if (error) throw error
  return ((data ?? []) as AliasRow[]).map((row) => ({
    id: row.id,
    alias: row.alias,
    serviceId: row.service_id,
    serviceSlug: slugFromRow(row),
  }))
}

/** Folded alias text → service slug for inbound matching. */
export async function getOrganizationServiceAliasMap(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("organization_service_aliases")
    .select("alias, alias_normalized, service_id, services(slug)")
    .eq("organization_id", organizationId)
  if (error) throw error
  const map = new Map<string, string>()
  for (const row of (data ?? []) as AliasRow[]) {
    const slug = slugFromRow(row)
    if (!slug) continue
    const norm =
      typeof row.alias_normalized === "string" && row.alias_normalized.trim()
        ? row.alias_normalized.trim()
        : foldServiceMatchKey(row.alias)
    if (norm) map.set(norm, slug)
  }
  return map
}

export type ServiceAliasInput = { alias: string; serviceId: string }

/**
 * Replaces all inbound aliases for the org. Each serviceId must be in `allowedServiceIds`.
 */
export async function saveOrganizationServiceAliases(
  supabase: SupabaseClient,
  organizationId: string,
  inputs: ServiceAliasInput[],
  allowedServiceIds: readonly string[]
): Promise<ServiceInboundAlias[]> {
  const allowed = new Set(allowedServiceIds)
  const seenNorm = new Set<string>()
  const cleaned: { alias: string; alias_normalized: string; service_id: string }[] = []

  for (const input of inputs) {
    const alias = normalizeAliasInput(input.alias)
    if (!alias || !allowed.has(input.serviceId)) continue
    const alias_normalized = foldServiceMatchKey(alias)
    if (!alias_normalized || seenNorm.has(alias_normalized)) continue
    seenNorm.add(alias_normalized)
    cleaned.push({ alias, alias_normalized, service_id: input.serviceId })
    if (cleaned.length > ALIAS_COUNT_MAX) break
  }

  const { error: deleteError } = await supabase
    .from("organization_service_aliases")
    .delete()
    .eq("organization_id", organizationId)
  if (deleteError) throw deleteError

  if (cleaned.length === 0) return []

  const { error: insertError } = await supabase.from("organization_service_aliases").insert(
    cleaned.map((row) => ({
      organization_id: organizationId,
      alias: row.alias,
      alias_normalized: row.alias_normalized,
      service_id: row.service_id,
    }))
  )
  if (insertError) throw insertError

  return listOrganizationServiceAliases(supabase, organizationId)
}

/** Removes aliases pointing at removed services. */
export async function deleteAliasesForServices(
  supabase: SupabaseClient,
  organizationId: string,
  serviceIds: readonly string[]
): Promise<void> {
  if (serviceIds.length === 0) return
  const { error } = await supabase
    .from("organization_service_aliases")
    .delete()
    .eq("organization_id", organizationId)
    .in("service_id", serviceIds)
  if (error) throw error
}

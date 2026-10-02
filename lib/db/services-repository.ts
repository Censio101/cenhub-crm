import type { SupabaseClient } from "@supabase/supabase-js"

import {
  getOrganizationSubcategoryIds,
  setOrganizationCategoryIds,
  setOrganizationSubcategoryIds,
} from "@/lib/db/lead-sheet-repository"
import { resolveServices } from "@/lib/services/resolve"
import { uniqueServiceSlug } from "@/lib/services/slug"
import { SERVICE_NAME_MAX, type ClientService, type Service } from "@/lib/services/types"

type ServiceRow = {
  id: string
  slug: string
  name_da: string
  name_en: string
  sort_index: number
  organization_id: string | null
}

export class ServiceInUseError extends Error {
  constructor(
    public readonly leadCount: number,
    public readonly serviceIds: string[] = []
  ) {
    super("Service is used by leads")
    this.name = "ServiceInUseError"
  }
}

function toService(row: ServiceRow): Service {
  return {
    id: row.id,
    slug: row.slug,
    nameDa: row.name_da,
    nameEn: row.name_en,
    sortIndex: row.sort_index,
  }
}

export function normalizeServiceName(value: unknown): string {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, SERVICE_NAME_MAX)
    : ""
}

/** Shared services (the ones categories are built from). Manual client services are excluded. */
export async function listCatalogServices(supabase: SupabaseClient): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .is("organization_id", null)
    .order("sort_index")
    .order("name_da")
  if (error) throw error
  return ((data ?? []) as ServiceRow[]).map(toService)
}

/** Services added by hand for one client only. */
export async function listManualServices(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at")
  if (error) throw error
  return ((data ?? []) as ServiceRow[]).map(toService)
}

export type CatalogService = Service & { categoryIds: string[]; clientCount: number }

/** Shared services with the categories that contain them and how many clients selected them. */
export async function listCatalogWithCategories(supabase: SupabaseClient): Promise<{
  services: CatalogService[]
}> {
  const [services, { data, error }, { data: selections, error: selectionsError }] =
    await Promise.all([
      listCatalogServices(supabase),
      supabase.from("category_services").select("category_id, service_id").order("sort_index"),
      supabase.from("organization_services").select("service_id"),
    ])
  if (error) throw error
  if (selectionsError) throw selectionsError
  const clientCount = new Map<string, number>()
  for (const row of (selections ?? []) as { service_id: string }[]) {
    clientCount.set(row.service_id, (clientCount.get(row.service_id) ?? 0) + 1)
  }
  const byService = new Map<string, string[]>()
  for (const row of (data ?? []) as { category_id: string; service_id: string }[]) {
    const list = byService.get(row.service_id) ?? []
    list.push(row.category_id)
    byService.set(row.service_id, list)
  }
  return {
    services: services.map((service) => ({
      ...service,
      categoryIds: byService.get(service.id) ?? [],
      clientCount: clientCount.get(service.id) ?? 0,
    })),
  }
}

export async function createService(
  supabase: SupabaseClient,
  input: { nameDa: string; nameEn?: string; organizationId?: string | null }
): Promise<Service> {
  const { data: existing, error: existingError } = await supabase
    .from("services")
    .select("slug, sort_index")
  if (existingError) throw existingError
  const rows = (existing ?? []) as { slug: string; sort_index: number }[]
  const slug = uniqueServiceSlug(input.nameDa, new Set(rows.map((row) => row.slug)))
  const sortIndex = rows.reduce((max, row) => Math.max(max, row.sort_index), -1) + 1

  const { data, error } = await supabase
    .from("services")
    .insert({
      slug,
      name_da: input.nameDa,
      name_en: input.nameEn?.trim() ? input.nameEn : input.nameDa,
      sort_index: sortIndex,
      organization_id: input.organizationId ?? null,
    })
    .select("*")
    .single()
  if (error) throw error
  return toService(data as ServiceRow)
}

export async function updateService(
  supabase: SupabaseClient,
  id: string,
  input: { nameDa: string; nameEn: string }
): Promise<Service | null> {
  const { data, error } = await supabase
    .from("services")
    .update({ name_da: input.nameDa, name_en: input.nameEn || input.nameDa })
    .eq("id", id)
    .select("*")
    .maybeSingle()
  if (error) throw error
  return data ? toService(data as ServiceRow) : null
}

async function countLeadsUsing(supabase: SupabaseClient, slug: string): Promise<number> {
  const { count, error } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .contains("service_ids", [slug])
  if (error) throw error
  return count ?? 0
}

/** Deleting is refused while any lead still carries the service, so no lead loses its label. */
export async function deleteService(supabase: SupabaseClient, id: string): Promise<void> {
  const { data: service, error: findError } = await supabase
    .from("services")
    .select("slug")
    .eq("id", id)
    .maybeSingle()
  if (findError) throw findError
  if (!service) return

  const leadCount = await countLeadsUsing(supabase, (service as { slug: string }).slug)
  if (leadCount > 0) throw new ServiceInUseError(leadCount, [id])

  const { error } = await supabase.from("services").delete().eq("id", id)
  if (error) throw error
}

/** Adds a shared service at the end of a category. Adding it twice is a no-op. */
export async function addServiceToCategory(
  supabase: SupabaseClient,
  categoryId: string,
  serviceId: string
): Promise<void> {
  const { data, error: readError } = await supabase
    .from("category_services")
    .select("sort_index")
    .eq("category_id", categoryId)
    .order("sort_index", { ascending: false })
    .limit(1)
  if (readError) throw readError
  const next = ((data?.[0]?.sort_index as number | undefined) ?? -1) + 1
  const { error } = await supabase
    .from("category_services")
    .upsert(
      { category_id: categoryId, service_id: serviceId, sort_index: next },
      { onConflict: "category_id,service_id", ignoreDuplicates: true }
    )
  if (error) throw error
}

/** Takes a service out of a category. The service itself and client selections stay. */
export async function removeServiceFromCategory(
  supabase: SupabaseClient,
  categoryId: string,
  serviceId: string
): Promise<void> {
  const { error } = await supabase
    .from("category_services")
    .delete()
    .eq("category_id", categoryId)
    .eq("service_id", serviceId)
  if (error) throw error
}

export async function isCatalogService(
  supabase: SupabaseClient,
  serviceId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("services")
    .select("id")
    .eq("id", serviceId)
    .is("organization_id", null)
    .maybeSingle()
  if (error) throw error
  return Boolean(data)
}

async function getOrganizationServiceIds(
  supabase: SupabaseClient,
  organizationId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("organization_services")
    .select("service_id")
    .eq("organization_id", organizationId)
    .order("sort_index")
    .order("created_at")
  if (error) throw error
  return (data ?? []).map((row) => row.service_id as string)
}

async function setOrganizationServices(
  supabase: SupabaseClient,
  organizationId: string,
  serviceIds: string[]
): Promise<void> {
  const unique = [...new Set(serviceIds)]
  const { error: deleteError } = await supabase
    .from("organization_services")
    .delete()
    .eq("organization_id", organizationId)
  if (deleteError) throw deleteError

  if (unique.length > 0) {
    const { error } = await supabase.from("organization_services").insert(
      unique.map((service_id, sort_index) => ({
        organization_id: organizationId,
        service_id,
        sort_index,
      }))
    )
    if (error) throw error
  }
}

export type ClientServiceCategory = {
  id: string
  nameDa: string
  nameEn: string
  /** Assigned to this client on the Industries tab. */
  assigned: boolean
  /** Shared services in this category, in category order. */
  serviceIds: string[]
}

export type OrganizationServicesView = {
  /** What the client's dashboard shows. */
  services: ClientService[]
  /** Every shared service. */
  catalog: Service[]
  /** Services added by hand for this client only. */
  manual: Service[]
  /** All categories (the client's own are flagged), each with its services. */
  categories: ClientServiceCategory[]
  /** Selected ids in the order the dashboard shows them. */
  selectedIds: string[]
  /** true = an admin arranged the order by hand; false = default order. */
  customOrder: boolean
}

/** Everything the client Services tab needs, in one round of parallel reads. */
export async function getOrganizationServicesView(
  supabase: SupabaseClient,
  organizationId: string
): Promise<OrganizationServicesView> {
  const [
    catalog,
    manual,
    selectedIds,
    { data: assigned, error: assignedError },
    { data: categoryRows, error: categoriesError },
    { data: linkRows, error: linksError },
    { data: orgRow, error: orgError },
  ] = await Promise.all([
    listCatalogServices(supabase),
    listManualServices(supabase, organizationId),
    getOrganizationServiceIds(supabase, organizationId),
    supabase
      .from("organization_categories")
      .select("category_id")
      .eq("organization_id", organizationId),
    supabase
      .from("business_categories")
      .select("id, name_da, name_en, sort_index")
      .order("sort_index"),
    supabase.from("category_services").select("category_id, service_id").order("sort_index"),
    supabase
      .from("organizations")
      .select("services_custom_order")
      .eq("id", organizationId)
      .maybeSingle(),
  ])
  if (orgError) throw orgError
  if (assignedError) throw assignedError
  if (categoriesError) throw categoriesError
  if (linksError) throw linksError

  const assignedIds = new Set((assigned ?? []).map((row) => row.category_id as string))
  const links = ((linkRows ?? []) as { category_id: string; service_id: string }[]).map((row) => ({
    categoryId: row.category_id,
    serviceId: row.service_id,
  }))
  const categories: ClientServiceCategory[] = (
    (categoryRows ?? []) as { id: string; name_da: string; name_en: string }[]
  ).map((row) => ({
    id: row.id,
    nameDa: row.name_da,
    nameEn: row.name_en,
    assigned: assignedIds.has(row.id),
    serviceIds: links.filter((link) => link.categoryId === row.id).map((link) => link.serviceId),
  }))

  const customOrder = Boolean(orgRow?.services_custom_order)
  const library = [...catalog, ...manual]
  const services = resolveServices({
    library,
    assignedCategories: categories.filter((category) => category.assigned),
    links,
    selectedIds,
    manualIds: manual.map((service) => service.id),
    customOrder,
  })
  const idBySlug = new Map(library.map((service) => [service.slug, service.id]))

  return {
    services,
    catalog,
    manual,
    categories,
    selectedIds: services.flatMap((service) => idBySlug.get(service.id) ?? []),
    customOrder,
  }
}

async function validCategoryIds(supabase: SupabaseClient, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase.from("business_categories").select("id").in("id", ids)
  if (error) throw error
  return (data ?? []).map((row) => row.id as string)
}

async function saveClientCategories(
  supabase: SupabaseClient,
  organizationId: string,
  categoryIds: string[]
): Promise<void> {
  await setOrganizationCategoryIds(supabase, organizationId, categoryIds)
  const current = await getOrganizationSubcategoryIds(supabase, organizationId)
  if (current.length === 0) return
  const { data, error } = await supabase
    .from("business_subcategories")
    .select("id, category_id")
    .in("id", current)
  if (error) throw error
  const keep = new Set(categoryIds)
  const kept = (data ?? [])
    .filter((row) => keep.has(row.category_id as string))
    .map((row) => row.id as string)
  if (kept.length !== current.length)
    await setOrganizationSubcategoryIds(supabase, organizationId, kept)
}

/**
 * Saves the client Services tab in one go: deletes removed manual services, creates new ones
 * (selected straight away) and replaces the selection. Ids that are neither shared services nor
 * this client's own are ignored. Nothing is written when a removed manual service is still used
 * by leads.
 */
export async function saveOrganizationServices(
  supabase: SupabaseClient,
  organizationId: string,
  input: {
    selectedIds: string[]
    newManual: string[]
    removedManualIds: string[]
    /** Final order of the selection: service ids, or `new:<name>` for a manual service being created. */
    order?: string[]
    /** Whether the order was arranged by hand (kept) or should follow the default order. */
    customOrder?: boolean
    /** When given, replaces the client's categories (subcategories of dropped ones are removed). */
    categoryIds?: string[]
  }
): Promise<void> {
  const [catalog, manual] = await Promise.all([
    listCatalogServices(supabase),
    listManualServices(supabase, organizationId),
  ])
  const categoryIds = input.categoryIds ? await validCategoryIds(supabase, input.categoryIds) : null
  const removed = manual.filter((service) => input.removedManualIds.includes(service.id))

  const usage = await Promise.all(removed.map((service) => countLeadsUsing(supabase, service.slug)))
  const blocked = removed.filter((_, index) => usage[index] > 0)
  if (blocked.length > 0) {
    throw new ServiceInUseError(
      usage.reduce((sum, count) => sum + count, 0),
      blocked.map((service) => service.id)
    )
  }

  if (removed.length > 0) {
    const { error } = await supabase
      .from("services")
      .delete()
      .eq("organization_id", organizationId)
      .in(
        "id",
        removed.map((service) => service.id)
      )
    if (error) throw error
  }

  if (categoryIds) await saveClientCategories(supabase, organizationId, categoryIds)

  const created: Service[] = []
  for (const name of input.newManual) {
    created.push(await createService(supabase, { nameDa: name, organizationId }))
  }

  const removedIds = new Set(removed.map((service) => service.id))
  const allowed = new Set([
    ...catalog.map((service) => service.id),
    ...manual.filter((service) => !removedIds.has(service.id)).map((service) => service.id),
  ])
  const createdByName = new Map(input.newManual.map((name, index) => [name, created[index].id]))
  const ordered = input.order
    ? input.order.flatMap((token) => {
        if (token.startsWith("new:")) return createdByName.get(token.slice(4)) ?? []
        return allowed.has(token) ? [token] : []
      })
    : input.selectedIds.filter((id) => allowed.has(id))
  if (input.customOrder !== undefined) {
    const { error } = await supabase
      .from("organizations")
      .update({ services_custom_order: input.customOrder })
      .eq("id", organizationId)
    if (error) throw error
  }
  const placed = new Set(ordered)
  await setOrganizationServices(supabase, organizationId, [
    ...ordered,
    ...created.map((service) => service.id).filter((id) => !placed.has(id)),
  ])
}

/** What the client dashboard and the inbound paths (webhooks, Meta, import) use. */
export async function resolveOrganizationServices(
  supabase: SupabaseClient,
  organizationId: string
): Promise<ClientService[]> {
  const view = await getOrganizationServicesView(supabase, organizationId)
  return view.services
}

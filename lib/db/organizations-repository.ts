import type { SupabaseClient } from "@supabase/supabase-js"

import type { OrganizationRow } from "@/lib/db/types"

export type OrganizationSummary = OrganizationRow & {
  leadCount: number
  userCount: number
  metaEnabled: boolean
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

export function normalizeOrgSlug(value: string): string {
  const slug = slugify(value)
  if (!/^[a-z0-9-]{2,48}$/.test(slug)) {
    throw new Error("Invalid organization slug")
  }
  return slug
}

export async function listOrganizationsWithStats(
  supabase: SupabaseClient
): Promise<OrganizationSummary[]> {
  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("*")
    .order("name", { ascending: true })

  if (error) throw error

  const rows = (organizations ?? []) as OrganizationRow[]
  const summaries: OrganizationSummary[] = []

  for (const organization of rows) {
    const [{ count: leadCount }, { count: userCount }, metaConfig] =
      await Promise.all([
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organization.id),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organization.id),
        supabase
          .from("client_meta_config")
          .select("enabled")
          .eq("organization_id", organization.id)
          .maybeSingle(),
      ])

    summaries.push({
      ...organization,
      leadCount: leadCount ?? 0,
      userCount: userCount ?? 0,
      metaEnabled: Boolean(metaConfig.data?.enabled),
    })
  }

  return summaries
}

export async function getOrganizationWithStatsBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<OrganizationSummary | null> {
  const organization = await getOrganizationBySlug(supabase, slug)
  if (!organization) return null

  const [{ count: leadCount }, { count: userCount }, metaConfig] =
    await Promise.all([
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id),
      supabase
        .from("client_meta_config")
        .select("enabled")
        .eq("organization_id", organization.id)
        .maybeSingle(),
    ])

  return {
    ...organization,
    leadCount: leadCount ?? 0,
    userCount: userCount ?? 0,
    metaEnabled: Boolean(metaConfig.data?.enabled),
  }
}

export async function getOrganizationBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<OrganizationRow | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .maybeSingle()

  if (error) throw error
  return (data as OrganizationRow | null) ?? null
}

export async function createOrganization(
  supabase: SupabaseClient,
  input: { name: string; slug?: string; demoMode?: boolean }
): Promise<OrganizationRow> {
  const slug = input.slug ? normalizeOrgSlug(input.slug) : normalizeOrgSlug(input.name)

  const { data, error } = await supabase
    .from("organizations")
    .insert({
      name: input.name.trim(),
      slug,
      demo_mode: input.demoMode ?? true,
    })
    .select("*")
    .single()

  if (error) throw error
  return data as OrganizationRow
}

export type OrganizationDetailsPatch = Partial<
  Pick<
    OrganizationRow,
    | "name"
    | "demo_mode"
    | "cvr"
    | "address"
    | "zip_code"
    | "city"
    | "country"
    | "primary_contact_name"
    | "primary_contact_email"
    | "primary_contact_phone"
    | "website_url"
  >
>

export async function getOrganizationById(
  supabase: SupabaseClient,
  id: string
): Promise<OrganizationRow | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  return (data as OrganizationRow | null) ?? null
}

export async function isOrganizationSlugTaken(
  supabase: SupabaseClient,
  slug: string
): Promise<boolean> {
  const org = await getOrganizationBySlug(supabase, slug)
  return org !== null
}

export async function resolveAvailableOrganizationSlug(
  supabase: SupabaseClient,
  baseName: string,
  preferredSlug?: string
): Promise<string> {
  const base = preferredSlug
    ? normalizeOrgSlug(preferredSlug)
    : normalizeOrgSlug(baseName)

  if (!(await isOrganizationSlugTaken(supabase, base))) return base

  for (let suffix = 2; suffix <= 99; suffix += 1) {
    const candidate = `${base.slice(0, 44)}-${suffix}`.replace(/-+$/g, "")
    const normalized = normalizeOrgSlug(candidate)
    if (!(await isOrganizationSlugTaken(supabase, normalized))) return normalized
  }

  throw new Error("Could not generate a unique organization slug")
}

export async function updateOrganizationBySlug(
  supabase: SupabaseClient,
  slug: string,
  patch: OrganizationDetailsPatch
): Promise<OrganizationRow> {
  const { data, error } = await supabase
    .from("organizations")
    .update(patch)
    .eq("slug", slug)
    .select("*")
    .single()

  if (error) throw error
  return data as OrganizationRow
}

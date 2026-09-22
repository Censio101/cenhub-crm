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

export async function updateOrganizationBySlug(
  supabase: SupabaseClient,
  slug: string,
  patch: Partial<Pick<OrganizationRow, "name" | "demo_mode">>
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

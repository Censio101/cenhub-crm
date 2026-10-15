import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import {
  listOrganizationServiceAliases,
  saveOrganizationServiceAliases,
  type ServiceAliasInput,
} from "@/lib/db/service-aliases-repository"
import { getOrganizationServicesView } from "@/lib/db/services-repository"
import { isUuid } from "@/lib/services/types"
import { createAdminClient } from "@/lib/supabase/admin"

type Ctx = { params: Promise<{ slug: string }> }

function parseAliases(body: unknown): ServiceAliasInput[] | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null
  const raw = (body as { aliases?: unknown }).aliases
  if (!Array.isArray(raw)) return null
  const out: ServiceAliasInput[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") return null
    const alias = (item as { alias?: unknown }).alias
    const serviceId = (item as { serviceId?: unknown }).serviceId
    if (typeof alias !== "string" || typeof serviceId !== "string" || !isUuid(serviceId)) return null
    out.push({ alias, serviceId })
  }
  return out
}

export async function GET(_request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const supabase = createAdminClient()
    const org = await getOrganizationBySlug(supabase, slug)
    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const [aliases, view] = await Promise.all([
      listOrganizationServiceAliases(supabase, org.id),
      getOrganizationServicesView(supabase, org.id),
    ])
    return NextResponse.json({ aliases, services: view.services })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function PUT(request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const body = await request.json().catch(() => null)
    const inputs = parseAliases(body)
    if (!inputs) {
      return NextResponse.json({ error: "Invalid aliases payload" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const org = await getOrganizationBySlug(supabase, slug)
    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const view = await getOrganizationServicesView(supabase, org.id)
    const slugByUuid = new Map(
      [...view.catalog, ...view.manual].map((service) => [service.id, service.slug])
    )
    const enabledSlugs = new Set(view.services.map((s) => s.id))
    const allowedServiceIds = view.selectedIds.filter((id) => {
      const slug = slugByUuid.get(id)
      return slug ? enabledSlugs.has(slug) : false
    })

    const aliases = await saveOrganizationServiceAliases(
      supabase,
      org.id,
      inputs,
      allowedServiceIds
    )
    return NextResponse.json({ aliases })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import {
  getOrganizationHiddenColumnKeys,
  resolveLeadSheetForOrganization,
  setOrganizationHiddenColumnKeys,
} from "@/lib/db/lead-sheet-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { sanitizeClientHiddenKeys } from "@/lib/lead-sheet/client-visibility"
import { createAdminClient } from "@/lib/supabase/admin"

type Ctx = { params: Promise<{ slug: string }> }

/** The client's sheet plus the columns hidden from its dashboard. */
export async function GET(_request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const supabase = createAdminClient()
    const org = await getOrganizationBySlug(supabase, slug)
    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const [resolved, hiddenKeys] = await Promise.all([
      resolveLeadSheetForOrganization(supabase, org.id),
      getOrganizationHiddenColumnKeys(supabase, org.id),
    ])
    return NextResponse.json({ resolved, hiddenKeys })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const body = (await request.json()) as { hiddenKeys?: unknown }
    if (!Array.isArray(body.hiddenKeys)) {
      return NextResponse.json({ error: "hiddenKeys must be a list" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const org = await getOrganizationBySlug(supabase, slug)
    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const resolved = await resolveLeadSheetForOrganization(supabase, org.id)
    if (!resolved) return NextResponse.json({ error: "No lead sheet" }, { status: 400 })

    const hiddenKeys = sanitizeClientHiddenKeys(body.hiddenKeys, resolved)
    await setOrganizationHiddenColumnKeys(supabase, org.id, hiddenKeys)
    return NextResponse.json({ hiddenKeys })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

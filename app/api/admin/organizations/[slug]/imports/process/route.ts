import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { getLeadImport } from "@/lib/db/lead-imports-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { processImportChunk } from "@/lib/import/process-chunk"
import { parseImportRequest } from "@/lib/import/validate-request"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

/**
 * One batch of at most 500 rows. `dryRun: true` is the test run (nothing is written);
 * `dryRun: false` inserts the accepted leads into the running import.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const parsed = parseImportRequest(await request.json().catch(() => null))
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { value } = parsed

    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    if (!value.dryRun) {
      const record = value.importId
        ? await getLeadImport(admin, organization.id, value.importId)
        : null
      if (!record) return NextResponse.json({ error: "Import not found" }, { status: 404 })
      if (record.status !== "running") {
        return NextResponse.json({ error: "This import is already finished" }, { status: 409 })
      }
    }

    const response = await processImportChunk({
      supabase: admin,
      organizationId: organization.id,
      importId: value.importId,
      rows: value.rows,
      mapping: value.mapping,
      options: value.options,
      dryRun: value.dryRun,
      previewCount: value.dryRun ? value.previewCount : 0,
    })
    return NextResponse.json(response)
  } catch (error) {
    return adminErrorResponse(error)
  }
}

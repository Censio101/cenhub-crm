import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { createLeadImport, listLeadImports } from "@/lib/db/lead-imports-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { MAX_IMPORT_ROWS } from "@/lib/import/types"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

/** The client's import history, newest first. */
export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }
    return NextResponse.json({ imports: await listLeadImports(admin, organization.id) })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

/** Starts a batch record for a real import (a test run does not need one). */
export async function POST(request: Request, context: RouteContext) {
  try {
    const ctx = await requireCensioAdmin()
    const { slug } = await context.params
    const body = (await request.json().catch(() => ({}))) as {
      fileName?: unknown
      totalRows?: unknown
    }
    const totalRows = Math.trunc(Number(body.totalRows))
    if (!Number.isFinite(totalRows) || totalRows < 1 || totalRows > MAX_IMPORT_ROWS) {
      return NextResponse.json(
        { error: `A file can have 1 to ${MAX_IMPORT_ROWS} rows` },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const record = await createLeadImport(admin, {
      organizationId: organization.id,
      fileName: typeof body.fileName === "string" ? body.fileName : "",
      createdBy: ctx.userId ?? null,
      totalRows,
    })
    return NextResponse.json({ import: record }, { status: 201 })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { finishLeadImport, getLeadImport, undoLeadImport } from "@/lib/db/lead-imports-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string; importId: string }> }

async function load(context: RouteContext) {
  const { slug, importId } = await context.params
  const admin = createAdminClient()
  const organization = await getOrganizationBySlug(admin, slug)
  if (!organization) {
    return { error: NextResponse.json({ error: "Organization not found" }, { status: 404 }) }
  }
  const record = await getLeadImport(admin, organization.id, importId)
  if (!record) {
    return { error: NextResponse.json({ error: "Import not found" }, { status: 404 }) }
  }
  return { admin, organization, record }
}

/** Closes a running import with its final counts. */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const body = (await request.json().catch(() => ({}))) as {
      skippedCount?: unknown
      warningCount?: unknown
    }
    const loaded = await load(context)
    if (loaded.error) return loaded.error
    const { admin, organization, record } = loaded
    if (record.status !== "running") {
      return NextResponse.json({ error: "This import is already finished" }, { status: 409 })
    }
    const updated = await finishLeadImport(admin, organization.id, record.id, {
      skippedCount: Number(body.skippedCount) || 0,
      warningCount: Number(body.warningCount) || 0,
    })
    return NextResponse.json({ import: updated })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

/** Undo: deletes exactly the leads this import created. */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const loaded = await load(context)
    if (loaded.error) return loaded.error
    const { admin, organization, record } = loaded
    if (record.status === "undone") {
      return NextResponse.json({ error: "This import was already undone" }, { status: 409 })
    }
    const removed = await undoLeadImport(admin, organization.id, record.id)
    return NextResponse.json({ ok: true, removed })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
